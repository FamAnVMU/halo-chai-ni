/**
 * Halo Chinese - Client Local Data Backup & Export/Import Utility
 * Cho phép người dùng xuất toàn bộ dữ liệu học tập cục bộ (Dexie IndexedDB)
 * thành gói sao lưu JSON an toàn và nhập lại khi cài lại máy hoặc chuyển thiết bị.
 */

import { db } from '../db';
import { connectionManager } from './connectionManager';

export interface LocalBackupPackage {
  manifest: {
    app: 'Halo Chinese';
    appVersion: string;
    schemaVersion: number;
    exportedAt: number;
    exportedAtIso: string;
    deviceId: string;
    tableCounts: Record<string, number>;
  };
  data: {
    users: any[];
    vocabularies: any[];
    srsCards: any[];
    grammarRules: any[];
    lessons: any[];
    aiSessions: any[];
    aiMemory: any[];
    dailyStats: any[];
    syncQueue: any[];
    stories?: any[];
    listening?: any[];
    offlineProfiles?: any[];
  };
}

export class LocalDataBackupManager {
  /**
   * Xuất toàn bộ dữ liệu học tập cục bộ thành gói sao lưu JSON
   */
  public static async exportBackupPackage(): Promise<{ success: boolean; filename: string; blob?: Blob; error?: string }> {
    try {
      const users = await db.users.toArray();
      const vocabularies = await db.vocabularies.toArray();
      const srsCards = await db.srsCards.toArray();
      const grammarRules = await db.grammarRules.toArray();
      const lessons = await db.lessons.toArray();
      const aiSessions = await db.aiSessions.toArray();
      const aiMemory = await db.aiMemory.toArray();
      const dailyStats = await db.dailyStats.toArray();
      const syncQueue = await db.syncQueue.toArray();
      const stories = await db.stories.toArray();
      const listening = await db.listening.toArray();
      const offlineProfiles = await db.offlineProfiles.toArray();

      const timestamp = Date.now();
      const dateStr = new Date(timestamp).toISOString().split('T')[0];
      const filename = `HaloChinese_Backup_${dateStr}_${timestamp}.json`;

      const backupPackage: LocalBackupPackage = {
        manifest: {
          app: 'Halo Chinese',
          appVersion: '3.2.1',
          schemaVersion: 5,
          exportedAt: timestamp,
          exportedAtIso: new Date(timestamp).toISOString(),
          deviceId: connectionManager.getDeviceId(),
          tableCounts: {
            users: users.length,
            vocabularies: vocabularies.length,
            srsCards: srsCards.length,
            grammarRules: grammarRules.length,
            lessons: lessons.length,
            aiSessions: aiSessions.length,
            aiMemory: aiMemory.length,
            dailyStats: dailyStats.length,
            syncQueue: syncQueue.length,
            stories: stories.length,
            listening: listening.length,
            offlineProfiles: offlineProfiles.length,
          }
        },
        data: {
          users,
          vocabularies,
          srsCards,
          grammarRules,
          lessons,
          aiSessions,
          aiMemory,
          dailyStats,
          syncQueue,
          stories,
          listening,
          offlineProfiles,
        }
      };

      const jsonStr = JSON.stringify(backupPackage, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });

      // Kích hoạt tải về tự động trên trình duyệt / thiết bị di động
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      return { success: true, filename, blob };
    } catch (err: any) {
      return { success: false, filename: '', error: err.message };
    }
  }

  /**
   * Nhập dữ liệu học tập từ file JSON sao lưu vào Dexie
   */
  public static async importBackupPackage(jsonString: string): Promise<{
    success: boolean;
    importedCounts: Record<string, number>;
    message: string;
  }> {
    try {
      const parsed = JSON.parse(jsonString) as LocalBackupPackage;
      if (!parsed.manifest || parsed.manifest.app !== 'Halo Chinese' || !parsed.data) {
        throw new Error('Định dạng file sao lưu không hợp lệ. Vui lòng chọn đúng file HaloChinese_Backup_*.json');
      }

      const { data } = parsed;
      const counts: Record<string, number> = {};

      await db.transaction(
        'rw',
        [db.users, db.vocabularies, db.srsCards, db.grammarRules, db.lessons, db.aiSessions, db.aiMemory, db.dailyStats, db.syncQueue, db.stories, db.listening, db.offlineProfiles],
        async () => {
          if (Array.isArray(data.users) && data.users.length > 0) {
            await db.users.bulkPut(data.users);
            counts.users = data.users.length;
          }
          if (Array.isArray(data.vocabularies) && data.vocabularies.length > 0) {
            await db.vocabularies.bulkPut(data.vocabularies);
            counts.vocabularies = data.vocabularies.length;
          }
          if (Array.isArray(data.srsCards) && data.srsCards.length > 0) {
            await db.srsCards.bulkPut(data.srsCards);
            counts.srsCards = data.srsCards.length;
          }
          if (Array.isArray(data.grammarRules) && data.grammarRules.length > 0) {
            await db.grammarRules.bulkPut(data.grammarRules);
            counts.grammarRules = data.grammarRules.length;
          }
          if (Array.isArray(data.lessons) && data.lessons.length > 0) {
            await db.lessons.bulkPut(data.lessons);
            counts.lessons = data.lessons.length;
          }
          if (Array.isArray(data.aiSessions) && data.aiSessions.length > 0) {
            await db.aiSessions.bulkPut(data.aiSessions);
            counts.aiSessions = data.aiSessions.length;
          }
          if (Array.isArray(data.aiMemory) && data.aiMemory.length > 0) {
            await db.aiMemory.bulkPut(data.aiMemory);
            counts.aiMemory = data.aiMemory.length;
          }
          if (Array.isArray(data.dailyStats) && data.dailyStats.length > 0) {
            await db.dailyStats.bulkPut(data.dailyStats);
            counts.dailyStats = data.dailyStats.length;
          }
          if (Array.isArray(data.stories) && data.stories.length > 0) {
            await db.stories.bulkPut(data.stories);
            counts.stories = data.stories.length;
          }
          if (Array.isArray(data.listening) && data.listening.length > 0) {
            await db.listening.bulkPut(data.listening);
            counts.listening = data.listening.length;
          }
          if (Array.isArray(data.offlineProfiles) && data.offlineProfiles.length > 0) {
            await db.offlineProfiles.bulkPut(data.offlineProfiles);
            counts.offlineProfiles = data.offlineProfiles.length;
          }
        }
      );

      return {
        success: true,
        importedCounts: counts,
        message: `Khôi phục dữ liệu thành công! Đã nạp lại ${counts.srsCards || 0} thẻ SRS, ${counts.vocabularies || 0} từ vựng và tiến độ học tập.`
      };
    } catch (err: any) {
      return {
        success: false,
        importedCounts: {},
        message: `Lỗi khôi phục: ${err.message}`
      };
    }
  }
}
