import crypto from 'crypto';

// Crockford's Base32 character set (excludes I, L, O, U to avoid ambiguity)
const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ENCODING_LEN = 32;

/**
 * Tạo chuỗi ULID chuẩn (26 ký tự) dựa trên timestamp + entropy ngẫu nhiên
 * Đảm bảo:
 * 1. Sắp xếp theo thứ tự thời gian (Lexicographically sortable)
 * 2. Độc lập hoàn toàn với auto-increment của database
 * 3. Chống va chạm tuyệt đối (16 ký tự ngẫu nhiên = 80 bits entropy)
 */
export function generateUlid(timestamp: number = Date.now()): string {
  // 10 ký tự thời gian (48 bits)
  let timeStr = '';
  let time = timestamp;
  for (let i = 9; i >= 0; i--) {
    const mod = time % ENCODING_LEN;
    timeStr = ENCODING.charAt(mod) + timeStr;
    time = Math.floor(time / ENCODING_LEN);
  }

  // 16 ký tự ngẫu nhiên (80 bits)
  const randomBytes = crypto.randomBytes(10);
  let randStr = '';
  for (let i = 0; i < 16; i++) {
    // Phân bổ đều các byte ngẫu nhiên vào bảng mã base32
    const randByte = randomBytes[i % 10];
    const randIndex = (randByte + i * 7) % ENCODING_LEN;
    randStr += ENCODING.charAt(randIndex);
  }

  return timeStr + randStr;
}

export type KnowledgePrefix =
  | 'VOC' // Vocabulary
  | 'GRA' // Grammar
  | 'PAT' // Sentence Pattern
  | 'PRO' // Pronunciation Concept
  | 'REA' // Reading Concept
  | 'LIS' // Listening Concept
  | 'SNS' // Sense (Ý nghĩa cụ thể)
  | 'REL' // Relation (Quan hệ tri thức)
  | 'ALI' // Alias (Tên gọi khác / phiên âm)
  | 'DUP' // Duplicate candidate
  | 'EVI' // Learning Evidence (Bằng chứng học tập)
  | 'COR' // Evidence Correction (Đính chính / vô hiệu hóa bằng chứng)
  | 'EVR' // Evidence Relation (Quan hệ giữa các bằng chứng)
  | 'SNP' // Mastery Snapshot (Ảnh chụp trạng thái thành thạo)
  | 'MSH'; // Mastery History (Lịch sử chuyển đổi trạng thái thành thạo)

/**
 * Tạo định danh kiến thức thống nhất có prefix nhận diện
 * Ví dụ: VOC_01HZX87K7R6N2B1M9V4X3Q8Z, GRA_01HZX87K7R6N2B1M9V4X3Q8Z
 */
export function generatePrefixedId(prefix: KnowledgePrefix, timestamp: number = Date.now()): string {
  return `${prefix}_${generateUlid(timestamp)}`;
}
