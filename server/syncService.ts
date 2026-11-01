import { db } from './db';

export interface SyncMutationItem {
  id: string; // client sync item id
  entityType: 'profile' | 'srs_item' | 'srs_review' | 'vocab' | 'grammar' | 'evidence' | 'chat_session' | 'chat_message' | 'placement' | 'pronunciation' | 'shadowing' | 'history';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  payload: any;
  timestamp: number;
  version?: number;
  idempotencyKey: string;
}

export interface SyncPushResult {
  success: boolean;
  processedCount: number;
  syncedIds: string[];
  latestSeq: number;
  serverTime: number;
  conflicts?: any[];
  error?: string;
}

export interface SyncPullResult {
  success: boolean;
  changes: Array<{
    seq: number;
    deviceId: string;
    entityType: string;
    entityId: string;
    action: string;
    payload: any;
    version: number;
    timestamp: number;
  }>;
  latestSeq: number;
  hasMore: boolean;
  serverTime: number;
  error?: string;
}

export class SyncService {
  /**
   * Đăng ký hoặc cập nhật thông tin thiết bị đang kết nối
   */
  public registerDevice(userId: string, deviceId: string, deviceName = 'Thiết bị di động', platform = 'android'): void {
    const now = Date.now();
    db.prepare(`
      INSERT INTO sync_devices (device_id, user_id, device_name, platform, last_sync_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(device_id) DO UPDATE SET
        user_id = excluded.user_id,
        device_name = excluded.device_name,
        platform = excluded.platform,
        last_sync_at = excluded.last_sync_at
    `).run(deviceId, userId, deviceName, platform, now, now);
  }

  /**
   * Lấy số sequence mới nhất trên Server cho một user
   */
  public getLatestServerSeq(userId: string): number {
    const row = db.prepare('SELECT MAX(seq) as maxSeq FROM sync_changelog WHERE user_id = ?').get(userId) as any;
    return row?.maxSeq || 0;
  }

  /**
   * Xử lý gói dữ liệu gửi lên từ Client (Push batch)
   */
  public handlePush(userId: string, deviceId: string, items: SyncMutationItem[]): SyncPushResult {
    const now = Date.now();
    const syncedIds: string[] = [];
    const conflicts: any[] = [];
    let processedCount = 0;

    // Đăng ký thiết bị
    this.registerDevice(userId, deviceId);

    const checkIdempotent = db.prepare('SELECT seq FROM sync_changelog WHERE idempotency_key = ?');
    const insertChangelog = db.prepare(`
      INSERT INTO sync_changelog (user_id, device_id, entity_type, entity_id, action, payload_json, idempotency_key, version, timestamp, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Thực hiện trong SQLite Transaction để đảm bảo tính toàn vẹn (ACID)
    const runTransaction = db.transaction(() => {
      for (const item of items) {
        if (!item.idempotencyKey || !item.entityType || !item.entityId) {
          continue;
        }

        // 1. Kiểm tra Idempotency - Không xử lý trùng lặp
        const existing = checkIdempotent.get(item.idempotencyKey) as any;
        if (existing) {
          syncedIds.push(item.id);
          continue;
        }

        // 2. Phân loại và áp dụng thay đổi vào các bảng nghiệp vụ tương ứng
        try {
          this.applyMutationToDatabase(userId, item);
          processedCount++;
          syncedIds.push(item.id);

          // 3. Ghi vào Changelog để các thiết bị khác nhận được
          insertChangelog.run(
            userId,
            deviceId,
            item.entityType,
            item.entityId,
            item.action,
            JSON.stringify(item.payload || {}),
            item.idempotencyKey,
            item.version || 1,
            item.timestamp || now,
            now
          );
        } catch (err: any) {
          console.error(`Lỗi áp dụng sync mutation (${item.entityType}/${item.entityId}):`, err.message);
          // Ghi nhận xung đột nếu có
          db.prepare(`
            INSERT INTO sync_conflicts (id, user_id, device_id, entity_type, entity_id, client_payload_json, server_payload_json, conflict_reason, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
          `).run(
            `conf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            userId,
            deviceId,
            item.entityType,
            item.entityId,
            JSON.stringify(item.payload || {}),
            '{}',
            err.message || 'Lỗi áp dụng mutation',
            now
          );
        }
      }

      // Cập nhật last_sync_seq cho thiết bị
      const maxSeq = this.getLatestServerSeq(userId);
      db.prepare('UPDATE sync_devices SET last_sync_seq = ?, last_sync_at = ? WHERE device_id = ?').run(maxSeq, now, deviceId);
    });

    try {
      runTransaction();
      return {
        success: true,
        processedCount,
        syncedIds,
        latestSeq: this.getLatestServerSeq(userId),
        serverTime: now,
        conflicts: conflicts.length > 0 ? conflicts : undefined
      };
    } catch (e: any) {
      return {
        success: false,
        processedCount: 0,
        syncedIds: [],
        latestSeq: this.getLatestServerSeq(userId),
        serverTime: now,
        error: e.message || 'Lỗi transaction đồng bộ'
      };
    }
  }

  /**
   * Áp dụng từng thay đổi cụ thể vào bảng SQLite nghiệp vụ với quy tắc chống ghi đè tiêu cực
   */
  private applyMutationToDatabase(userId: string, item: SyncMutationItem): void {
    const { entityType, entityId, action, payload } = item;
    const now = Date.now();

    switch (entityType) {
      case 'profile': {
        // Cập nhật hồ sơ học viên theo quy tắc Last-Write-Wins hoặc merge
        const existing = db.prepare('SELECT id, updated_at FROM learner_profile WHERE id = ?').get(userId) as any;
        if (existing) {
          db.prepare(`
            UPDATE learner_profile SET
              current_hsk = COALESCE(?, current_hsk),
              target_hsk = COALESCE(?, target_hsk),
              total_study_minutes = MAX(total_study_minutes, COALESCE(?, total_study_minutes)),
              vocab_breadth_score = COALESCE(?, vocab_breadth_score),
              grammar_accuracy_score = COALESCE(?, grammar_accuracy_score),
              listening_score = COALESCE(?, listening_score),
              reading_score = COALESCE(?, reading_score),
              writing_score = COALESCE(?, writing_score),
              fluency_score = COALESCE(?, fluency_score),
              updated_at = ?
            WHERE id = ?
          `).run(
            payload.currentHsk,
            payload.targetHsk,
            payload.totalStudyMinutes,
            payload.vocabBreadthScore,
            payload.grammarAccuracyScore,
            payload.listeningScore,
            payload.readingScore,
            payload.writingScore,
            payload.fluencyScore,
            now,
            userId
          );
        } else {
          db.prepare(`
            INSERT INTO learner_profile (id, name, current_hsk, target_hsk, total_study_minutes, created_at, updated_at, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            userId,
            payload.name || 'Học viên',
            payload.currentHsk || 1,
            payload.targetHsk || 3,
            payload.totalStudyMinutes || 0,
            now,
            now,
            userId
          );
        }
        break;
      }

      case 'srs_item': {
        if (action === 'delete') {
          db.prepare('UPDATE srs_items SET is_deleted = 1, deleted_at = ? WHERE id = ? AND user_id = ?').run(now, entityId, userId);
          return;
        }
        db.prepare(`
          INSERT INTO srs_items (
            id, item_type, reference_id, unique_key, hsk_level,
            prompt_zh, prompt_pinyin, prompt_vi, extra_data_json,
            ease_factor, interval_days, repetition_count, streak, lapses,
            last_reviewed_at, next_review_at, mastery_level, status,
            created_at, updated_at, user_id, is_deleted
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
          ON CONFLICT(id) DO UPDATE SET
            ease_factor = excluded.ease_factor,
            interval_days = excluded.interval_days,
            repetition_count = excluded.repetition_count,
            streak = excluded.streak,
            lapses = excluded.lapses,
            last_reviewed_at = excluded.last_reviewed_at,
            next_review_at = excluded.next_review_at,
            mastery_level = excluded.mastery_level,
            updated_at = excluded.updated_at,
            is_deleted = 0
        `).run(
          entityId,
          payload.itemType || 'vocabulary',
          payload.referenceId || entityId,
          payload.uniqueKey || `srs_${userId}_${entityId}`,
          payload.hskLevel || 1,
          payload.promptZh || '',
          payload.promptPinyin || '',
          payload.promptVi || '',
          JSON.stringify(payload.extraData || {}),
          payload.easeFactor ?? 2.5,
          payload.intervalDays ?? 0,
          payload.repetitionCount ?? 0,
          payload.streak ?? 0,
          payload.lapses ?? 0,
          payload.lastReviewedAt || now,
          payload.nextReviewAt || now,
          payload.masteryLevel || 'introduced',
          payload.status || 'active',
          payload.createdAt || now,
          now,
          userId
        );
        break;
      }

      case 'srs_review': {
        // Luôn ghi nhận lịch sử ôn tập (Append-only)
        db.prepare(`
          INSERT INTO srs_review_logs (
            item_id, session_id, review_mode, quality, user_rating,
            user_answer, is_correct, old_interval, new_interval,
            old_ease_factor, new_ease_factor, duration_ms, reviewed_at, user_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          payload.itemId,
          payload.sessionId || null,
          payload.reviewMode || 'flashcard',
          payload.quality ?? 4,
          payload.userRating || 'good',
          payload.userAnswer || null,
          payload.isCorrect ? 1 : 0,
          payload.oldInterval || 0,
          payload.newInterval || 1,
          payload.oldEaseFactor || 2.5,
          payload.newEaseFactor || 2.5,
          payload.durationMs || 0,
          payload.reviewedAt || now,
          userId
        );
        break;
      }

      case 'vocab': {
        if (action === 'delete') {
          db.prepare('UPDATE vocabulary_memory SET is_deleted = 1, deleted_at = ? WHERE (simplified = ? OR id = ?) AND user_id = ?').run(now, payload.simplified, entityId, userId);
          return;
        }
        db.prepare(`
          INSERT INTO vocabulary_memory (
            simplified, traditional, pinyin, meaning_vi, word_type,
            hsk_level, first_taught_at, last_reviewed_at, review_count,
            mastery_level, notes, user_id, is_deleted
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
          ON CONFLICT(simplified) DO UPDATE SET
            meaning_vi = excluded.meaning_vi,
            pinyin = excluded.pinyin,
            last_reviewed_at = excluded.last_reviewed_at,
            review_count = vocabulary_memory.review_count + 1,
            mastery_level = excluded.mastery_level,
            is_deleted = 0
        `).run(
          payload.simplified,
          payload.traditional || payload.simplified,
          payload.pinyin,
          payload.meaningVi,
          payload.wordType || 'từ vựng',
          payload.hskLevel || 1,
          payload.firstTaughtAt || now,
          payload.lastReviewedAt || now,
          payload.reviewCount || 1,
          payload.masteryLevel || 'introduced',
          payload.notes || null,
          userId
        );
        break;
      }

      case 'evidence': {
        // NGUYÊN TẮC BẢO TOÀN: Learning Evidence là Append-Only, không ghi đè!
        const existingEvidence = db.prepare('SELECT id FROM learner_evidence_ledger WHERE id = ?').get(entityId);
        if (!existingEvidence) {
          const targetType = payload.targetType || 'vocabulary';
          const targetKey = payload.targetKey || payload.knowledgeId || `key_${entityId}`;
          const claimSummary = payload.claimSummary || payload.action || 'Quan sát học tập tương tác';
          const evidenceQuote = payload.evidenceQuote || JSON.stringify(payload.observedData || { timestamp: now });
          const sourceActivity = payload.sourceActivity || payload.sourceModule || 'offline_practice';

          db.prepare(`
            INSERT INTO learner_evidence_ledger (
              id, target_type, target_key, claim_summary, evidence_quote,
              source_activity, source_session_id, observation_count, confidence_score,
              mastery_stage, status, last_observed_at, created_at, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            entityId,
            targetType,
            targetKey,
            claimSummary,
            evidenceQuote,
            sourceActivity,
            payload.sourceSessionId || null,
            payload.observationCount || 1,
            payload.confidenceScore || 0.8,
            payload.masteryStage || 'practicing',
            payload.status || 'active',
            payload.lastObservedAt || now,
            payload.createdAt || now,
            userId
          );
        }
        break;
      }

      case 'chat_session': {
        db.prepare(`
          INSERT INTO chat_sessions (
            id, mode, hsk_level, title, scenario, created_at, updated_at, user_id, is_deleted
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            updated_at = excluded.updated_at,
            is_deleted = 0
        `).run(
          entityId,
          payload.mode || 'free',
          payload.hskLevel || 1,
          payload.title || 'Hội thoại tiếng Trung',
          payload.scenario || null,
          payload.createdAt || now,
          payload.updatedAt || now,
          userId
        );
        break;
      }

      case 'chat_message': {
        db.prepare(`
          INSERT INTO chat_messages (
            id, session_id, sender, text, pinyin, translation_vi, correction_json, is_audio, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO NOTHING
        `).run(
          entityId,
          payload.sessionId,
          payload.sender || 'user',
          payload.text,
          payload.pinyin || null,
          payload.translationVi || null,
          payload.correctionJson || null,
          payload.isAudio ? 1 : 0,
          payload.createdAt || now
        );
        break;
      }

      case 'placement': {
        // Lưu trữ kết quả Placement Test
        db.prepare(`
          INSERT INTO placement_results (
            id, test_id, overall_score, estimated_hsk, confidence_level,
            skill_scores_json, strengths_json, weaknesses_json,
            knowledge_breakdown_json, recommendations_json, synced_to_profile, created_at, user_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(test_id) DO UPDATE SET
            overall_score = excluded.overall_score,
            estimated_hsk = excluded.estimated_hsk,
            synced_to_profile = excluded.synced_to_profile
        `).run(
          entityId,
          payload.testId || entityId,
          payload.overallScore || 0,
          payload.estimatedHsk || 1,
          payload.confidenceLevel || 'high',
          JSON.stringify(payload.skillScores || {}),
          JSON.stringify(payload.strengths || []),
          JSON.stringify(payload.weaknesses || []),
          JSON.stringify(payload.knowledgeBreakdown || { mastered: [], weakGaps: [] }),
          JSON.stringify(payload.recommendations || []),
          payload.syncedToProfile ? 1 : 0,
          payload.createdAt || now,
          userId
        );
        break;
      }

      case 'pronunciation': {
        db.prepare(`
          INSERT INTO pronunciation_records (
            id, user_id, target_text, target_pinyin, target_type, mode,
            spoken_transcript, score, is_match, audio_duration_ms, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO NOTHING
        `).run(
          entityId,
          userId,
          payload.targetText,
          payload.targetPinyin,
          payload.targetType || 'word',
          payload.mode || 'pinyin',
          payload.spokenTranscript || '',
          payload.score || 0,
          payload.isMatch ? 1 : 0,
          payload.audioDurationMs || 0,
          payload.createdAt || now
        );
        break;
      }

      case 'shadowing': {
        db.prepare(`
          INSERT INTO shadowing_practice_records (
            id, lesson_id, user_id, mode, practice_step,
            completed_chunks_count, total_chunks_count, speed_used,
            score, fluency_score, accuracy_score, transcript, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO NOTHING
        `).run(
          entityId,
          payload.lessonId,
          userId,
          payload.mode || 'echo',
          payload.practiceStep || 1,
          payload.completedChunksCount || 0,
          payload.totalChunksCount || 0,
          payload.speedUsed || 1.0,
          payload.score || 0,
          payload.fluencyScore || 0,
          payload.accuracyScore || 0,
          payload.transcript || '',
          payload.createdAt || now
        );
        break;
      }

      case 'history': {
        db.prepare(`
          INSERT INTO learning_history (
            date, activity_type, score, duration_seconds, created_at, user_id
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          payload.date || new Date().toISOString().split('T')[0],
          payload.activityType || 'offline_practice',
          payload.score || 100,
          payload.durationSeconds || 0,
          payload.createdAt || now,
          userId
        );
        break;
      }
    }
  }

  /**
   * Kéo thay đổi từ Server về Client (Pull changes)
   */
  public handlePull(userId: string, deviceId: string, sinceSeq = 0, limit = 100): SyncPullResult {
    const now = Date.now();
    try {
      const rows = db.prepare(`
        SELECT seq, device_id as deviceId, entity_type as entityType, entity_id as entityId,
               action, payload_json, version, timestamp
        FROM sync_changelog
        WHERE user_id = ? AND seq > ? AND device_id != ?
        ORDER BY seq ASC
        LIMIT ?
      `).all(userId, sinceSeq, deviceId, limit) as any[];

      const changes = rows.map((r) => ({
        seq: r.seq,
        deviceId: r.deviceId,
        entityType: r.entityType,
        entityId: r.entityId,
        action: r.action,
        payload: JSON.parse(r.payload_json || '{}'),
        version: r.version,
        timestamp: r.timestamp
      }));

      const latestSeq = this.getLatestServerSeq(userId);
      const hasMore = rows.length === limit;

      return {
        success: true,
        changes,
        latestSeq,
        hasMore,
        serverTime: now
      };
    } catch (e: any) {
      return {
        success: false,
        changes: [],
        latestSeq: 0,
        hasMore: false,
        serverTime: now,
        error: e.message || 'Lỗi kéo thay đổi từ Server'
      };
    }
  }

  /**
   * Lấy trạng thái đồng bộ của user và thiết bị
   */
  public getStatus(userId: string, deviceId: string) {
    const now = Date.now();
    const latestSeq = this.getLatestServerSeq(userId);
    const device = db.prepare('SELECT last_sync_seq, last_sync_at FROM sync_devices WHERE device_id = ? AND user_id = ?').get(deviceId, userId) as any;
    const pendingPullCount = db.prepare(`
      SELECT count(*) as count FROM sync_changelog
      WHERE user_id = ? AND seq > ? AND device_id != ?
    `).get(userId, device?.last_sync_seq || 0, deviceId) as any;

    return {
      success: true,
      latestSeq,
      deviceLastSeq: device?.last_sync_seq || 0,
      lastSyncAt: device?.last_sync_at || null,
      pendingPullCount: pendingPullCount?.count || 0,
      serverTime: now
    };
  }

  /**
   * Lấy danh sách xung đột dữ liệu chưa giải quyết
   */
  public getConflicts(userId: string) {
    const rows = db.prepare("SELECT * FROM sync_conflicts WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC").all(userId) as any[];
    return rows.map(r => ({
      ...r,
      clientPayload: JSON.parse(r.client_payload_json || '{}'),
      serverPayload: JSON.parse(r.server_payload_json || '{}')
    }));
  }

  /**
   * Giải quyết xung đột
   */
  public resolveConflict(conflictId: string, resolution: 'client' | 'server' | 'merge', mergedPayload?: any): boolean {
    const conflict = db.prepare('SELECT * FROM sync_conflicts WHERE id = ?').get(conflictId) as any;
    if (!conflict) return false;

    const now = Date.now();
    if (resolution === 'client') {
      let clientData = {};
      try {
        clientData = JSON.parse(conflict.client_payload_json || '{}');
      } catch {
        clientData = {};
      }
      this.applyMutationToDatabase(conflict.user_id, {
        id: `res_${conflictId}`,
        entityType: conflict.entity_type,
        entityId: conflict.entity_id,
        action: 'update',
        payload: clientData,
        timestamp: now,
        idempotencyKey: `res_${conflictId}_${now}`
      });
    } else if (resolution === 'merge' && mergedPayload) {
      this.applyMutationToDatabase(conflict.user_id, {
        id: `res_${conflictId}`,
        entityType: conflict.entity_type,
        entityId: conflict.entity_id,
        action: 'update',
        payload: mergedPayload,
        timestamp: now,
        idempotencyKey: `res_${conflictId}_${now}`
      });
    }

    db.prepare(`
      UPDATE sync_conflicts SET status = ?, resolution_notes = ?, resolved_at = ?
      WHERE id = ?
    `).run(`resolved_${resolution}`, `Giải quyết theo lựa chọn: ${resolution}`, now, conflictId);

    return true;
  }
}

export const syncService = new SyncService();
