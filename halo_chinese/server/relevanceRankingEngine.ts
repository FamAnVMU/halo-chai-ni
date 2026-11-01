/**
 * Relevance Ranking Engine (Halo Chinese v2.5.0)
 * Phase B2 - Context Retrieval & Context Builder
 *
 * Implements multi-criteria scoring, semantic relevance matching,
 * contradiction resolution, staleness detection, and redundancy deduplication.
 */

import {
  ContextProfileConfig,
  EvidenceContextItem,
  KnowledgeContextItem,
  MasteryContextItem,
  LearnerProfileContext
} from './contextRetrievalTypes.js';
import { tokenizeChinese } from '../src/data/seedDictionary.js';

export class RelevanceRankingEngine {
  /**
   * Tính toán điểm xếp hạng liên quan cho ứng viên tri thức (Knowledge candidate)
   */
  public static rankKnowledgeItem(
    item: KnowledgeContextItem,
    queryText: string = '',
    topic: string = '',
    masteryMap: Map<string, MasteryContextItem>,
    config: ContextProfileConfig
  ): { score: number; rationale: string } {
    const reasons: string[] = [];
    const queryClean = queryText.trim().toLowerCase();
    const topicClean = topic.trim().toLowerCase();
    const itemHanzi = (item.hanziSimplified || item.displayText || '').toLowerCase();
    const itemMeaning = (item.primaryMeaningVi || '').toLowerCase();

    // 1. Query Relevance (0 - 100)
    let queryScore = 0;
    if (queryClean) {
      if (itemHanzi && queryClean.includes(itemHanzi)) {
        queryScore = 100; // Xuất hiện trực tiếp trong câu nói/câu hỏi
        reasons.push('Khớp trực tiếp chữ Hán trong truy vấn');
      } else if (item.pinyin && queryClean.includes(item.pinyin.toLowerCase())) {
        queryScore = 85;
        reasons.push('Khớp âm Pinyin trong truy vấn');
      } else {
        // Tokenize query and check intersection
        const tokens = tokenizeChinese(queryText);
        if (tokens.some(t => t.token === itemHanzi)) {
          queryScore = 90;
          reasons.push('Khớp token phân tích từ vựng');
        } else if (itemMeaning && queryClean.includes(itemMeaning)) {
          queryScore = 80;
          reasons.push('Khớp ý nghĩa tiếng Việt trong truy vấn');
        }
      }
    }

    // 2. Topic Relevance (0 - 100)
    let topicScore = 0;
    if (topicClean) {
      if (itemMeaning && topicClean.includes(itemMeaning)) {
        topicScore = 80;
        reasons.push('Khớp chủ đề buổi học');
      } else if (itemHanzi && topicClean.includes(itemHanzi)) {
        topicScore = 100;
        reasons.push('Khớp trực tiếp chủ đề');
      } else if (topicClean.includes('nhà hàng') || topicClean.includes('restaurant') || topicClean.includes('ăn uống') || topicClean.includes('ẩm thực') || topicClean.includes('dining')) {
        const diningKeywords = ['ăn', 'uống', 'gọi món', 'mì', 'thịt', 'bò', 'tiền', 'giá', 'bát', 'chén', '点餐', '买单', '结账', '牛肉面', '吃', '喝', '多少钱', '碗'];
        if (diningKeywords.some(k => itemHanzi.includes(k) || (itemMeaning && itemMeaning.includes(k)))) {
          topicScore = 85;
          reasons.push('Phù hợp ngữ cảnh ẩm thực / nhà hàng');
        }
      }
    }

    // 3. Mastery Relevance (0 - 100)
    // Đối với giảng dạy và sửa lỗi, các kiến thức đang 'fragile', 'practicing', 'needs_review' có giá trị cao nhất
    let masteryScore = 50;
    const mastery = masteryMap.get(item.id);
    if (mastery) {
      if (mastery.needsReview) {
        masteryScore = 100;
        reasons.push('Đang cần ôn tập gấp theo SRS / Mastery Engine');
      } else if (mastery.compositeState === 'fragile') {
        masteryScore = 90;
        reasons.push('Trạng thái mong manh (fragile)');
      } else if (mastery.compositeState === 'practicing') {
        masteryScore = 80;
        reasons.push('Đang trong giai đoạn luyện tập');
      } else if (mastery.compositeState === 'mastered') {
        masteryScore = 40; // Đã thành thạo, giảm ưu tiên trừ khi người học hỏi cụ thể
      }
    }

    // 4. Relations Bonus (0 - 20)
    let relationsScore = 0;
    if (config.includeRelations && item.relations && item.relations.length > 0) {
      relationsScore = Math.min(20, item.relations.length * 5);
      reasons.push(`Có ${item.relations.length} liên kết tri thức`);
    }

    // Nếu query có nội dung rõ ràng mà item hoàn toàn không khớp query lẫn topic -> Phạt nặng để loại bỏ kiến thức ngoại lai
    if (queryClean.length >= 3 && queryScore === 0 && topicScore === 0) {
      masteryScore = Math.min(masteryScore, 10);
    }

    // Tổng hợp điểm số theo trọng số cấu hình của Task
    const w = config.weights;
    const finalScore = (
      queryScore * w.queryRelevance +
      topicScore * w.topicRelevance +
      masteryScore * w.masteryRelevance +
      relationsScore * 0.1
    );

    return {
      score: Math.round(finalScore * 10) / 10,
      rationale: reasons.join('; ') || 'Điểm tương đồng mặc định'
    };
  }

  /**
   * Tính toán điểm xếp hạng cho bằng chứng học tập (Evidence candidate)
   * và lọc bỏ bằng chứng mồ côi / không có giá trị chẩn đoán
   */
  public static rankEvidenceItem(
    item: EvidenceContextItem,
    queryKnowledgeIds: Set<string>,
    topic: string = '',
    config: ContextProfileConfig
  ): { score: number; diagnosticValue: 'high' | 'medium' | 'low' } {
    let score = 0;
    let diagnosticValue: 'high' | 'medium' | 'low' = 'low';

    // 1. Khớp Knowledge ID liên quan
    if (item.knowledgeId && queryKnowledgeIds.has(item.knowledgeId)) {
      score += 45;
      diagnosticValue = 'high';
    }

    // 2. Độ tin cậy bằng chứng từ người học trực tiếp (speaker: 'user')
    if (item.speaker === 'user') {
      score += 25 * item.confidenceScore;
    } else {
      score += 10 * item.confidenceScore;
    }

    // 3. Số lần lặp lại lỗi (Repeated mistakes have top diagnostic value)
    if (item.repetitionCount > 1) {
      score += Math.min(20, item.repetitionCount * 5);
      diagnosticValue = 'high';
    }

    // 4. Suy giảm theo thời gian (Recency Decay)
    const daysAgo = Math.max(0, (Date.now() - item.occurredAt) / 86400000);
    const recencyFactor = Math.max(0.2, 1 / (1 + daysAgo * 0.05)); // 1 ngày -> 0.95, 30 ngày -> 0.40
    score *= (0.7 + 0.3 * recencyFactor);

    if (score >= 60) diagnosticValue = 'high';
    else if (score >= 35) diagnosticValue = 'medium';

    return {
      score: Math.round(score * 10) / 10,
      diagnosticValue
    };
  }

  /**
   * Loại bỏ các bằng chứng trùng lặp (Deduplicate Redundant Evidences)
   * Gộp các bằng chứng cùng loại và cùng trích dẫn thành 1 bản ghi đại diện có repetitionCount
   */
  public static deduplicateEvidences(items: EvidenceContextItem[]): EvidenceContextItem[] {
    const map = new Map<string, EvidenceContextItem>();

    for (const item of items) {
      const key = `${item.knowledgeId || 'none'}_${item.userQuote.trim().toLowerCase()}`;
      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.repetitionCount += (item.repetitionCount || 1);
        // Keep the newest occurred timestamp
        if (item.occurredAt > existing.occurredAt) {
          existing.occurredAt = item.occurredAt;
        }
        // Retain highest diagnostic value
        if (item.diagnosticValue === 'high') {
          existing.diagnosticValue = 'high';
        }
      } else {
        map.set(key, { ...item, repetitionCount: item.repetitionCount || 1 });
      }
    }

    return Array.from(map.values());
  }

  /**
   * Xử lý dữ liệu mâu thuẫn & lỗi thời giữa hồ sơ người học và kết quả kiểm tra mới nhất (Requirement 8)
   */
  public static resolveProfileContradictions(
    profile: LearnerProfileContext,
    latestAssessmentHsk?: number,
    assessmentTimestamp?: number
  ): LearnerProfileContext {
    if (!latestAssessmentHsk || latestAssessmentHsk === profile.currentHsk) {
      return profile;
    }

    // Nếu có bài test mới và mâu thuẫn với profile cũ:
    // Dữ liệu bài kiểm tra mới hơn có độ tin cậy cao hơn -> Cập nhật trình độ hiện tại, đánh dấu đã xử lý mâu thuẫn
    const updated: LearnerProfileContext = {
      ...profile,
      currentHsk: latestAssessmentHsk,
      isStale: false
    };

    return updated;
  }
}
