/**
 * Authentication and Multi-User Management Service (v3.0.0)
 * 
 * Provides:
 * 1. Secure password hashing using Node.js native crypto scrypt with unique salt
 * 2. Constant-time password verification (timingSafeEqual)
 * 3. Bootstrap Admin account ('admin' / '123456a@B') with forced password change on first login
 * 4. Rate-limiting and brute-force protection (lockout after 5 failed attempts)
 * 5. Session token management with SQLite persistence
 * 6. Role-based access control (Admin vs Learner)
 * 7. Legacy data migration (maps all pre-v3 learner records to the Admin account)
 */

import crypto from 'crypto';
import { db } from './db.js';

export type UserRole = 'admin' | 'learner';

export interface UserAccount {
  id: string;
  username: string;
  role: UserRole;
  displayName: string;
  mustChangePassword: boolean;
  status: 'active' | 'disabled';
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number;
}

export interface UserSession {
  token: string;
  userId: string;
  role: UserRole;
  username: string;
  displayName: string;
  mustChangePassword: boolean;
  expiresAt: number;
  createdAt: number;
}

export class AuthService {
  private static instance: AuthService;
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  private constructor() {
    this.initTables();
    this.bootstrapAdmin();
    this.migrateLegacyDataToAdmin();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Khởi tạo các bảng quản lý người dùng, phiên và bảo vệ chống brute-force
   */
  private initTables(): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'learner',
        display_name TEXT NOT NULL,
        must_change_password INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_login_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS user_sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_login_attempts (
        ip_or_user TEXT PRIMARY KEY,
        failed_count INTEGER NOT NULL DEFAULT 0,
        locked_until INTEGER NOT NULL DEFAULT 0,
        last_attempt_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);
    `);
  }

  /**
   * Băm mật khẩu an toàn bằng Scrypt chuẩn bộ nhớ (Memory-hard salt + hash)
   */
  public hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return `scrypt$${salt}$${derivedKey.toString('hex')}`;
  }

  /**
   * Kiểm tra mật khẩu với cơ chế chống tấn công đo lường thời gian (Timing-safe comparison)
   */
  public verifyPassword(password: string, storedHash: string): boolean {
    try {
      const parts = storedHash.split('$');
      if (parts.length !== 3 || parts[0] !== 'scrypt') {
        return false;
      }
      const salt = parts[1];
      const originalKey = Buffer.from(parts[2], 'hex');
      const derivedKey = crypto.scryptSync(password, salt, 64);
      return crypto.timingSafeEqual(originalKey, derivedKey);
    } catch {
      return false;
    }
  }

  /**
   * Khởi tạo tài khoản Admin mặc định ban đầu nếu chưa tồn tại
   * Thông tin chỉ định: username: "admin", mật khẩu ban đầu: "123456a@B"
   */
  private bootstrapAdmin(): void {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin') as any;
    if (!existing) {
      const now = Date.now();
      const initialPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || '123456a@B';
      const hash = this.hashPassword(initialPassword);

      db.prepare(`
        INSERT INTO users (id, username, password_hash, role, display_name, must_change_password, status, created_at, updated_at)
        VALUES (?, ?, ?, 'admin', 'Quản trị viên', 1, 'active', ?, ?)
      `).run('admin', 'admin', hash, now, now);

      console.log('✅ [AuthService] Đã khởi tạo thành công tài khoản Admin mặc định (Yêu cầu đổi mật khẩu ở lần đăng nhập đầu).');
    }
  }

  /**
   * Di trú toàn bộ dữ liệu học tập cũ gán cho tài khoản Admin
   * Đảm bảo không bị mất lịch sử hội thoại, bằng chứng, bài học, thẻ SRS
   */
  private migrateLegacyDataToAdmin(): void {
    const now = Date.now();
    try {
      // Đảm bảo các cột phân vùng user_id tồn tại
      try {
        const chatCols = db.prepare('PRAGMA table_info(chat_sessions)').all() as any[];
        if (!chatCols.some(c => c.name === 'user_id')) {
          db.prepare("ALTER TABLE chat_sessions ADD COLUMN user_id TEXT DEFAULT 'admin'").run();
        }
      } catch {}

      try {
        const eviCols = db.prepare('PRAGMA table_info(learning_evidences)').all() as any[];
        if (!eviCols.some(c => c.name === 'user_id')) {
          db.prepare("ALTER TABLE learning_evidences ADD COLUMN user_id TEXT DEFAULT 'admin'").run();
        }
      } catch {}

      // 1. Hồ sơ học tập learner_profile
      const adminProfile = db.prepare('SELECT id FROM learner_profile WHERE id = ?').get('admin');
      if (!adminProfile) {
        const defaultProfile = db.prepare('SELECT * FROM learner_profile WHERE id = ?').get('default') as any;
        if (defaultProfile) {
          db.prepare(`
            INSERT OR REPLACE INTO learner_profile (
              id, name, current_hsk, target_hsk, learning_goals_json, learning_style,
              speed_preference, strengths_json, weaknesses_json, total_study_minutes,
              created_at, updated_at, vocab_breadth_score, grammar_accuracy_score,
              listening_score, reading_score, writing_score, fluency_score, pedagogic_notes_json
            ) VALUES (
              'admin', 'Quản trị viên (Admin)', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
          `).run(
            defaultProfile.current_hsk || 1,
            defaultProfile.target_hsk || 3,
            defaultProfile.learning_goals_json || '[]',
            defaultProfile.learning_style || 'visual_interactive',
            defaultProfile.speed_preference || 'normal',
            defaultProfile.strengths_json || '[]',
            defaultProfile.weaknesses_json || '[]',
            defaultProfile.total_study_minutes || 0,
            defaultProfile.created_at || now,
            now,
            defaultProfile.vocab_breadth_score || 50,
            defaultProfile.grammar_accuracy_score || 50,
            defaultProfile.listening_score || 50,
            defaultProfile.reading_score || 50,
            defaultProfile.writing_score || 50,
            defaultProfile.fluency_score || 50,
            defaultProfile.pedagogic_notes_json || '[]'
          );
        } else {
          db.prepare(`
            INSERT OR IGNORE INTO learner_profile (
              id, name, current_hsk, target_hsk, learning_style, speed_preference,
              total_study_minutes, created_at, updated_at, vocab_breadth_score,
              grammar_accuracy_score, listening_score, reading_score, writing_score, fluency_score, pedagogic_notes_json
            ) VALUES ('admin', 'Quản trị viên (Admin)', 1, 3, 'balanced', 'normal', 0, ?, ?, 50, 50, 50, 50, 50, 50, '[]')
          `).run(now, now);
        }
      }

      // 2. Gán các bảng hiện có sang tài khoản admin
      try {
        db.prepare("UPDATE chat_sessions SET user_id = 'admin' WHERE user_id IS NULL OR user_id = 'default'").run();
      } catch {}
      try {
        db.prepare("UPDATE learning_evidences SET user_id = 'admin' WHERE user_id IS NULL OR user_id = 'default'").run();
      } catch {}
      try {
        db.prepare("UPDATE mastery_snapshots SET learner_id = 'admin' WHERE learner_id = 'default'").run();
      } catch {}
    } catch (err) {
      console.warn('[AuthService] Di trú dữ liệu sang Admin notice:', err);
    }
  }

  /**
   * Kiểm tra và kiểm soát số lần đăng nhập thất bại (Rate-limiting & Lockout)
   */
  private checkRateLimit(key: string): void {
    const record = db.prepare('SELECT * FROM user_login_attempts WHERE ip_or_user = ?').get(key) as any;
    if (record) {
      const now = Date.now();
      if (record.locked_until > now) {
        const remainingMinutes = Math.ceil((record.locked_until - now) / 60000);
        throw new Error(`Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau ${remainingMinutes} phút.`);
      }
    }
  }

  private recordFailedAttempt(key: string): void {
    const now = Date.now();
    const record = db.prepare('SELECT * FROM user_login_attempts WHERE ip_or_user = ?').get(key) as any;
    if (record) {
      const newCount = record.failed_count + 1;
      const lockUntil = newCount >= this.MAX_FAILED_ATTEMPTS ? now + this.LOCKOUT_DURATION_MS : 0;
      db.prepare(`
        UPDATE user_login_attempts
        SET failed_count = ?, locked_until = ?, last_attempt_at = ?
        WHERE ip_or_user = ?
      `).run(newCount, lockUntil, now, key);
    } else {
      db.prepare(`
        INSERT INTO user_login_attempts (ip_or_user, failed_count, locked_until, last_attempt_at)
        VALUES (?, 1, 0, ?)
      `).run(key, now);
    }
  }

  private resetFailedAttempts(key: string): void {
    db.prepare('DELETE FROM user_login_attempts WHERE ip_or_user = ?').run(key);
  }

  /**
   * Đăng nhập xác thực
   */
  public async login(params: {
    username: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ user: UserAccount; sessionToken: string }> {
    const cleanUsername = params.username.trim().toLowerCase();
    const rateLimitKey = `${cleanUsername}_${params.ipAddress || 'local'}`;

    this.checkRateLimit(rateLimitKey);

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUsername) as any;
    if (!user || user.status !== 'active') {
      this.recordFailedAttempt(rateLimitKey);
      throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác.');
    }

    const isValid = this.verifyPassword(params.password, user.password_hash);
    if (!isValid) {
      this.recordFailedAttempt(rateLimitKey);
      throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác.');
    }

    // Xóa bộ đếm thất bại khi thành công
    this.resetFailedAttempts(rateLimitKey);

    // Tạo Session Token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + this.SESSION_DURATION_MS;

    db.prepare(`
      INSERT INTO user_sessions (token, user_id, expires_at, created_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(sessionToken, user.id, expiresAt, now, params.ipAddress || 'localhost', params.userAgent || '');

    // Cập nhật last_login_at
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, user.id);

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role as UserRole,
        displayName: user.display_name,
        mustChangePassword: Boolean(user.must_change_password),
        status: user.status,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLoginAt: now
      },
      sessionToken
    };
  }

  /**
   * Xác thực Session Token
   */
  public validateSession(token: string): UserSession | null {
    if (!token) return null;

    const row = db.prepare(`
      SELECT s.token, s.user_id, s.expires_at, s.created_at,
             u.username, u.role, u.display_name, u.must_change_password, u.status
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND u.status = 'active'
    `).get(token) as any;

    if (!row) return null;

    if (row.expires_at < Date.now()) {
      this.revokeSession(token);
      return null;
    }

    return {
      token: row.token,
      userId: row.user_id,
      role: row.role as UserRole,
      username: row.username,
      displayName: row.display_name,
      mustChangePassword: Boolean(row.must_change_password),
      expiresAt: row.expires_at,
      createdAt: row.created_at
    };
  }

  /**
   * Thu hồi phiên đăng nhập (Đăng xuất)
   */
  public revokeSession(token: string): void {
    db.prepare('DELETE FROM user_sessions WHERE token = ?').run(token);
  }

  /**
   * Đổi mật khẩu người dùng (Bắt buộc ở lần đầu của Admin hoặc chủ động đổi)
   */
  public changePassword(params: {
    userId: string;
    oldPassword?: string;
    newPassword: string;
    isForced?: boolean;
  }): { success: boolean; message: string } {
    const { userId, oldPassword, newPassword, isForced = false } = params;

    if (!newPassword || newPassword.length < 6) {
      throw new Error('Mật khẩu mới phải có độ dài tối thiểu 6 ký tự.');
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      throw new Error('Không tìm thấy tài khoản người dùng.');
    }

    // Nếu không phải admin reset mà là người dùng tự đổi, bắt buộc kiểm tra mật khẩu cũ
    if (!isForced && oldPassword) {
      const isMatch = this.verifyPassword(oldPassword, user.password_hash);
      if (!isMatch) {
        throw new Error('Mật khẩu hiện tại không chính xác.');
      }
    }

    const newHash = this.hashPassword(newPassword);
    const now = Date.now();

    db.prepare(`
      UPDATE users
      SET password_hash = ?, must_change_password = 0, updated_at = ?
      WHERE id = ?
    `).run(newHash, now, userId);

    return { success: true, message: 'Đổi mật khẩu thành công!' };
  }

  /**
   * Quản lý tài khoản (Dành riêng cho vai trò Admin)
   */
  public createLearner(params: {
    username: string;
    initialPassword?: string;
    displayName: string;
  }): UserAccount {
    const cleanUsername = params.username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      throw new Error('Tên đăng nhập phải có ít nhất 3 ký tự.');
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
    if (existing) {
      throw new Error(`Tên đăng nhập "${cleanUsername}" đã tồn tại trên hệ thống.`);
    }

    const userId = `learner_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const pass = params.initialPassword || 'HaloLearner123@';
    const hash = this.hashPassword(pass);
    const now = Date.now();

    db.prepare(`
      INSERT INTO users (id, username, password_hash, role, display_name, must_change_password, status, created_at, updated_at)
      VALUES (?, ?, ?, 'learner', ?, 1, 'active', ?, ?)
    `).run(userId, cleanUsername, hash, params.displayName.trim() || cleanUsername, now, now);

    // Khởi tạo hồ sơ học tập trống cho Learner mới
    db.prepare(`
      INSERT INTO learner_profile (id, name, current_hsk, target_hsk, learning_style, created_at, updated_at)
      VALUES (?, ?, 1, 3, 'balanced', ?, ?)
    `).run(userId, params.displayName.trim() || cleanUsername, now, now);

    return {
      id: userId,
      username: cleanUsername,
      role: 'learner',
      displayName: params.displayName.trim() || cleanUsername,
      mustChangePassword: true,
      status: 'active',
      createdAt: now,
      updatedAt: now
    };
  }

  public listUsers(): UserAccount[] {
    const rows = db.prepare(`
      SELECT id, username, role, display_name, must_change_password, status, created_at, updated_at, last_login_at
      FROM users
      ORDER BY created_at ASC
    `).all() as any[];

    return rows.map(r => ({
      id: r.id,
      username: r.username,
      role: r.role as UserRole,
      displayName: r.display_name,
      mustChangePassword: Boolean(r.must_change_password),
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      lastLoginAt: r.last_login_at
    }));
  }

  public setUserStatus(userId: string, status: 'active' | 'disabled'): void {
    if (userId === 'admin') {
      throw new Error('Không thể vô hiệu hóa tài khoản Quản trị viên mặc định.');
    }
    db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').run(status, Date.now(), userId);
    if (status === 'disabled') {
      db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(userId);
    }
  }

  public resetUserPassword(userId: string, newPassword?: string): string {
    const pass = newPassword || 'HaloLearner123@';
    const hash = this.hashPassword(pass);
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = ? WHERE id = ?').run(hash, Date.now(), userId);
    return pass;
  }
}

export const authService = AuthService.getInstance();
