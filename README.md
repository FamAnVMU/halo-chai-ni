# Halo Chinese (哈罗中文) 🇨🇳
### Ứng Dụng Học Tiếng Trung Cá Nhân Toàn Diện Tích Hợp Local Backend, Gemini 3.5 Flash Lite & Gemini 3.8 Live API

[![Build and Release Android APK](https://github.com/FamAnVMU/halo-chai-ni/actions/workflows/release.yml/badge.svg)](https://github.com/FamAnVMU/halo-chai-ni/actions/workflows/release.yml)
[![Release](https://img.shields.io/github/v/release/FamAnVMU/halo-chai-ni?color=crimson)](https://github.com/FamAnVMU/halo-chai-ni/releases)
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Local%20Backend%20%7C%20Android%20APK-emerald)](https://github.com/FamAnVMU/halo-chai-ni)

Ứng dụng học tiếng Trung cá nhân toàn diện, lấy cảm hứng từ HelloChinese kết hợp AI Tutor chạy trên kiến trúc **Frontend ➔ Local Backend (localhost:3001) ➔ Gemini API**, đảm bảo bảo vệ tuyệt đối API Key trên máy tính cá nhân.

---

## 🏛️ Kiến Trúc Hệ Thống (Local Backend & Gemini API)

```
[ Trình duyệt Web / Android App ]
             │
             │ HTTP (localhost:3001) / WebSocket (ws://localhost:3001/api/live)
             ▼
[ Local Backend Node.js / Express / tsx ]
  ├── SQLite Database (./data/halo_chinese.db - WAL Mode)
  │    ├── server_settings (Lưu trữ API Key an toàn)
  │    ├── chat_sessions & chat_messages (Lịch sử hội thoại)
  │    └── learner_memory (Hồ sơ điểm yếu & ngữ pháp cá nhân)
  ├── Gemini Text Service (gemini-3.5-flash-lite)
  └── Gemini Live WebSocket Bridge (gemini-3.8-live)
             │
             │ HTTPS / WSS
             ▼
[ Google Gemini Cloud API ]
```

### 1. Gemini Text-out Model: `gemini-3.5-flash-lite`
- Đóng vai trò AI Tutor thông thường.
- Phân tích lỗi ngữ pháp, giải thích từ vựng, đưa ra câu sửa và gợi ý tự nhiên bằng tiếng Việt.
- Tự động đọc và cập nhật bộ nhớ học tập từ SQLite.

### 2. Gemini Live API: `gemini-3.8-live`
- Đàm thoại giọng nói 2 chiều thời gian thực (PCM 16kHz đầu vào, PCM 24kHz đầu ra).
- Hỗ trợ ngắt lời tức thì (Barge-in / Interrupt handling).
- Tùy chọn giọng nói chuẩn bản xứ: *Aoede, Kore, Puck, Charon, Fenrir*.

---

## 🌟 12 Phân Hệ Học Tập Cốt Lõi

1. **Trang chủ:** Chuỗi học tập (Streak), đếm từ cần ôn SRS hôm nay, bài học kế tiếp, danh ngôn tiếng Trung.
2. **Lộ trình HSK 1 - 6:** Cấu trúc bài học rõ ràng với mục tiêu, hội thoại có audio, từ vựng, ngữ pháp và bài tập; hỗ trợ chế độ tự do tùy chọn bài.
3. **Từ vựng & Flashcard SRS (SM-2):** Lật thẻ 3D, tính toán chu kỳ ôn tập ngắt quãng (1, 2, 4, 7 ngày), thêm từ cá nhân.
4. **Ngữ pháp HSK:** Công thức, ví dụ phân tích, cảnh báo lỗi và so sánh các cặp dễ nhầm lẫn (*想 vs 要, 二 vs 两, 刚 vs 刚才, 把*).
5. **11 Dạng bài tập tương tác:** Trắc nghiệm, ghép Hán-Pinyin, ghép nghĩa, nghe-chọn, điền từ, sắp xếp câu, dịch xuôi/ngược, nhận diện Hán tự, đọc câu, viết chữ.
6. **Luyện phát âm & Pinyin:** 21 thanh mẫu, 36 vận mẫu, 4 thanh điệu, quy tắc biến điệu, sửa lỗi phát âm người Việt kèm thu âm chấm điểm 0 - 100.
7. **Luyện viết chữ Hán (Hanzi Writer):** Hoạt họa thứ tự nét bút trên ô điền tự (米字格) và chấm nét vẽ cảm ứng.
8. **Đọc hiểu phân cấp (Graded Readers):** Hỗ trợ Ruby Pinyin, ẩn/hiện bản dịch tiếng Việt, audio đọc truyện, tra từ tức thì và câu hỏi đọc hiểu.
9. **Luyện nghe hiểu:** Điều chỉnh tốc độ nói (0.8x, 1.0x, 1.2x), ẩn/hiện lời thoại và kiểm tra nghe hiểu.
10. **AI Tutor & Voice Chat 2 chiều:** Luyện nói với Gemini 3.8 Live API hoặc Web Speech fallback; 5 chế độ đàm thoại, báo cáo sau buổi học và bộ nhớ SQLite dài hạn.
11. **Thống kê học tập:** Theo dõi thời gian, từ đã thuộc, biểu đồ học tập tuần và đặt mục tiêu ngày.
12. **Cài đặt & Quản lý API:** Quản lý riêng biệt Text-out API và Live API, kiểm tra tổng thể toàn hệ thống, thử giọng nói và sao lưu dữ liệu JSON.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Trên Máy Tính Cá Nhân

### Bước 1: Cài đặt thư viện
```bash
npm install
```

### Bước 2: Cấu hình môi trường (Tùy chọn)
Tạo file `.env` từ file mẫu:
```bash
copy .env.example .env
```
Điền `GEMINI_TEXT_API_KEY` và `GEMINI_LIVE_API_KEY` của bạn vào file `.env` (hoặc bạn có thể nhập trực tiếp trên giao diện Cài đặt của ứng dụng).

### Bước 3: Khởi chạy Local Backend
```bash
npm run server
```
Backend sẽ khởi động tại: `http://localhost:3001` (Kèm WebSocket bridge tại `ws://localhost:3001/api/live`).

### Bước 4: Khởi chạy Giao diện Frontend
Mở một cửa sổ Terminal khác:
```bash
npm run dev
```
Truy cập tại: `http://localhost:5173`

---

## 📱 Cài Đặt Ứng Dụng Trên Android

Tải file APK chính thức tại:
👉 **[Halo Chinese Releases](https://github.com/FamAnVMU/halo-chai-ni/releases)**

---

© 2026 Halo Chinese - Công cụ học tập cá nhân & nội bộ.
