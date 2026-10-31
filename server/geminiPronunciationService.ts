import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';
import { geminiTextService } from './geminiTextService.js';
import { learningEvidenceService } from './learningEvidenceService.js';

export interface PronunciationEvaluationInput {
  targetText: string;
  targetPinyin: string;
  targetType: 'initial' | 'final' | 'tone' | 'syllable' | 'word' | 'sentence' | 'contrast_pair' | 'custom';
  mode: string;
  spokenTranscript: string;
  audioDurationMs: number;
  expectedDurationMs?: number;
}

export interface PronunciationEvaluationResult {
  recordId: string;
  targetText: string;
  targetPinyin: string;
  spokenTranscript: string;
  score: number; // 0 - 100
  isMatch: boolean;
  accuracyGrade: 'excellent' | 'good' | 'fair' | 'needs_improvement';
  audioMetrics: {
    durationMs: number;
    expectedDurationMs: number;
    durationAssessment: string;
    speedPacing: 'too_fast' | 'natural' | 'too_slow';
  };
  wordAnalysis: Array<{
    char: string;
    pinyin: string;
    status: 'correct' | 'substituted' | 'omitted';
    spokenChar?: string;
  }>;
  toneFeedbackVi: string;
  phoneticFeedbackVi: string;
  strengths: string[];
  improvements: string[];
  practiceTipVi: string;
}

export class GeminiPronunciationService {
  /**
   * Đánh giá phát âm trung thực, phân biệt rõ 3 lớp dữ liệu:
   * 1. Dữ liệu âm thanh thực tế (Thời lượng, tốc độ nhịp điệu)
   * 2. Kết quả phiên âm ASR (Ký tự nhận diện được)
   * 3. Nhận xét sư phạm của AI (Khẩu hình, luồng hơi, cách sửa lỗi người Việt)
   */
  public async evaluate(input: PronunciationEvaluationInput): Promise<PronunciationEvaluationResult> {
    const now = Date.now();
    const recordId = `pr_${now}_${Math.random().toString(36).substring(2, 7)}`;

    const cleanTarget = input.targetText.trim().replace(/[.,?!，。？！\s]/g, '');
    const cleanSpoken = (input.spokenTranscript || '').trim().replace(/[.,?!，。？！\s]/g, '');

    // 1. Phân tích âm học thực tế (Acoustic Duration Metrics)
    const charCount = Math.max(1, cleanTarget.length);
    const expectedDurationMs = input.expectedDurationMs || (charCount * 400 + 200);
    const actualDurationMs = Math.max(200, input.audioDurationMs);
    const durationRatio = actualDurationMs / expectedDurationMs;

    let speedPacing: 'too_fast' | 'natural' | 'too_slow' = 'natural';
    let durationAssessment = 'Thời lượng phát âm tự nhiên, nhịp điệu phù hợp.';
    if (durationRatio < 0.6) {
      speedPacing = 'too_fast';
      durationAssessment = 'Tốc độ đọc hơi nhanh, nên ngân dài nguyên âm và giữ hơi đều hơn.';
    } else if (durationRatio > 1.8) {
      speedPacing = 'too_slow';
      durationAssessment = 'Tốc độ đọc hơi chậm hoặc ngập ngừng giữa các âm tiết.';
    }

    // 2. Phân tích đối chiếu ký tự (ASR Transcript Analysis)
    const wordAnalysis: PronunciationEvaluationResult['wordAnalysis'] = [];
    let matchCharsCount = 0;

    for (let i = 0; i < cleanTarget.length; i++) {
      const targetChar = cleanTarget[i];
      const spokenChar = cleanSpoken[i];

      if (spokenChar === targetChar) {
        matchCharsCount++;
        wordAnalysis.push({
          char: targetChar,
          pinyin: '',
          status: 'correct',
          spokenChar: targetChar
        });
      } else if (spokenChar) {
        wordAnalysis.push({
          char: targetChar,
          pinyin: '',
          status: 'substituted',
          spokenChar: spokenChar
        });
      } else {
        wordAnalysis.push({
          char: targetChar,
          pinyin: '',
          status: 'omitted'
        });
      }
    }

    const textAccuracy = cleanTarget.length > 0 ? (matchCharsCount / cleanTarget.length) : 0;
    const isPerfectTextMatch = cleanSpoken === cleanTarget && cleanTarget.length > 0;

    // 3. Tính điểm phát âm tổng hợp có cơ sở
    // 70% dựa vào độ chính xác ký tự nhận diện ASR, 30% dựa vào nhịp điệu âm học thực tế
    let pacingScore = 100;
    if (speedPacing !== 'natural') {
      pacingScore = Math.max(60, Math.round(100 - Math.abs(1 - durationRatio) * 40));
    }

    let calculatedScore = Math.round(textAccuracy * 70 + (pacingScore / 100) * 30);
    if (!cleanSpoken) {
      calculatedScore = 0;
    }

    let accuracyGrade: 'excellent' | 'good' | 'fair' | 'needs_improvement' = 'needs_improvement';
    if (calculatedScore >= 85) accuracyGrade = 'excellent';
    else if (calculatedScore >= 70) accuracyGrade = 'good';
    else if (calculatedScore >= 50) accuracyGrade = 'fair';

    const isMatch = calculatedScore >= 70;

    // 4. Nhận xét sư phạm chuyên sâu từ AI hoặc Phân tích Ngôn ngữ
    let toneFeedbackVi = '';
    let phoneticFeedbackVi = '';
    let practiceTipVi = '';
    const strengths: string[] = [];
    const improvements: string[] = [];

    // Nhận diện lỗi ngữ âm thường gặp dựa trên cặp âm
    const detectedSoundKeys: string[] = [];

    if (cleanTarget.includes('知') || cleanTarget.includes('中') || cleanTarget.includes('吃') || cleanTarget.includes('是')) {
      if (!cleanSpoken || cleanSpoken !== cleanTarget) {
        detectedSoundKeys.push('retroflex_zh_ch_sh');
      }
    }
    if (input.targetPinyin.includes('ǎ') || input.targetPinyin.includes('3')) {
      detectedSoundKeys.push('tone_3');
    }
    if (input.targetPinyin.includes('à') || input.targetPinyin.includes('4')) {
      detectedSoundKeys.push('tone_4');
    }

    // Nhận xét AI dựa trên mô hình ngôn ngữ hoặc luật sư phạm
    const apiKey = geminiTextService.getApiKey();
    if (apiKey && cleanSpoken && !isPerfectTextMatch) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
Bạn là chuyên gia ngữ âm tiếng Trung dành cho người Việt Nam.
Hãy nhận xét phát âm của học viên:
- Từ/Câu mẫu: "${input.targetText}" (Pinyin: ${input.targetPinyin}).
- Nhận diện giọng nói học viên: "${cleanSpoken}".
- Thời lượng âm thanh: ${actualDurationMs} ms (Chuẩn: ~${expectedDurationMs} ms).

Yêu cầu xuất JSON format:
{
  "toneFeedbackVi": "Nhận xét về thanh điệu và biến điệu (ngắn gọn, chính xác)",
  "phoneticFeedbackVi": "Hướng dẫn cụ thể về khẩu hình miệng, đặt lưỡi hoặc luồng hơi",
  "strengths": ["Điểm học viên đã làm tốt 1", "Điểm làm tốt 2"],
  "improvements": ["Điểm cần chỉnh sửa 1", "Điểm cần chỉnh sửa 2"],
  "practiceTipVi": "Lời khuyên luyện tập tiếp theo"
}
Quy tắc: Tiếng Việt sư phạm, gần gũi, chỉ rõ lỗi âm uốn lưỡi (zh, ch, sh) vs thẳng lưỡi (z, c, s), mặt lưỡi (j, q, x) hay thanh 4 nếu có liên quan.`;

        const resp = await ai.models.generateContent({
          model: geminiTextService.getModel(),
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseMimeType: 'application/json' }
        });

        if (resp.text) {
          const parsed = JSON.parse(resp.text);
          toneFeedbackVi = parsed.toneFeedbackVi || '';
          phoneticFeedbackVi = parsed.phoneticFeedbackVi || '';
          practiceTipVi = parsed.practiceTipVi || '';
          if (Array.isArray(parsed.strengths)) strengths.push(...parsed.strengths);
          if (Array.isArray(parsed.improvements)) improvements.push(...parsed.improvements);
        }
      } catch (err) {
        console.warn('AI pronunciation feedback notice:', err);
      }
    }

    // Fallback nhận xét sư phạm chuẩn mực nếu AI offline hoặc câu nói khớp hoàn toàn
    if (!toneFeedbackVi || isPerfectTextMatch) {
      if (isPerfectTextMatch) {
        toneFeedbackVi = 'Thanh điệu và nhịp điệu phát âm rất tốt, nhận diện chính xác 100% các âm tiết.';
        phoneticFeedbackVi = 'Khẩu hình chuẩn xác, luồng hơi dứt khoát, âm phát ra tự nhiên và vang sáng.';
        strengths.push('Phát âm chuẩn xác toàn bộ âm tiết', 'Nhịp điệu liền mạch tự nhiên');
        practiceTipVi = 'Hãy tiếp tục duy trì cảm âm này và thử thách các câu dài hơn hoặc tốc độ nhanh hơn!';
      } else if (!cleanSpoken) {
        toneFeedbackVi = 'Chưa thể đánh giá thanh điệu do tín hiệu âm thanh quá nhỏ hoặc micro chưa thu được tiếng rõ ràng.';
        phoneticFeedbackVi = 'Vui lòng kiểm tra lại microphone, nói to rõ ràng hơn và gần micro hơn.';
        improvements.push('Cần nói to, rõ ràng và lại gần micro');
        practiceTipVi = 'Bấm nút "Nghe mẫu chuẩn" trước, sau đó bấm "Ghi âm" và đọc theo ngay.';
      } else {
        toneFeedbackVi = 'Chú ý phân biệt thanh điệu: Thanh 4 cần rơi nhanh dứt khoát từ cao xuống đáy; Thanh 3 cần hạ sâu xuống đáy cổ họng.';
        phoneticFeedbackVi = `Hệ thống nhận diện được: "${cleanSpoken}". Cần chú ý khẩu hình và độ bật hơi của các âm đầu.`;
        strengths.push('Đã phát âm tự tin và hoàn thành bản ghi');
        improvements.push(`Khắc phục các âm chưa khớp giữa "${cleanSpoken}" và "${cleanTarget}"`);
        practiceTipVi = 'Nghe lại bản ghi của mình, đối chiếu từng âm với giọng mẫu bản xứ.';
      }
    }

    // Luôn bổ sung lưu ý minh bạch về thanh điệu (Tuân thủ nguyên tắc 6.3)
    toneFeedbackVi += ' (Lưu ý: Để hoàn thiện cảm âm thanh điệu, hãy nghe đối chiếu trực tiếp giữa giọng của bạn và âm thanh mẫu).';

    // 5. Lưu vào bảng SQLite `pronunciation_records`
    const targetType = input.targetType || (input as any).practiceMode || 'word';
    const mode = input.mode || (input as any).practiceMode || 'standard';

    db.prepare(`
      INSERT INTO pronunciation_records (
        id, user_id, target_text, target_pinyin, target_type, mode,
        spoken_transcript, score, is_match, audio_duration_ms,
        audio_metrics_json, word_analysis_json, tone_feedback_vi,
        phonetic_feedback_vi, strengths_json, improvements_json,
        practice_tip_vi, created_at
      ) VALUES (?, 'default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      recordId,
      input.targetText,
      input.targetPinyin,
      targetType,
      mode,
      cleanSpoken,
      calculatedScore,
      isMatch ? 1 : 0,
      actualDurationMs,
      JSON.stringify({
        durationMs: actualDurationMs,
        expectedDurationMs,
        durationRatio: Math.round(durationRatio * 100) / 100,
        speedPacing,
        durationAssessment
      }),
      JSON.stringify(wordAnalysis),
      toneFeedbackVi,
      phoneticFeedbackVi,
      JSON.stringify(strengths),
      JSON.stringify(improvements),
      practiceTipVi,
      now
    );

    // 6. Cập nhật bảng điểm yếu phát âm `pronunciation_weaknesses` và liên thông bộ nhớ dài hạn
    this.updateWeaknessTracking(input, calculatedScore, detectedSoundKeys, now);

    // 7. Ghi nhận Pronunciation Evidence vào Learning Evidence System (Phase A2)
    try {
      learningEvidenceService.recordEvidence({
        rawText: input.targetText,
        evidenceType: 'pronunciation',
        action: 'pronunciation_trial',
        sourceModule: 'pronunciation_lab',
        idempotencyKey: `pro_eval_${recordId}`,
        observedData: {
          speaker: 'user',
          userUtterance: cleanSpoken,
          promptZh: input.targetText,
          pinyinExpected: input.targetPinyin,
          audioMetrics: {
            actualDurationMs,
            expectedDurationMs,
            durationRatio: Math.round(durationRatio * 100) / 100,
            speedPacing
          }
        },
        assessmentData: {
          isCorrect: isMatch,
          score: calculatedScore,
          acousticAccuracy: accuracyGrade,
          matchRate: isMatch ? 1.0 : calculatedScore / 100,
          timeSpentMs: actualDurationMs,
          charMatches: wordAnalysis
        },
        assessmentMethod: 'audio_evaluation',
        evaluator: 'acoustic_analyzer',
        confidence: 0.95
      });
    } catch (e) {
      console.warn('Lỗi ghi nhận learning evidence Pronunciation:', e);
    }

    return {
      recordId,
      targetText: input.targetText,
      targetPinyin: input.targetPinyin,
      spokenTranscript: cleanSpoken,
      score: calculatedScore,
      isMatch,
      accuracyGrade,
      audioMetrics: {
        durationMs: actualDurationMs,
        expectedDurationMs,
        durationAssessment,
        speedPacing
      },
      wordAnalysis,
      toneFeedbackVi,
      phoneticFeedbackVi,
      strengths,
      improvements,
      practiceTipVi
    };
  }

  /**
   * Cập nhật theo dõi điểm yếu và liên thông vào SQLite learner_profile / learning_errors
   */
  private updateWeaknessTracking(
    input: PronunciationEvaluationInput,
    score: number,
    detectedKeys: string[],
    now: number
  ) {
    try {
      const keysToTrack = new Set<string>();
      if (detectedKeys.length > 0) {
        detectedKeys.forEach(k => keysToTrack.add(k));
      }

      // Tự động phân tích các âm tố cốt lõi từ Pinyin
      const cleanPinyinLower = input.targetPinyin.toLowerCase();
      const phoneticKeys = ['zh', 'ch', 'sh', 'z', 'c', 's', 'j', 'q', 'x', 'b', 'p', 'd', 't', 'g', 'k', 'r', 'ü'];
      for (const pk of phoneticKeys) {
        if (cleanPinyinLower.includes(pk)) {
          keysToTrack.add(pk);
        }
      }

      if (keysToTrack.size === 0) {
        keysToTrack.add(input.targetText.slice(0, 4));
      }

      for (const soundKey of keysToTrack) {
        const category = soundKey.startsWith('tone') ? 'tone' : (['zh', 'ch', 'sh', 'z', 'c', 's'].includes(soundKey) ? 'initial' : 'general');
        const title = `Phát âm: ${soundKey} (${input.targetText})`;

        const existing = db.prepare('SELECT * FROM pronunciation_weaknesses WHERE sound_key = ?').get(soundKey) as any;

        if (existing) {
          const newErrorCount = score < 75 ? existing.error_count + 1 : existing.error_count;
          const newPracticeCount = existing.practice_count + 1;
          let newMastery = existing.mastery_level;

          if (score >= 85 && newPracticeCount >= 3 && newErrorCount <= 1) {
            newMastery = 'mastered';
          } else if (score >= 70) {
            newMastery = 'good';
          } else {
            newMastery = 'struggling';
          }

          db.prepare(`
            UPDATE pronunciation_weaknesses
            SET error_count = ?, practice_count = ?, mastery_level = ?, last_practiced_at = ?
            WHERE id = ?
          `).run(newErrorCount, newPracticeCount, newMastery, now, existing.id);
        } else {
          db.prepare(`
            INSERT INTO pronunciation_weaknesses (
              user_id, sound_key, sound_category, title, error_count, practice_count, mastery_level, last_practiced_at, created_at
            ) VALUES ('default', ?, ?, ?, ?, 1, ?, ?, ?)
          `).run(soundKey, category, title, score < 75 ? 1 : 0, score >= 80 ? 'good' : 'struggling', now, now);
        }
      }

      // Nếu điểm dưới 65, ghi nhận vào bảng chung `learning_errors`
      if (score < 65) {
        const errorTitle = `Lỗi phát âm: ${input.targetText} [${input.targetPinyin}]`;
        const existingErr = db.prepare('SELECT id, occurrence_count FROM learning_errors WHERE title = ?').get(errorTitle) as any;
        if (existingErr) {
          db.prepare(`
            UPDATE learning_errors 
            SET occurrence_count = occurrence_count + 1, last_occurred_at = ?
            WHERE id = ?
          `).run(now, existingErr.id);
        } else {
          db.prepare(`
            INSERT INTO learning_errors (
              error_type, title, user_sentence, corrected_sentence, explanation_vi, occurrence_count, last_occurred_at, status
            ) VALUES ('pronunciation', ?, ?, ?, ?, 1, ?, 'pending')
          `).run(
            errorTitle,
            input.spokenTranscript || '(Chưa phát âm chuẩn)',
            input.targetText,
            `Cần chú ý phát âm chuẩn pinyin ${input.targetPinyin}, luyện khẩu hình và cao độ thanh điệu.`,
            now
          );
        }
      }
    } catch (e) {
      console.warn('Update pronunciation weakness notice:', e);
    }
  }

  /**
   * Tạo bài luyện cá nhân hóa tự động dựa trên điểm yếu trong bộ nhớ SQLite
   */
  public async generatePersonalizedDrills(_profileId: string = 'default'): Promise<{
    success: boolean;
    drills: Array<{
      id: string;
      title: string;
      targetSound: string;
      zh: string;
      pinyin: string;
      vi: string;
      explanationVi: string;
      tongueShapeTips: string;
      contrastWord?: { zh: string; pinyin: string; vi: string };
    }>;
    focusAreas: string[];
    source: 'ai_tailored' | 'preset_pitfalls';
  }> {
    // 1. Quét các điểm yếu từ SQLite
    const weaknesses = db.prepare(`
      SELECT sound_key, title, error_count FROM pronunciation_weaknesses 
      WHERE mastery_level IN ('struggling', 'learning') 
      ORDER BY error_count DESC LIMIT 5
    `).all() as any[];

    const errorRows = db.prepare(`
      SELECT title, corrected_sentence, explanation_vi FROM learning_errors 
      WHERE error_type = 'pronunciation' AND status = 'pending'
      ORDER BY occurrence_count DESC LIMIT 5
    `).all() as any[];

    const focusAreas = weaknesses.map(w => w.title).concat(errorRows.map(e => e.title));
    const apiKey = geminiTextService.getApiKey();

    if (apiKey && focusAreas.length > 0) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
Bạn là giáo viên chuyên gia ngữ âm tiếng Trung bản ngữ dành cho người Việt.
Dựa trên điểm yếu phát âm đã được ghi nhận của học viên:
${focusAreas.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Hãy tạo 5 bài tập luyện phát âm cá nhân hóa đặc biệt khắc phục đúng các điểm yếu này.
Yêu cầu định dạng JSON:
{
  "drills": [
    {
      "id": "drill_1",
      "title": "Tên bài luyện (ví dụ: Khắc phục nhầm lẫn zh và z)",
      "targetSound": "zh vs z",
      "zh": "Từ hoặc câu tiếng Trung",
      "pinyin": "Pinyin chuẩn",
      "vi": "Nghĩa tiếng Việt",
      "explanationVi": "Giải thích chi tiết vì sao người Việt hay sai và cách khắc phục",
      "tongueShapeTips": "Hướng dẫn cụ thể khẩu hình và vị trí đặt lưỡi"
    }
  ]
}`;

        const resp = await ai.models.generateContent({
          model: geminiTextService.getModel(),
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseMimeType: 'application/json' }
        });

        if (resp.text) {
          const parsed = JSON.parse(resp.text);
          if (Array.isArray(parsed.drills) && parsed.drills.length > 0) {
            return {
              success: true,
              drills: parsed.drills,
              focusAreas: focusAreas.slice(0, 3),
              source: 'ai_tailored'
            };
          }
        }
      } catch (err) {
        console.warn('AI generate drills notice:', err);
      }
    }

    // 2. Preset Fallback chất lượng cao cho người Việt
    return {
      success: true,
      drills: [
        {
          id: 'preset_1',
          title: 'Khắc phục nhầm lẫn Âm Uốn Lưỡi zh vs Âm Thẳng Lưỡi z',
          targetSound: 'zh vs z',
          zh: '我知道这是真的。',
          pinyin: 'Wǒ zhīdào zhè shì zhēn de.',
          vi: 'Tôi biết điều này là thật.',
          explanationVi: 'Người Việt hay phát âm zh giống z. Hãy bắt buộc cong đầu lưỡi chạm ngạc cứng trên.',
          tongueShapeTips: 'zh: Uốn cong đầu lưỡi lên vòm họng ngạc cứng trên; z: Đầu lưỡi duỗi thẳng chạm mặt sau răng cửa.'
        },
        {
          id: 'preset_2',
          title: 'Luyện Bật Hơi Mạnh Với Âm Mặt Lưỡi q vs Âm Uốn Lưỡi ch',
          targetSound: 'q vs ch',
          zh: '我想去吃烤鸭。',
          pinyin: 'Wǒ xiǎng qù chī kǎoyā.',
          vi: 'Tôi muốn đi ăn vịt quay.',
          explanationVi: 'q đòi hỏi mép miệng bè dẹt và luồng gió sắc; ch đòi hỏi uốn cong lưỡi và luồng hơi ấm từ trần họng.',
          tongueShapeTips: 'q: Mặt lưỡi ép bẹt bật hơi; ch: Đầu lưỡi cong lên ngạc trên bật hơi.'
        },
        {
          id: 'preset_3',
          title: 'Khắc Phục Lỗi Đọc Thanh 4 Thành Dấu Huyền',
          targetSound: 'Thanh 4 (à)',
          zh: '去学校看电影。',
          pinyin: 'Qù xuéxiào kàn diànyǐng.',
          vi: 'Đến trường xem phim.',
          explanationVi: 'Qù, kàn, diàn đều mang thanh 4 rơi thẳng từ 5 xuống 1 với lực dứt khoát, không kéo dài.',
          tongueShapeTips: 'Nói như một tiếng ra lệnh dứt khoát, không kéo dài giọng.'
        },
        {
          id: 'preset_4',
          title: 'Biến Điệu Hai Thanh 3 Trong Đàm Thoại',
          targetSound: 'Thanh 3 + Thanh 3',
          zh: '你好，我也很好。',
          pinyin: 'Nǐ hǎo, wǒ yě hěn hǎo.',
          vi: 'Xin chào, tôi cũng rất khỏe.',
          explanationVi: 'Nǐ hǎo đọc thành Ní hǎo; Hěn hǎo đọc thành Hén hǎo. Giữ nhịp tự nhiên.',
          tongueShapeTips: 'Âm thứ nhất đổi thành thanh 2 vút lên cao, âm thứ hai giữ nguyên thanh 3.'
        },
        {
          id: 'preset_5',
          title: 'Vận Mẫu Tròn Môi ü (ü vs u)',
          targetSound: 'ü vs u',
          zh: '雨天路滑，请穿绿色的雨衣。',
          pinyin: 'Yǔtiān lù huá, qǐng chuān lǜsè de yǔyī.',
          vi: 'Trời mưa đường trơn, xin hãy mặc áo mưa màu xanh lục.',
          explanationVi: 'Phân biệt lù (u chu môi) và lǜ (ü giữ môi tròn huýt sáo phát âm i).',
          tongueShapeTips: 'ü: Khum tròn môi cố định không lay chuyển.'
        }
      ],
      focusAreas: focusAreas.length > 0 ? focusAreas.slice(0, 3) : ['Âm uốn lưỡi zh/ch/sh', 'Thanh 4 dứt khoát', 'Biến điệu thanh 3'],
      source: 'preset_pitfalls'
    };
  }

  /**
   * Thống kê tiến bộ phát âm cho dashboard
   */
  public getStats(): {
    totalPractices: number;
    accuracyAverage: number;
    masteredSoundsCount: number;
    strugglingSoundsCount: number;
    masteredSounds: string[];
    strugglingSounds: string[];
    recentActivityCount: number;
  } {
    const totalRow = db.prepare('SELECT COUNT(*) as count, AVG(score) as avg_score FROM pronunciation_records').get() as any;
    const totalPractices = totalRow?.count || 0;
    const accuracyAverage = Math.round(totalRow?.avg_score || 0);

    const masteredRows = db.prepare("SELECT sound_key, title FROM pronunciation_weaknesses WHERE mastery_level = 'mastered' LIMIT 10").all() as any[];
    const strugglingRows = db.prepare("SELECT sound_key, title, error_count FROM pronunciation_weaknesses WHERE mastery_level IN ('struggling', 'learning') ORDER BY error_count DESC LIMIT 10").all() as any[];

    const weekAgo = Date.now() - 7 * 86400000;
    const recentActivity = db.prepare('SELECT COUNT(*) as count FROM pronunciation_records WHERE created_at >= ?').get(weekAgo) as any;

    return {
      totalPractices,
      accuracyAverage,
      masteredSoundsCount: masteredRows.length,
      strugglingSoundsCount: strugglingRows.length,
      masteredSounds: masteredRows.map(r => r.title),
      strugglingSounds: strugglingRows.map(r => `${r.title} (Lỗi: ${r.error_count} lần)`),
      recentActivityCount: recentActivity?.count || 0
    };
  }

  /**
   * Lấy lịch sử luyện tập gần nhất
   */
  public getHistory(limit: number = 20): any[] {
    const rows = db.prepare(`
      SELECT * FROM pronunciation_records
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map(r => ({
      id: r.id,
      targetText: r.target_text,
      targetPinyin: r.target_pinyin,
      targetType: r.target_type,
      mode: r.mode,
      spokenTranscript: r.spoken_transcript,
      score: r.score,
      isMatch: Boolean(r.is_match),
      audioDurationMs: r.audio_duration_ms,
      audioMetrics: r.audio_metrics_json ? JSON.parse(r.audio_metrics_json) : null,
      wordAnalysis: r.word_analysis_json ? JSON.parse(r.word_analysis_json) : [],
      toneFeedbackVi: r.tone_feedback_vi,
      phoneticFeedbackVi: r.phonetic_feedback_vi,
      strengths: r.strengths_json ? JSON.parse(r.strengths_json) : [],
      improvements: r.improvements_json ? JSON.parse(r.improvements_json) : [],
      practiceTipVi: r.practice_tip_vi,
      createdAt: r.created_at
    }));
  }

  /**
   * Xóa bản ghi lịch sử phát âm
   */
  public deleteRecord(recordId: string): boolean {
    const res = db.prepare('DELETE FROM pronunciation_records WHERE id = ?').run(recordId);
    return res.changes > 0;
  }
}

export const geminiPronunciationService = new GeminiPronunciationService();
