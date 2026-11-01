/**
 * Halo Chinese - Client Sync Engine
 * Quản lý hàng đợi đồng bộ cục bộ (Dexie syncQueue), điều phối Push/Pull,
 * xử lý Idempotency, chuyển dữ liệu từ Offline sang Online và tự động phục hồi kết nối.
 */

import { db, type ClientSyncQueueItem } from '../db';
import { connectionManager } from './connectionManager';

export interface SyncEngineStatus {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: number;
  lastPulledSeq: number;
  deviceId: string;
  error?: string;
}

class SyncEngine {
  private isSyncing = false;
  private autoPushTimer: any = null;
  private listeners = new Set<(status: SyncEngineStatus) => void>();

  constructor() {
    this.initAutoSyncListeners();
  }

  private initAutoSyncListeners() {
    // Tự động đồng bộ khi chuyển sang Online hoặc kết nối thành công
    connectionManager.subscribe((state) => {
      if (state === 'authenticated' || state === 'connected') {
        this.schedulePush(1500);
      }
    });
  }

  /**
   * Thêm một sự kiện thay đổi vào hàng đợi Dexie syncQueue
   */
  public async enqueueChange(
    entityType: 'profile' | 'srs_item' | 'srs_review' | 'vocab' | 'grammar' | 'evidence' | 'chat_session' | 'chat_message' | 'placement' | 'pronunciation' | 'shadowing' | 'history',
    entityId: string,
    action: 'create' | 'update' | 'delete',
    payload: any
  ): Promise<string> {
    const deviceId = connectionManager.getDeviceId();
    const now = Date.now();
    const token = typeof window !== 'undefined' ? localStorage.getItem('halo_auth_token') : null;
    const authUserStr = typeof window !== 'undefined' ? localStorage.getItem('halo_auth_user') : null;
    let userId = 'offline_learner';

    if (token && authUserStr) {
      try {
        const u = JSON.parse(authUserStr);
        if (u && u.id) userId = u.id;
      } catch {
        // use offline_learner fallback
      }
    }

    const clientQueueId = `q_${now}_${Math.random().toString(36).substring(2, 8)}`;
    const idempotencyKey = `${deviceId}:${entityType}:${entityId}:${now}_${Math.random().toString(36).substring(2, 6)}`;

    const item: ClientSyncQueueItem = {
      clientQueueId,
      userId,
      deviceId,
      entityType,
      entityId: String(entityId),
      action,
      payload,
      timestamp: now,
      version: 1,
      status: 'pending',
      idempotencyKey,
    };

    try {
      await db.syncQueue.add(item);
      this.notifyListeners();

      // Nếu đang ở chế độ Online, hẹn giờ tự động đẩy sau 2 giây (debounced)
      if (connectionManager.getMode() === 'online') {
        this.schedulePush(2000);
      }
    } catch (err: any) {
      console.error('Lỗi thêm vào Dexie syncQueue:', err);
    }

    return clientQueueId;
  }

  /**
   * Lấy số lượng bản ghi đang chờ đồng bộ
   */
  public async getPendingCount(): Promise<number> {
    try {
      return await db.syncQueue
        .where('status')
        .equals('pending')
        .or('status')
        .equals('failed')
        .count();
    } catch {
      return 0;
    }
  }

  /**
   * Lấy danh sách các bản ghi trong hàng đợi
   */
  public async getQueueItems(limit = 100): Promise<ClientSyncQueueItem[]> {
    try {
      return await db.syncQueue
        .orderBy('timestamp')
        .reverse()
        .limit(limit)
        .toArray();
    } catch {
      return [];
    }
  }

  /**
   * Hẹn giờ tự động đẩy dữ liệu lên Server
   */
  public schedulePush(delayMs = 2000) {
    if (this.autoPushTimer) clearTimeout(this.autoPushTimer);
    this.autoPushTimer = setTimeout(() => {
      this.pushChanges().catch(console.error);
    }, delayMs);
  }

  /**
   * Đẩy toàn bộ thay đổi đang chờ lên Server (Push)
   */
  public async pushChanges(): Promise<{ success: boolean; pushedCount: number; error?: string }> {
    if (this.isSyncing) {
      return { success: false, pushedCount: 0, error: 'Đang trong tiến trình đồng bộ khác' };
    }

    if (connectionManager.getMode() === 'offline') {
      return { success: false, pushedCount: 0, error: 'Đang ở chế độ Offline' };
    }

    const cfg = connectionManager.getServerConfig();
    const token = typeof window !== 'undefined' ? localStorage.getItem('halo_auth_token') : null;
    const authUserStr = typeof window !== 'undefined' ? localStorage.getItem('halo_auth_user') : null;

    if (!token) {
      return { success: false, pushedCount: 0, error: 'Chưa đăng nhập tài khoản Server' };
    }

    let currentUserId = 'learner';
    if (authUserStr) {
      try {
        const u = JSON.parse(authUserStr);
        if (u && u.id) currentUserId = u.id;
      } catch {
        // fallback
      }
    }

    // Lấy các item cần sync
    const pendingItems = await db.syncQueue
      .where('status')
      .equals('pending')
      .or('status')
      .equals('failed')
      .limit(50)
      .toArray();

    if (pendingItems.length === 0) {
      return { success: true, pushedCount: 0 };
    }

    this.isSyncing = true;
    connectionManager.setState('syncing');
    this.notifyListeners();

    try {
      // Chuẩn hóa item trước khi gửi: Nếu item tạo khi Offline ('offline_learner'),
      // liên kết an toàn vào tài khoản đang đăng nhập hiện tại
      const payloadItems = pendingItems.map((item) => ({
        id: item.clientQueueId,
        entityType: item.entityType,
        entityId: item.entityId,
        action: item.action,
        payload: item.payload,
        timestamp: item.timestamp,
        version: item.version,
        idempotencyKey: item.idempotencyKey,
      }));

      const res = await fetch(`${cfg.baseUrl}/api/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          deviceId: connectionManager.getDeviceId(),
          items: payloadItems
        })
      });

      if (!res.ok) {
        throw new Error(`Server trả lỗi HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data.success && Array.isArray(data.syncedIds)) {
        // Đánh dấu các item đã đồng bộ thành công
        const syncedSet = new Set<string>(data.syncedIds);
        await db.transaction('rw', db.syncQueue, db.syncMeta, async () => {
          for (const item of pendingItems) {
            if (syncedSet.has(item.clientQueueId) && item.id) {
              await db.syncQueue.delete(item.id);
            }
          }
          await db.syncMeta.put({ key: 'lastSyncAt', value: data.serverTime || Date.now() });
          if (data.latestSeq) {
            await db.syncMeta.put({ key: 'lastPushSeq', value: data.latestSeq });
          }
        });

        connectionManager.setState('synced');
        this.isSyncing = false;
        this.notifyListeners();
        return { success: true, pushedCount: data.syncedIds.length };
      } else {
        throw new Error(data.error || 'Server không xác nhận gói đồng bộ');
      }
    } catch (err: any) {
      this.isSyncing = false;
      connectionManager.setState('sync_error');
      this.notifyListeners();
      return { success: false, pushedCount: 0, error: err.message };
    }
  }

  /**
   * Kéo thay đổi mới từ Server về áp dụng vào thiết bị cục bộ (Pull)
   */
  public async pullChanges(): Promise<{ success: boolean; pulledCount: number; error?: string }> {
    if (this.isSyncing) {
      return { success: false, pulledCount: 0, error: 'Đang trong tiến trình đồng bộ khác' };
    }

    if (connectionManager.getMode() === 'offline') {
      return { success: false, pulledCount: 0, error: 'Đang ở chế độ Offline' };
    }

    const cfg = connectionManager.getServerConfig();
    const token = typeof window !== 'undefined' ? localStorage.getItem('halo_auth_token') : null;

    if (!token) {
      return { success: false, pulledCount: 0, error: 'Chưa đăng nhập tài khoản Server' };
    }

    // Lấy số seq đã kéo gần nhất từ Dexie syncMeta
    const metaSeq = await db.syncMeta.get('lastPulledSeq');
    const sinceSeq = (metaSeq && typeof metaSeq.value === 'number') ? metaSeq.value : 0;
    const deviceId = connectionManager.getDeviceId();

    this.isSyncing = true;
    connectionManager.setState('syncing');
    this.notifyListeners();

    try {
      const res = await fetch(
        `${cfg.baseUrl}/api/sync/pull?sinceSeq=${sinceSeq}&limit=100&deviceId=${encodeURIComponent(deviceId)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!res.ok) {
        throw new Error(`Server trả lỗi HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data.success && Array.isArray(data.changes)) {
        let appliedCount = 0;

        // Áp dụng các thay đổi từ thiết bị khác vào Dexie
        await db.transaction('rw', [db.srsCards, db.vocabularies, db.syncMeta], async () => {
          for (const change of data.changes) {
            // Chỉ áp dụng thay đổi từ thiết bị khác (chống lặp lại chính mình)
            if (change.deviceId === deviceId) continue;

            const payload = change.payload;
            if (change.entityType === 'srs_item' && payload) {
              const existing = await db.srsCards.where('vocabId').equals(Number(change.entityId) || 0).first();
              if (existing) {
                await db.srsCards.update(existing.id!, {
                  easeFactor: payload.easeFactor || existing.easeFactor,
                  interval: payload.intervalDays || payload.interval || existing.interval,
                  repetition: payload.repetitionCount || payload.repetition || existing.repetition,
                  nextReviewDate: typeof payload.nextReviewAt === 'string' ? payload.nextReviewAt : (payload.nextReviewDate || existing.nextReviewDate),
                  status: payload.status || existing.status
                });
              }
              appliedCount++;
            }
          }

          // Cập nhật lastPulledSeq
          await db.syncMeta.put({ key: 'lastPulledSeq', value: data.latestSeq });
          await db.syncMeta.put({ key: 'lastSyncAt', value: data.serverTime || Date.now() });
        });

        connectionManager.setState('synced');
        this.isSyncing = false;
        this.notifyListeners();
        return { success: true, pulledCount: appliedCount };
      } else {
        throw new Error(data.error || 'Lỗi dữ liệu kéo từ Server');
      }
    } catch (err: any) {
      this.isSyncing = false;
      connectionManager.setState('sync_error');
      this.notifyListeners();
      return { success: false, pulledCount: 0, error: err.message };
    }
  }

  /**
   * Thực hiện đồng bộ 2 chiều toàn diện (Push -> Pull)
   */
  public async syncAll(): Promise<{ success: boolean; pushed: number; pulled: number; error?: string }> {
    const pushResult = await this.pushChanges();
    if (!pushResult.success && pushResult.error?.includes('Chưa đăng nhập')) {
      return { success: false, pushed: 0, pulled: 0, error: pushResult.error };
    }

    const pullResult = await this.pullChanges();
    return {
      success: pushResult.success && pullResult.success,
      pushed: pushResult.pushedCount,
      pulled: pullResult.pulledCount,
      error: pushResult.error || pullResult.error
    };
  }

  /**
   * Lấy thông tin tóm tắt tình trạng đồng bộ
   */
  public async getStatus(): Promise<SyncEngineStatus> {
    const pendingCount = await this.getPendingCount();
    const metaSyncAt = await db.syncMeta.get('lastSyncAt');
    const metaSeq = await db.syncMeta.get('lastPulledSeq');

    return {
      isSyncing: this.isSyncing,
      pendingCount,
      lastSyncAt: metaSyncAt ? metaSyncAt.value : 0,
      lastPulledSeq: metaSeq ? metaSeq.value : 0,
      deviceId: connectionManager.getDeviceId()
    };
  }

  /**
   * Đăng ký lắng nghe biến động hàng đợi
   */
  public subscribe(listener: (status: SyncEngineStatus) => void): () => void {
    this.listeners.add(listener);
    this.getStatus().then(listener);
    return () => this.listeners.delete(listener);
  }

  private async notifyListeners() {
    const status = await this.getStatus();
    for (const l of this.listeners) {
      try {
        l(status);
      } catch (e) {
        console.error('Lỗi listener syncEngine:', e);
      }
    }
  }

  /**
   * Xóa sạch các mục đã sync hoặc hủy hàng đợi
   */
  public async clearQueue(): Promise<void> {
    await db.syncQueue.clear();
    this.notifyListeners();
  }
}

export const syncEngine = new SyncEngine();
