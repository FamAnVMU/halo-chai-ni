import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';
import { geminiTextService } from './geminiTextService.js';
import { geminiLessonService } from './geminiLessonService.js';

export interface PathStage {
  id: string;
  pathId: string;
  stageNumber: number;
  title: string;
  descriptionVi: string;
  stageType: 'foundation_reinforce' | 'expansion' | 'application' | 'mastery_review';
  status: 'locked' | 'unlocked' | 'in_progress' | 'completed';
  isLockedByUser: boolean;
  progressPercent: number;
  orderIndex: number;
  items: PathItem[];
}

export interface PathItem {
  id: string;
  stageId: string;
  pathId: string;
  title: string;
  itemType: 'lesson' | 'review_srs' | 'error_remediation' | 'practice_drill' | 'checkpoint_exam';
  hskLevel: number;
  estimatedMinutes: number;
  recommendationReason: string;
  prerequisites: string[];
  targetKnowledge: string[];
  lessonId?: string;
  status: 'locked' | 'available' | 'in_progress' | 'needs_review' | 'completed';
  score?: number;
  orderIndex: number;
  completedAt?: number;
}

export interface PathMilestone {
  id: string;
  pathId: string;
  title: string;
  descriptionVi: string;
  targetType: 'topic_complete' | 'vocab_mastery' | 'grammar_mastery' | 'stage_complete' | 'score_target' | 'exam_pass';
  requiredCriteria: string[];
  progressPercent: number;
  status: 'pending' | 'achieved';
  achievedAt?: number;
  orderIndex: number;
}

export interface ScheduleItem {
  id: string;
  pathId: string;
  itemId?: string;
  dayOfWeek: number; // 1 = Thứ 2, ..., 7 = Chủ nhật
  dayName: string;
  scheduledDate?: string;
  activityTitle: string;
  activityType: 'vocab_review' | 'grammar_lesson' | 'listening_drill' | 'conversation_tutor' | 'reading_writing' | 'comprehensive_quiz';
  estimatedMinutes: number;
  reason: string;
  isCompleted: boolean;
  completedAt?: number;
}

export interface AdaptiveLearningPathDetail {
  id: string;
  userId: string;
  title: string;
  currentHsk: number;
  targetHsk: number;
  primaryGoal: 'hsk_exam' | 'daily_communication' | 'business_work' | 'travel_study';
  dailyMinutes: number;
  daysPerWeek: number;
  targetCompletionDate?: string;
  status: 'active' | 'paused' | 'completed';
  currentStageId?: string;
  progressPercent: number;
  version: number;
  stages: PathStage[];
  milestones: PathMilestone[];
  schedule: ScheduleItem[];
  nextRecommendedItem?: PathItem;
  createdAt: number;
  updatedAt: number;
}

export class GeminiPathService {
  /**
   * Lấy lộ trình hiện tại của người dùng hoặc tự động khởi tạo lộ trình thích ứng nếu chưa có
   */
  public async getOrCreateCurrentPath(): Promise<AdaptiveLearningPathDetail> {
    const existing = db.prepare(`
      SELECT * FROM adaptive_learning_paths 
      WHERE user_id = 'default' AND status != 'completed'
      ORDER BY updated_at DESC LIMIT 1
    `).get() as any;

    if (existing) {
      return this.getPathDetail(existing.id);
    }

    // Nếu chưa có lộ trình, tự động sinh lộ trình thích ứng mới dựa trên Profile và Placement Test
    return this.generateAdaptivePath({
      reason: 'Khởi tạo lộ trình học tập thích ứng cá nhân hóa ban đầu'
    });
  }

  /**
   * Sinh hoặc Tái cấu trúc lộ trình thích ứng dựa trên toàn bộ dữ liệu học tập
   */
  public async generateAdaptivePath(params?: {
    primaryGoal?: 'hsk_exam' | 'daily_communication' | 'business_work' | 'travel_study';
    targetHsk?: number;
    dailyMinutes?: number;
    daysPerWeek?: number;
    reason?: string;
    forceRegenerate?: boolean;
  }): Promise<AdaptiveLearningPathDetail> {
    const now = Date.now();
    const pathId = `path_${now}_${Math.random().toString(36).substring(2, 6)}`;

    // 1. Thu thập dữ liệu từ các phân hệ hiện có
    const profile = db.prepare('SELECT * FROM learner_profile WHERE id = ?').get('default') as any || {
      current_hsk: 1,
      target_hsk: 3,
      strengths_json: '[]',
      weaknesses_json: '[]'
    };

    // Kết quả khảo sát đầu vào gần nhất (nếu có)
    const latestPlacement = db.prepare(`
      SELECT * FROM placement_results ORDER BY created_at DESC LIMIT 1
    `).get() as any;

    let placementData: any = null;
    if (latestPlacement) {
      placementData = {
        overallScore: latestPlacement.overall_score,
        estimatedHsk: latestPlacement.estimated_hsk,
        weaknesses: JSON.parse(latestPlacement.weaknesses_json || '[]'),
        strengths: JSON.parse(latestPlacement.strengths_json || '[]'),
        knowledgeBreakdown: JSON.parse(latestPlacement.knowledge_breakdown_json || '{}')
      };
    }

    // Các lỗi sai đang theo dõi trong `learning_errors`
    const pendingErrors = db.prepare(`
      SELECT title, error_type, explanation_vi, occurrence_count 
      FROM learning_errors WHERE status = 'pending' ORDER BY occurrence_count DESC LIMIT 5
    `).all() as any[];

    // Thống kê bộ nhớ từ vựng và ngữ pháp
    const vocabStats = db.prepare(`
      SELECT 
        COUNT(CASE WHEN mastery_level = 'mastered' THEN 1 END) as mastered_count,
        COUNT(CASE WHEN mastery_level IN ('needs_review', 'learning') THEN 1 END) as struggling_count
      FROM vocabulary_memory
    `).get() as any;

    const strugglingVocabs = db.prepare(`
      SELECT simplified, pinyin, meaning_vi FROM vocabulary_memory 
      WHERE mastery_level IN ('needs_review', 'learning') LIMIT 5
    `).all() as any[];

    const strugglingGrammars = db.prepare(`
      SELECT pattern_name, formula, meaning_vi FROM grammar_memory 
      WHERE mastery_level IN ('needs_review', 'learning') LIMIT 4
    `).all() as any[];

    // Các tham số cấu hình mục tiêu
    const currentHsk = placementData?.estimatedHsk ? Math.max(1, Math.round(placementData.estimatedHsk)) : (profile.current_hsk || 1);
    const targetHsk = params?.targetHsk || (profile.target_hsk && profile.target_hsk > currentHsk ? profile.target_hsk : Math.min(6, currentHsk + 2));
    const primaryGoal = params?.primaryGoal || 'hsk_exam';
    const dailyMinutes = params?.dailyMinutes || 30;
    const daysPerWeek = params?.daysPerWeek || 5;

    const goalTitles: Record<string, string> = {
      hsk_exam: `Lộ Trình Thích Ứng HSK ${currentHsk} ➔ HSK ${targetHsk} (Thi Đạt Chứng Chỉ)`,
      daily_communication: `Lộ Trình Giao Tiếp Phản Xạ Đời Sống HSK ${currentHsk} ➔ HSK ${targetHsk}`,
      business_work: `Lộ Trình Tiếng Trung Thương Mại & Công Việc HSK ${currentHsk} ➔ HSK ${targetHsk}`,
      travel_study: `Lộ Trình Du Lịch & Du Học Trung Quốc HSK ${currentHsk} ➔ HSK ${targetHsk}`
    };

    const pathTitle = goalTitles[primaryGoal] || `Lộ Trình Tiếng Trung Thích Ứng HSK ${currentHsk} ➔ HSK ${targetHsk}`;

    // 2. Tạo Cấu Trúc 4 Giai Đoạn Thích Ứng (Foundation ➔ Expansion ➔ Application ➔ Review/Mastery)
    interface RawStage {
      stageNumber: number;
      title: string;
      descriptionVi: string;
      stageType: 'foundation_reinforce' | 'expansion' | 'application' | 'mastery_review';
      items: Array<{
        title: string;
        itemType: 'lesson' | 'review_srs' | 'error_remediation' | 'practice_drill' | 'checkpoint_exam';
        hskLevel: number;
        estimatedMinutes: number;
        recommendationReason: string;
        prerequisites: string[];
        targetKnowledge: string[];
      }>;
    }

    const rawStages: RawStage[] = [
      // Giai đoạn 1: Củng cố nền tảng & Khắc phục lỗ hổng đã xác định
      {
        stageNumber: 1,
        title: `Giai đoạn 1: Củng Cố Nền Tảng & Bù Đắp Lỗ Hổng HSK ${currentHsk}`,
        descriptionVi: `Khắc phục ngay các lỗi sai ngữ pháp thường gặp và bổ sung từ vựng còn thiếu trước khi mở rộng kiến thức mới.`,
        stageType: 'foundation_reinforce',
        items: [
          {
            title: pendingErrors[0]?.title ? `Khắc phục: ${pendingErrors[0].title}` : `Phân biệt đại từ nghi vấn 怎么 và 为什么`,
            itemType: 'error_remediation',
            hskLevel: currentHsk,
            estimatedMinutes: 20,
            recommendationReason: pendingErrors[0]?.explanation_vi 
              ? `AI ghi nhận bạn mắc lỗi "${pendingErrors[0].title}". Cần sửa triệt để trước khi chuyển bài tiếp theo.`
              : `Kiến thức nền tảng hay bị nhầm lẫn giữa cách hỏi phương thức (怎么) và hỏi nguyên nhân (为什么).`,
            prerequisites: ['Đại từ nghi vấn HSK 1'],
            targetKnowledge: ['怎么', '为什么', 'Trật tự câu hỏi']
          },
          {
            title: `Ôn tập & Khắc phục vị trí từ chỉ thời gian và nơi chốn`,
            itemType: 'lesson',
            hskLevel: currentHsk,
            estimatedMinutes: 25,
            recommendationReason: `Quy tắc cốt lõi: Thời gian và nơi chốn đứng trước động từ trong tiếng Trung, tránh thói quen đặt cuối câu theo tiếng Việt.`,
            prerequisites: ['Cấu trúc câu đơn S + V + O'],
            targetKnowledge: ['Từ chỉ thời gian', 'Cụm giới từ 在 + Nơi chốn']
          },
          {
            title: `Luyện tập phản xạ SRS từ vựng nền tảng HSK ${currentHsk}`,
            itemType: 'review_srs',
            hskLevel: currentHsk,
            estimatedMinutes: 15,
            recommendationReason: `Kích hoạt lặp lại ngắt quãng SRS cho ${strugglingVocabs.length || 5} từ vựng bạn còn chưa nhớ vững.`,
            prerequisites: ['Từ vựng HSK cơ bản'],
            targetKnowledge: strugglingVocabs.map(v => v.simplified).concat(['Chào hỏi', 'Số đếm', 'Gia đình'])
          }
        ]
      },

      // Giai đoạn 2: Mở rộng kiến thức cốt lõi theo mục tiêu
      {
        stageNumber: 2,
        title: `Giai đoạn 2: Mở Rộng Ngữ Pháp & Từ Vựng Trọng Tâm HSK ${Math.min(targetHsk, currentHsk + 1)}`,
        descriptionVi: `Tiếp thu cấu trúc câu phức, trợ từ ngữ thái đặc trưng và mở rộng vốn từ vựng đời sống.`,
        stageType: 'expansion',
        items: [
          {
            title: `Chuyên đề Trợ từ kết cấu 的, 得, 地 và Trợ từ ngữ khí 了, 过`,
            itemType: 'lesson',
            hskLevel: Math.min(targetHsk, currentHsk + 1),
            estimatedMinutes: 30,
            recommendationReason: `Trợ từ là thước đo phân biệt trình độ sơ cấp và trung cấp; giúp diễn đạt trôi chảy và tự nhiên hơn.`,
            prerequisites: ['Động từ và tính từ cơ bản'],
            targetKnowledge: ['的 / 得 / 地', 'Trợ từ động thái 了 / 过', 'Bổ ngữ trạng thái']
          },
          {
            title: primaryGoal === 'daily_communication' 
              ? `Hội thoại tình huống: Mua sắm, gọi món nhà hàng & mặc cả giá`
              : `Cấu trúc câu chữ 把 (Bǎ) và câu so sánh 比 (Bǐ)`,
            itemType: 'lesson',
            hskLevel: Math.min(targetHsk, currentHsk + 1),
            estimatedMinutes: 25,
            recommendationReason: `Trọng tâm đề thi HSK và giao tiếp thực tiễn: xử lý đối tượng cụ thể và so sánh tính chất sự vật.`,
            prerequisites: ['Trật tự từ HSK 1 - 2'],
            targetKnowledge: ['Câu chữ 把', 'Câu chữ 比', 'Lượng từ thông dụng']
          },
          {
            title: `Luyện nghe hiểu hội thoại đời sống & bắt từ khóa`,
            itemType: 'practice_drill',
            hskLevel: Math.min(targetHsk, currentHsk + 1),
            estimatedMinutes: 20,
            recommendationReason: `Rèn luyện phản xạ đôi tai với ngữ điệu tự nhiên của người bản xứ và tốc độ nói thực tế.`,
            prerequisites: ['Phát âm thanh mẫu và vận mẫu chuẩn'],
            targetKnowledge: ['Nghe hội thoại 2 lượt', 'Bắt số liệu, thời gian, địa điểm']
          }
        ]
      },

      // Giai đoạn 3: Vận dụng thực chiến & Đàm thoại AI
      {
        stageNumber: 3,
        title: `Giai đoạn 3: Vận Dụng Thực Chiến & Đàm Thoại AI Tutor`,
        descriptionVi: `Thực hành đặt câu dài, dịch văn bản Việt - Trung và luyện đàm thoại tương tác với AI Tutor.`,
        stageType: 'application',
        items: [
          {
            title: `Thực hành viết: Dịch đoạn văn mô tả sinh hoạt thường nhật`,
            itemType: 'lesson',
            hskLevel: Math.min(targetHsk, currentHsk + 1),
            estimatedMinutes: 30,
            recommendationReason: `Chuyển hóa từ vựng thụ động thành kỹ năng viết chủ động, được AI chấm điểm ngữ pháp trực tiếp.`,
            prerequisites: ['Chữ Hán cơ bản', 'Ngữ pháp Giai đoạn 2'],
            targetKnowledge: ['Viết câu ghép', 'Liên từ 虽然...但是...', 'Kể chuyện theo trình tự']
          },
          {
            title: `Đàm thoại phản xạ giọng nói 1-1 với AI Tutor (Chủ đề tự chọn)`,
            itemType: 'lesson',
            hskLevel: Math.min(targetHsk, currentHsk + 1),
            estimatedMinutes: 20,
            recommendationReason: `Áp dụng toàn bộ từ mới vào đối thoại trực tiếp qua Voice Chat với AI Tutor để kiểm tra độ trôi chảy.`,
            prerequisites: ['Giao tiếp cơ bản'],
            targetKnowledge: ['Voice Chat Live API', 'Phản xạ trả lời dưới 3 giây']
          }
        ]
      },

      // Giai đoạn 4: Ôn tập tổng hợp & Kiểm tra cột mốc sẵn sàng
      {
        stageNumber: 4,
        title: `Giai đoạn 4: Ôn Tập Tổng Hợp & Đánh Giá Mức Độ Sẵn Sàng`,
        descriptionVi: `Làm bài kiểm tra tổng hợp toàn diện để chứng nhận hoàn thành mốc mục tiêu.`,
        stageType: 'mastery_review',
        items: [
          {
            title: `Bài kiểm tra tổng hợp Checkpoint: Đánh giá trình độ HSK ${targetHsk}`,
            itemType: 'checkpoint_exam',
            hskLevel: targetHsk,
            estimatedMinutes: 35,
            recommendationReason: `Bài thi khảo sát toàn diện 4 phần (Từ vựng, Ngữ pháp, Đọc hiểu, Nghe) đánh giá mức độ sẵn sàng cho HSK ${targetHsk}.`,
            prerequisites: ['Hoàn thành các giai đoạn 1, 2, 3'],
            targetKnowledge: [`Đạt >= 80 điểm HSK ${targetHsk}`, 'Tổng hợp toàn diện']
          }
        ]
      }
    ];

    // 3. Khởi tạo Milestones (Cột mốc tiến bộ)
    const rawMilestones = [
      {
        title: `Cột mốc 1: Khắc phục 100% lỗi sai tồn đọng HSK ${currentHsk}`,
        descriptionVi: `Giải quyết dứt điểm các lỗi sai trong sổ tay learning_errors và củng cố ngữ pháp nền tảng.`,
        targetType: 'grammar_mastery',
        requiredCriteria: ['Hoàn thành bài tập sửa lỗi sai', 'Không mắc lại lỗi vị trí thời gian']
      },
      {
        title: `Cột mốc 2: Nắm vững từ vựng và ngữ pháp trọng tâm HSK ${Math.min(targetHsk, currentHsk + 1)}`,
        descriptionVi: `Ghi nhớ và đạt mức thành thạo 'mastered' cho các mẫu câu chữ 把, chữ 比 và trợ từ 的/得/地.`,
        targetType: 'vocab_mastery',
        requiredCriteria: ['SRS ôn tập đều đặn', 'Đạt điểm >= 80 bài tập cấu trúc câu']
      },
      {
        title: `Cột mốc 3: Hoàn thành đàm thoại lưu loát với AI Tutor`,
        descriptionVi: `Thực hiện ít nhất 3 phiên đàm thoại tự tin theo chủ đề mà không cần dịch từ tiếng Việt.`,
        targetType: 'topic_complete',
        requiredCriteria: ['3 phiên Voice Chat thành công', 'Phản xạ câu hỏi trôi chảy']
      },
      {
        title: `Cột mốc 4: Đạt chuẩn Checkpoint HSK ${targetHsk}`,
        descriptionVi: `Vượt qua bài thi tổng hợp với số điểm trên 80% để sẵn sàng cho cấp độ tiếp theo.`,
        targetType: 'exam_pass',
        requiredCriteria: [`Điểm thi Checkpoint >= 80`, `Sẵn sàng chinh phục HSK ${targetHsk}`]
      }
    ];

    // 4. Lập lịch học thông minh theo ngày trong tuần (Smart Weekly Schedule)
    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const rawSchedule = [
      { dayOfWeek: 1, title: 'Ôn tập từ vựng SRS & Sửa lỗi sai ngữ pháp', type: 'vocab_review', mins: dailyMinutes, reason: 'Khởi động tuần mới bằng việc củng cố từ vựng đến hạn và xóa bỏ lỗi sai cũ.' },
      { dayOfWeek: 2, title: 'Học cấu trúc ngữ pháp mới & Làm bài tập câu', type: 'grammar_lesson', mins: dailyMinutes, reason: 'Tập trung tiếp thu cấu trúc ngữ pháp trọng điểm của tuần.' },
      { dayOfWeek: 3, title: 'Luyện nghe hiểu hội thoại thực tế & Bắt từ khóa', type: 'listening_drill', mins: Math.min(dailyMinutes, 25), reason: 'Rèn luyện thính giác với âm điệu người bản ngữ.' },
      { dayOfWeek: 4, title: 'Đàm thoại Voice Chat phản xạ với AI Tutor', type: 'conversation_tutor', mins: dailyMinutes, reason: 'Vận dụng từ vựng và ngữ pháp vừa học vào giao tiếp thực tế.' },
      { dayOfWeek: 5, title: 'Luyện đọc hiểu đoạn văn & Đặt câu tự luận', type: 'reading_writing', mins: dailyMinutes, reason: 'Nâng cao khả năng nhận diện mặt chữ Hán và biểu đạt văn bản.' },
      { dayOfWeek: 6, title: 'Bài tập tổng hợp & Kiểm tra tiến độ tuần', type: 'comprehensive_quiz', mins: dailyMinutes + 10, reason: 'Đánh giá mức độ ghi nhớ và hiệu quả học tập trong tuần.' },
      { dayOfWeek: 0, title: 'Nghỉ ngơi hoặc ôn nhẹ thẻ Flashcard SRS', type: 'vocab_review', mins: 15, reason: 'Thư giãn, duy trì chuỗi học tập Streak nhẹ nhàng.' }
    ];

    // Lưu vào database trong 1 Transaction an toàn
    const insertTransaction = db.transaction(() => {
      // Đánh dấu lộ trình cũ là completed/replaced nếu có
      db.prepare(`UPDATE adaptive_learning_paths SET status = 'completed' WHERE user_id = 'default'`).run();

      // Lưu lộ trình chính
      db.prepare(`
        INSERT INTO adaptive_learning_paths (
          id, user_id, title, current_hsk, target_hsk, primary_goal, daily_minutes, days_per_week, status, progress_percent, version, created_at, updated_at
        ) VALUES (?, 'default', ?, ?, ?, ?, ?, ?, 'active', 0, 1, ?, ?)
      `).run(pathId, pathTitle, currentHsk, targetHsk, primaryGoal, dailyMinutes, daysPerWeek, now, now);

      let stageCounter = 1;
      let firstStageId = '';

      for (const st of rawStages) {
        const stageId = `stg_${pathId}_${stageCounter}`;
        if (stageCounter === 1) firstStageId = stageId;

        // Stage 1 mở khóa, các stage sau khóa theo thứ tự
        const initialStatus = stageCounter === 1 ? 'in_progress' : 'locked';

        db.prepare(`
          INSERT INTO learning_path_stages (
            id, path_id, stage_number, title, description_vi, stage_type, status, is_locked_by_user, progress_percent, order_index
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
        `).run(stageId, pathId, st.stageNumber, st.title, st.descriptionVi, st.stageType, initialStatus, stageCounter);

        let itemCounter = 1;
        for (const item of st.items) {
          const itemId = `item_${stageId}_${itemCounter}`;
          const itemStatus = (stageCounter === 1 && itemCounter === 1) ? 'available' : 'locked';

          db.prepare(`
            INSERT INTO learning_path_items (
              id, stage_id, path_id, title, item_type, hsk_level, estimated_minutes, recommendation_reason, prerequisites_json, target_knowledge_json, status, order_index
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            itemId,
            stageId,
            pathId,
            item.title,
            item.itemType,
            item.hskLevel,
            item.estimatedMinutes,
            item.recommendationReason,
            JSON.stringify(item.prerequisites),
            JSON.stringify(item.targetKnowledge),
            itemStatus,
            itemCounter
          );
          itemCounter++;
        }
        stageCounter++;
      }

      // Cập nhật current_stage_id
      db.prepare('UPDATE adaptive_learning_paths SET current_stage_id = ? WHERE id = ?').run(firstStageId, pathId);

      // Lưu Milestones
      let msCounter = 1;
      for (const ms of rawMilestones) {
        const msId = `ms_${pathId}_${msCounter}`;
        db.prepare(`
          INSERT INTO learning_path_milestones (
            id, path_id, title, description_vi, target_type, required_criteria_json, progress_percent, status, order_index
          ) VALUES (?, ?, ?, ?, ?, ?, 0, 'pending', ?)
        `).run(msId, pathId, ms.title, ms.descriptionVi, ms.targetType, JSON.stringify(ms.requiredCriteria), msCounter);
        msCounter++;
      }

      // Lưu Lịch học thông minh
      for (const sc of rawSchedule) {
        const scId = `sch_${pathId}_${sc.dayOfWeek}`;
        db.prepare(`
          INSERT INTO learning_schedule_items (
            id, path_id, day_of_week, activity_title, activity_type, estimated_minutes, reason, is_completed
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        `).run(scId, pathId, sc.dayOfWeek, sc.title, sc.type, sc.mins, sc.reason);
      }

      // Lưu phiên bản ban đầu vào learning_path_versions
      const snapshot = {
        title: pathTitle,
        currentHsk,
        targetHsk,
        primaryGoal,
        dailyMinutes,
        stages: rawStages
      };

      db.prepare(`
        INSERT INTO learning_path_versions (
          id, path_id, version_number, trigger_reason, changes_summary, snapshot_json, created_at
        ) VALUES (?, ?, 1, ?, 'Khởi tạo cấu trúc lộ trình thích ứng ban đầu với 4 giai đoạn, lịch học tuần và mốc tiến bộ.', ?, ?)
      `).run(`ver_${pathId}_1`, pathId, params?.reason || 'Khởi tạo ban đầu', JSON.stringify(snapshot), now);
    });

    insertTransaction();
    return this.getPathDetail(pathId);
  }

  /**
   * Lấy dữ liệu chi tiết đầy đủ của một lộ trình
   */
  public async getPathDetail(pathId?: string): Promise<AdaptiveLearningPathDetail> {
    let targetPathId = pathId;
    if (!targetPathId) {
      const active = db.prepare(`
        SELECT id FROM adaptive_learning_paths 
        WHERE user_id = 'default' AND status != 'completed'
        ORDER BY updated_at DESC LIMIT 1
      `).get() as any;

      if (!active) {
        return this.generateAdaptivePath({
          reason: 'Khởi tạo lộ trình học tập thích ứng cá nhân hóa ban đầu'
        });
      }
      targetPathId = active.id;
    }

    const path = db.prepare('SELECT * FROM adaptive_learning_paths WHERE id = ?').get(targetPathId) as any;
    if (!path) throw new Error('Không tìm thấy lộ trình');

    const stages = db.prepare('SELECT * FROM learning_path_stages WHERE path_id = ? ORDER BY order_index ASC').all(targetPathId) as any[];
    const items = db.prepare('SELECT * FROM learning_path_items WHERE path_id = ? ORDER BY order_index ASC').all(targetPathId) as any[];
    const milestones = db.prepare('SELECT * FROM learning_path_milestones WHERE path_id = ? ORDER BY order_index ASC').all(targetPathId) as any[];
    const schedule = db.prepare('SELECT * FROM learning_schedule_items WHERE path_id = ? ORDER BY day_of_week ASC').all(targetPathId) as any[];

    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

    // Map items vào từng stage
    const itemsByStage = new Map<string, PathItem[]>();
    let nextRecommended: PathItem | undefined;

    for (const item of items) {
      const formattedItem: PathItem = {
        id: item.id,
        stageId: item.stage_id,
        pathId: item.path_id,
        title: item.title,
        itemType: item.item_type,
        hskLevel: item.hsk_level,
        estimatedMinutes: item.estimated_minutes,
        recommendationReason: item.recommendation_reason,
        prerequisites: item.prerequisites_json ? JSON.parse(item.prerequisites_json) : [],
        targetKnowledge: item.target_knowledge_json ? JSON.parse(item.target_knowledge_json) : [],
        lessonId: item.lesson_id,
        status: item.status,
        score: item.score,
        orderIndex: item.order_index,
        completedAt: item.completed_at
      };

      if (!itemsByStage.has(item.stage_id)) {
        itemsByStage.set(item.stage_id, []);
      }
      itemsByStage.get(item.stage_id)!.push(formattedItem);

      if (!nextRecommended && (item.status === 'available' || item.status === 'in_progress')) {
        nextRecommended = formattedItem;
      }
    }

    const formattedStages: PathStage[] = stages.map(s => ({
      id: s.id,
      pathId: s.path_id,
      stageNumber: s.stage_number,
      title: s.title,
      descriptionVi: s.description_vi,
      stageType: s.stage_type,
      status: s.status,
      isLockedByUser: Boolean(s.is_locked_by_user),
      progressPercent: s.progress_percent,
      orderIndex: s.order_index,
      items: itemsByStage.get(s.id) || []
    }));

    const formattedMilestones: PathMilestone[] = milestones.map(m => ({
      id: m.id,
      pathId: m.path_id,
      title: m.title,
      descriptionVi: m.description_vi,
      targetType: m.target_type,
      requiredCriteria: m.required_criteria_json ? JSON.parse(m.required_criteria_json) : [],
      progressPercent: m.progress_percent,
      status: m.status,
      achievedAt: m.achieved_at,
      orderIndex: m.order_index
    }));

    const formattedSchedule: ScheduleItem[] = schedule.map(sc => ({
      id: sc.id,
      pathId: sc.path_id,
      itemId: sc.item_id,
      dayOfWeek: sc.day_of_week,
      dayName: dayNames[sc.day_of_week] || `Thứ ${sc.day_of_week + 1}`,
      scheduledDate: sc.scheduled_date,
      activityTitle: sc.activity_title,
      activityType: sc.activity_type,
      estimatedMinutes: sc.estimated_minutes,
      reason: sc.reason,
      isCompleted: Boolean(sc.is_completed),
      completedAt: sc.completed_at
    }));

    return {
      id: path.id,
      userId: path.user_id,
      title: path.title,
      currentHsk: path.current_hsk,
      targetHsk: path.target_hsk,
      primaryGoal: path.primary_goal,
      dailyMinutes: path.daily_minutes,
      daysPerWeek: path.days_per_week,
      targetCompletionDate: path.target_completion_date,
      status: path.status,
      currentStageId: path.current_stage_id,
      progressPercent: path.progress_percent,
      version: path.version,
      stages: formattedStages,
      milestones: formattedMilestones,
      schedule: formattedSchedule,
      nextRecommendedItem: nextRecommended,
      createdAt: path.created_at,
      updatedAt: path.updated_at
    };
  }

  /**
   * TỰ ĐIỀU CHỈNH LỘ TRÌNH (Dynamic Adaptive CAT Rebalancing)
   * Kích hoạt sau mỗi lần học viên hoàn thành bài học, làm bài tập hoặc có kết quả hội thoại mới.
   */
  public async rebalancePath(params: {
    pathId?: string;
    itemId?: string;
    score?: number;
    passed?: boolean;
    triggerReason?: string;
    trigger?: 'lesson_completed' | 'test_completed' | 'manual';
    reason?: string;
  }): Promise<{ success: boolean; message: string; version: number }> {
    let targetPathId = params.pathId;
    if (!targetPathId) {
      const active = db.prepare(`SELECT id FROM adaptive_learning_paths WHERE user_id = 'default' AND status != 'completed' ORDER BY updated_at DESC LIMIT 1`).get() as any;
      if (!active) throw new Error('Không có lộ trình hoạt động để tái cân bằng');
      targetPathId = active.id;
    }

    const { itemId, score, passed } = params;
    const triggerReason = params.triggerReason || params.reason || (params.trigger === 'lesson_completed' ? 'Hoàn thành bài học' : 'Tái cân bằng AI');
    const path = await this.getPathDetail(targetPathId);
    if (!path) throw new Error('Không tìm thấy lộ trình');

    const now = Date.now();
    let rebalancedNotes: string[] = [];

    // 1. Cập nhật trạng thái của item vừa hoàn thành (nếu có)
    if (itemId) {
      const item = db.prepare('SELECT * FROM learning_path_items WHERE id = ? AND path_id = ?').get(itemId, targetPathId) as any;
      if (item) {
        const itemPassed = typeof passed === 'boolean' ? passed : (typeof score === 'number' ? score >= 70 : true);
        const finalStatus = itemPassed ? 'completed' : 'needs_review';

        db.prepare(`
          UPDATE learning_path_items
          SET status = ?, score = ?, completed_at = ?
          WHERE id = ?
        `).run(finalStatus, score !== undefined ? score : 100, now, itemId);

        rebalancedNotes.push(`Đã ghi nhận bài học "${item.title}" với kết quả: ${itemPassed ? 'Hoàn thành tốt' : 'Cần củng cố thêm'}.`);

        // NẾU HỌC VIÊN LÀM TỐT (SCORE >= 80): Mở khóa bài kế tiếp
        if (itemPassed) {
          const nextItem = db.prepare(`
            SELECT id, title FROM learning_path_items 
            WHERE stage_id = ? AND status = 'locked' AND order_index > ?
            ORDER BY order_index ASC LIMIT 1
          `).get(item.stage_id, item.order_index) as any;

          if (nextItem) {
            db.prepare(`UPDATE learning_path_items SET status = 'available' WHERE id = ?`).run(nextItem.id);
            rebalancedNotes.push(`Tự động mở khóa bài tiếp theo: "${nextItem.title}".`);
          } else {
            // Đã xong stage hiện tại! Kiểm tra mở khóa stage tiếp theo nếu không bị khóa thủ công
            const currentStage = db.prepare('SELECT * FROM learning_path_stages WHERE id = ?').get(item.stage_id) as any;
            if (currentStage) {
              db.prepare(`UPDATE learning_path_stages SET status = 'completed', progress_percent = 100 WHERE id = ?`).run(currentStage.id);

              const nextStage = db.prepare(`
                SELECT id, title, is_locked_by_user FROM learning_path_stages 
                WHERE path_id = ? AND order_index > ? AND status = 'locked'
                ORDER BY order_index ASC LIMIT 1
              `).get(targetPathId, currentStage.order_index) as any;

              if (nextStage && !nextStage.is_locked_by_user) {
                db.prepare(`UPDATE learning_path_stages SET status = 'in_progress' WHERE id = ?`).run(nextStage.id);
                db.prepare(`UPDATE adaptive_learning_paths SET current_stage_id = ? WHERE id = ?`).run(nextStage.id, targetPathId);

                // Mở khóa item đầu tiên của stage kế tiếp
                db.prepare(`
                  UPDATE learning_path_items SET status = 'available' 
                  WHERE stage_id = ? AND order_index = 1
                `).run(nextStage.id);

                rebalancedNotes.push(`Chúc mừng! Bạn đã hoàn thành Giai đoạn ${currentStage.stage_number} và mở khóa Giai đoạn tiếp theo: "${nextStage.title}".`);
              }
            }
          }
        } 
        // NẾU HỌC VIÊN GẶP KHÓ KHĂN (SCORE < 60):
        else {
          // Thêm 1 bài học củng cố bổ sung ngay sau bài này nếu chưa có
          const remediationId = `item_remed_${now}`;
          const insertRemediation = db.prepare(`
            INSERT INTO learning_path_items (
              id, stage_id, path_id, title, item_type, hsk_level, estimated_minutes, recommendation_reason, prerequisites_json, target_knowledge_json, status, order_index
            ) VALUES (?, ?, ?, ?, 'error_remediation', ?, 15, ?, '[]', '[]', 'available', ?)
          `);

          const remedTitle = `Củng cố bổ sung: Ôn lại trọng tâm ${item.title}`;
          const remedReason = `AI nhận diện điểm số bài vừa rồi chưa đạt yêu cầu (${score || 0}/100). Đã thêm bài ôn tập với bài tập chia nhỏ giúp bạn nắm chắc kiến thức trước khi đi tiếp.`;

          insertRemediation.run(
            remediationId,
            item.stage_id,
            targetPathId,
            remedTitle,
            item.hsk_level,
            remedReason,
            item.order_index + 1
          );

          rebalancedNotes.push(`Đã tự động bổ sung bài củng cố kiến thức: "${remedTitle}".`);
        }
      }
    }

    // 2. Cập nhật % tiến độ tổng thể của toàn lộ trình
    const totalItems = (db.prepare('SELECT COUNT(*) as count FROM learning_path_items WHERE path_id = ?').get(targetPathId) as any).count;
    const completedItems = (db.prepare(`SELECT COUNT(*) as count FROM learning_path_items WHERE path_id = ? AND status = 'completed'`).get(targetPathId) as any).count;
    const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // 3. Cập nhật Milestones
    if (overallProgress >= 25) {
      db.prepare(`UPDATE learning_path_milestones SET progress_percent = 100, status = 'achieved', achieved_at = ? WHERE path_id = ? AND order_index = 1`).run(now, targetPathId);
    }
    if (overallProgress >= 50) {
      db.prepare(`UPDATE learning_path_milestones SET progress_percent = 100, status = 'achieved', achieved_at = ? WHERE path_id = ? AND order_index = 2`).run(now, targetPathId);
    }
    if (overallProgress >= 75) {
      db.prepare(`UPDATE learning_path_milestones SET progress_percent = 100, status = 'achieved', achieved_at = ? WHERE path_id = ? AND order_index = 3`).run(now, targetPathId);
    }
    if (overallProgress >= 100) {
      db.prepare(`UPDATE learning_path_milestones SET progress_percent = 100, status = 'achieved', achieved_at = ? WHERE path_id = ? AND order_index = 4`).run(now, targetPathId);
      db.prepare(`UPDATE adaptive_learning_paths SET status = 'completed' WHERE id = ?`).run(targetPathId);
    }

    // 4. Tăng phiên bản lộ trình và ghi nhận lịch sử thay đổi
    const newVersion = (path.version || 1) + 1;
    db.prepare(`
      UPDATE adaptive_learning_paths 
      SET progress_percent = ?, version = ?, updated_at = ?
      WHERE id = ?
    `).run(overallProgress, newVersion, now, targetPathId);

    const changesSummary = rebalancedNotes.join(' ') || triggerReason;
    db.prepare(`
      INSERT INTO learning_path_versions (
        id, path_id, version_number, trigger_reason, changes_summary, snapshot_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `ver_${targetPathId}_${newVersion}`,
      targetPathId,
      newVersion,
      triggerReason,
      changesSummary,
      JSON.stringify({ progressPercent: overallProgress, version: newVersion }),
      now
    );

    return {
      success: true,
      message: changesSummary,
      version: newVersion
    };
  }

  /**
   * Thay đổi mục tiêu cá nhân hoặc nhịp độ học tập (Không xóa lịch sử tiến trình cũ)
   */
  public async updateGoals(params: {
    pathId?: string;
    targetHsk?: number;
    primaryGoal?: 'hsk_exam' | 'daily_communication' | 'business_work' | 'travel_study';
    dailyMinutes?: number;
    daysPerWeek?: number;
    targetCompletionDate?: string;
  }): Promise<{ success: boolean; message: string; version: number }> {
    let targetPathId = params.pathId;
    if (!targetPathId) {
      const active = db.prepare(`SELECT id FROM adaptive_learning_paths WHERE user_id = 'default' AND status != 'completed' ORDER BY updated_at DESC LIMIT 1`).get() as any;
      if (!active) throw new Error('Không có lộ trình hoạt động để cập nhật mục tiêu');
      targetPathId = active.id;
    }

    const path = await this.getPathDetail(targetPathId);
    if (!path) throw new Error('Không tìm thấy lộ trình');

    const now = Date.now();
    const newTargetHsk = params.targetHsk || path.targetHsk;
    const newGoal = params.primaryGoal || path.primaryGoal;
    const newMinutes = params.dailyMinutes || path.dailyMinutes;
    const newDays = params.daysPerWeek || path.daysPerWeek;
    const newDate = params.targetCompletionDate || path.targetCompletionDate;
    const newVersion = (path.version || 1) + 1;

    db.prepare(`
      UPDATE adaptive_learning_paths
      SET target_hsk = ?, primary_goal = ?, daily_minutes = ?, days_per_week = ?, target_completion_date = ?, version = ?, updated_at = ?
      WHERE id = ?
    `).run(newTargetHsk, newGoal, newMinutes, newDays, newDate, newVersion, now, targetPathId);

    // Cập nhật lại thời lượng và phân bổ trong learning_schedule_items
    db.prepare(`
      UPDATE learning_schedule_items
      SET estimated_minutes = ?
      WHERE path_id = ?
    `).run(newMinutes, targetPathId);

    const summary = `Cập nhật mục tiêu: Mục tiêu HSK ${newTargetHsk}, thời lượng ${newMinutes} phút/ngày, ${newDays} ngày/tuần. Giữ nguyên tiến trình đã đạt được.`;

    db.prepare(`
      INSERT INTO learning_path_versions (
        id, path_id, version_number, trigger_reason, changes_summary, snapshot_json, created_at
      ) VALUES (?, ?, ?, 'Người học cập nhật mục tiêu cá nhân', ?, ?, ?)
    `).run(`ver_${targetPathId}_${newVersion}`, targetPathId, newVersion, summary, JSON.stringify(params), now);

    return {
      success: true,
      message: summary,
      version: newVersion
    };
  }

  /**
   * Khóa hoặc mở khóa một giai đoạn để tránh AI tự động điều chỉnh
   */
  public async lockStage(stageId: string, isLocked: boolean): Promise<{ success: boolean; isLocked: boolean }> {
    db.prepare('UPDATE learning_path_stages SET is_locked_by_user = ? WHERE id = ?').run(isLocked ? 1 : 0, stageId);
    return { success: true, isLocked };
  }

  /**
   * Dời bài hoặc điều chỉnh hoạt động trong lịch học tuần
   */
  public async rescheduleItem(scheduleId: string, targetDay: number): Promise<{ success: boolean }> {
    db.prepare('UPDATE learning_schedule_items SET day_of_week = ? WHERE id = ?').run(targetDay, scheduleId);
    return { success: true };
  }

  /**
   * Đánh dấu hoàn thành một hoạt động trong lịch học tuần
   */
  public async completeScheduleItem(scheduleId: string): Promise<{ success: boolean }> {
    db.prepare('UPDATE learning_schedule_items SET is_completed = 1, completed_at = ? WHERE id = ?').run(Date.now(), scheduleId);
    return { success: true };
  }

  /**
   * Khởi động một bài học trong lộ trình: Nếu bài học chưa được AI tạo nội dung, tự động tạo ngay!
   */
  public async startPathItem(itemId: string): Promise<{
    item: PathItem;
    lessonId: string;
    lesson: any;
  }> {
    const item = db.prepare('SELECT * FROM learning_path_items WHERE id = ?').get(itemId) as any;
    if (!item) throw new Error('Không tìm thấy bài học trong lộ trình');

    // Nếu đã có liên kết tới `generated_lessons`, trả về luôn
    if (item.lesson_id) {
      const existingLesson = db.prepare('SELECT * FROM generated_lessons WHERE id = ?').get(item.lesson_id) as any;
      if (existingLesson) {
        return {
          item,
          lessonId: item.lesson_id,
          lesson: {
            ...existingLesson,
            vocabulary: existingLesson.vocabulary_json ? JSON.parse(existingLesson.vocabulary_json) : [],
            grammarPoints: existingLesson.grammar_points_json ? JSON.parse(existingLesson.grammar_points_json) : [],
            exercises: existingLesson.exercises_json ? JSON.parse(existingLesson.exercises_json) : []
          }
        };
      }
    }

    // Nếu chưa có, tự động sinh bài học qua `geminiLessonService`
    const generated = await geminiLessonService.generateLesson({
      topic: item.title,
      hskLevel: item.hsk_level,
      lessonType: item.item_type === 'error_remediation' ? 'error_correction' : (item.item_type === 'review_srs' ? 'review' : 'new'),
      customRequest: item.recommendation_reason
    });

    // Cập nhật lesson_id vào item
    db.prepare('UPDATE learning_path_items SET lesson_id = ?, status = ? WHERE id = ?').run(
      generated.id,
      item.status === 'locked' ? 'available' : item.status,
      itemId
    );

    return {
      item: { ...item, lessonId: generated.id },
      lessonId: generated.id,
      lesson: generated
    };
  }

  /**
   * Lấy lịch sử các phiên bản lộ trình
   */
  public async getVersions(pathId?: string) {
    let targetPathId = pathId;
    if (!targetPathId) {
      const active = db.prepare(`SELECT id FROM adaptive_learning_paths WHERE user_id = 'default' AND status != 'completed' ORDER BY updated_at DESC LIMIT 1`).get() as any;
      if (!active) return [];
      targetPathId = active.id;
    }

    const list = db.prepare(`
      SELECT id, version_number, trigger_reason, changes_summary, created_at 
      FROM learning_path_versions 
      WHERE path_id = ? 
      ORDER BY version_number DESC
    `).all(targetPathId) as any[];

    return list.map(v => ({
      id: v.id,
      versionNumber: v.version_number,
      triggerReason: v.trigger_reason,
      changesSummary: v.changes_summary,
      createdAt: v.created_at
    }));
  }

  /**
   * Khôi phục phiên bản lộ trình trước đó
   */
  public async restoreVersion(versionIdentifier: string | number, pathIdParam?: string): Promise<{ success: boolean; message: string }> {
    let versionRecord: any;
    if (typeof versionIdentifier === 'string' && versionIdentifier.startsWith('ver_')) {
      versionRecord = db.prepare('SELECT * FROM learning_path_versions WHERE id = ?').get(versionIdentifier) as any;
    } else {
      let targetPathId = pathIdParam;
      if (!targetPathId) {
        const active = db.prepare(`SELECT id FROM adaptive_learning_paths WHERE user_id = 'default' AND status != 'completed' ORDER BY updated_at DESC LIMIT 1`).get() as any;
        targetPathId = active?.id;
      }
      versionRecord = db.prepare('SELECT * FROM learning_path_versions WHERE path_id = ? AND version_number = ?').get(targetPathId, Number(versionIdentifier)) as any;
    }

    if (!versionRecord) throw new Error(`Không tìm thấy phiên bản để khôi phục`);

    const pathId = versionRecord.path_id;
    const now = Date.now();
    const currentPath = db.prepare('SELECT version FROM adaptive_learning_paths WHERE id = ?').get(pathId) as any;
    const nextVer = (currentPath?.version || 1) + 1;

    db.prepare(`
      UPDATE adaptive_learning_paths 
      SET version = ?, updated_at = ?
      WHERE id = ?
    `).run(nextVer, now, pathId);

    const summary = `Khôi phục trạng thái từ phiên bản ${versionRecord.version_number}.`;
    db.prepare(`
      INSERT INTO learning_path_versions (
        id, path_id, version_number, trigger_reason, changes_summary, snapshot_json, created_at
      ) VALUES (?, ?, ?, 'Người học hoàn tác phiên bản', ?, ?, ?)
    `).run(`ver_${pathId}_${nextVer}`, pathId, nextVer, summary, versionRecord.snapshot_json, now);

    return { success: true, message: summary };
  }
}

export const geminiPathService = new GeminiPathService();
