# Halo Chinese (哈罗中文) 🇨🇳
### Ứng Dụng Học Tiếng Trung Cá Nhân Trên Android Tích Hợp Local Backend, Gemini 3.5 Flash Lite & Gemini 3.8 Live API

[![Build and Release Android APK](https://github.com/FamAnVMU/halo-chai-ni/actions/workflows/release.yml/badge.svg)](https://github.com/FamAnVMU/halo-chai-ni/actions/workflows/release.yml)
[![Release](https://img.shields.io/github/v/release/FamAnVMU/halo-chai-ni?color=crimson)](https://github.com/FamAnVMU/halo-chai-ni/releases)
[![Platform](https://img.shields.io/badge/Platform-Android%20APK%20%7C%20Local%20Backend-emerald)](https://github.com/FamAnVMU/halo-chai-ni)

**Halo Chinese** là ứng dụng học tiếng Trung cá nhân toàn diện, tối ưu chuyên biệt cho thiết bị **Android (APK)**, lấy cảm hứng từ HelloChinese kết hợp AI Tutor chạy trên kiến trúc an toàn:

> **Android App ➔ Local Backend trên PC (Node.js/SQLite) ➔ Google Gemini API**

Bảo mật tuyệt đối Google Gemini API Key trên máy tính cá nhân của bạn, không bao giờ lộ key ở frontend hay gửi ra dịch vụ ngoài.

---

## 🏛️ Kiến Trúc Hệ Thống (Android Native & Local Backend)

```
[ Điện Thoại Android (Halo Chinese APK) ]
             │
             │ Wi-Fi LAN: http://192.168.1.X:3001 & ws://192.168.1.X:3001/api/live
             │ Hoặc cáp USB qua adb reverse: http://localhost:3001
             ▼
[ Local Backend trên Máy Tính PC (0.0.0.0:3001) ]
  ├── SQLite Database (./data/halo_chinese.db - WAL Mode)
  │    ├── server_settings (Lưu trữ API Key an toàn trên PC)
  │    ├── chat_sessions & chat_messages (Lịch sử đàm thoại)
  │    └── learner_memory (Hồ sơ điểm yếu ngữ pháp & từ vựng cá nhân)
  ├── Gemini Text Service (gemini-3.5-flash-lite)
  └── Gemini Live WebSocket Bridge (gemini-3.8-live)
             │
             │ HTTPS / WSS
             ▼
[ Google Gemini Cloud API ]
```

### 1. Gemini Text-out Model: `gemini-3.5-flash-lite`
- Đóng vai trò AI Tutor thông minh: trả lời thắc mắc, phân tích cấu trúc ngữ pháp, giảng giải từ vựng theo trình độ HSK.
- Tự động sửa câu người học viết và đưa ra cách diễn đạt tự nhiên chuẩn bản xứ kèm giải thích tiếng Việt.
- Tự động lưu và cập nhật bộ nhớ học tập (điểm yếu, lỗi sai thường gặp) vào SQLite.

### 2. Gemini Live API: `gemini-3.8-live`
- Đàm thoại giọng nói 2 chiều thời gian thực (PCM 16kHz đầu vào từ mic điện thoại, PCM 24kHz âm thanh phản hồi từ AI).
- Hỗ trợ cơ chế ngắt lời tức thì (Barge-in / Interrupt handling) khi người dùng cất giọng nói.
- Giọng đọc bản xứ tự nhiên: *Aoede, Kore, Puck, Charon, Fenrir*.

---

## 🚀 Hướng Dẫn Khởi Chạy Local Backend Trên Máy Tính

Máy tính cá nhân của bạn đóng vai trò là trạm điều khiển Backend bảo mật.

### Bước 1: Cài đặt thư viện (nếu chưa cài)
Mở Terminal / PowerShell tại thư mục dự án trên máy tính:
```bash
npm install
```

### Bước 2: Khởi động Local Backend
Chạy lệnh:
```bash
npm run server
```

Server sẽ tự động:
1. Mở cổng `3001` trên tất cả các mạng nội bộ (`0.0.0.0:3001`).
2. Khởi tạo cơ sở dữ liệu SQLite tại `./data/halo_chinese.db` (chế độ WAL siêu nhanh).
3. Quét và in ra toàn bộ địa chỉ IP mạng nội bộ (LAN IP) của máy tính bạn.

**Ví dụ hiển thị trên Terminal máy tính:**
```
==================================================
  HALO CHINESE - LOCAL BACKEND SERVER RUNNING
==================================================
* Máy tính (Local): http://localhost:3001
* Mạng Wi-Fi / LAN để kết nối từ Điện thoại Android:
  ➜ http://192.168.1.15:3001
  ➜ ws://192.168.1.15:3001/api/live
* Database SQLite: c:\Users\phama\Downloads\chinese\data\halo_chinese.db
==================================================
```

---

## 📱 Cài Đặt & Kết Nối Trên Điện Thoại Android

### Bước 1: Cài đặt ứng dụng
1. Tải file APK phiên bản mới nhất tại:
   👉 **[Halo Chinese Releases (GitHub)](https://github.com/FamAnVMU/halo-chai-ni/releases)**
2. Cài đặt file APK lên điện thoại Android của bạn (cấp quyền cài đặt từ nguồn tin cậy nếu được hỏi).

### Bước 2: Kết nối Điện thoại với Máy tính PC
Đảm bảo điện thoại Android và máy tính PC đang kết nối **chung một mạng Wi-Fi**.

1. Mở ứng dụng **Halo Chinese** trên điện thoại.
2. Nhấn vào mục **Cài đặt** (biểu tượng bánh răng ⚙️).
3. Tại phần **"Máy Chủ PC (Local Backend)"**:
   - Nhập địa chỉ IP hiển thị trên Terminal máy tính ở trên (Ví dụ: `192.168.1.15:3001`).
   - Nhấn **"Lưu & Kết nối"**.
   - Khi hiện thông báo `✓ Kết nối thành công tới máy chủ PC`, ứng dụng và máy tính đã liên kết hoàn tất!

*(Tùy chọn kết nối bằng cáp USB qua ADB):*
Nếu kết nối điện thoại với máy tính qua cáp USB và đã bật USB Debugging, bạn có thể gõ lệnh trên máy tính:
```bash
adb reverse tcp:3001 tcp:3001
```
Sau đó trên điện thoại, trong ô Máy Chủ PC chỉ cần nhập `localhost:3001` và bấm Lưu.

### Bước 3: Cấu hình Gemini API Key
Ngay trong giao diện Cài đặt trên điện thoại:
1. Nhập **Gemini Text API Key** (dành cho `gemini-3.5-flash-lite`).
2. Nhập **Gemini Live API Key** (dành cho `gemini-3.8-live`).
3. Nhấn **"Kiểm Tra Tổng Thể Toàn Hệ Thống"** để ứng dụng tự động kiểm tra:
   - Kết nối tới Local Backend.
   - Quyền truy cập Microphone điện thoại.
   - Trạng thái hoạt động của Text-out API.
   - Trạng thái kết nối WebSocket của Live Voice API.

---

## 🌟 Các Phân Hệ Học Tập Cốt Lõi Trên Android

1. **Trang chủ:** Chuỗi học tập (Streak), đếm từ cần ôn SRS hôm nay, bài học kế tiếp, danh ngôn tiếng Trung.
2. **Lộ trình HSK 1 - 6:** Cấu trúc bài học rõ ràng với mục tiêu, hội thoại có audio, từ vựng, ngữ pháp và bài tập; hỗ trợ chế độ tự do tùy chọn bài.
3. **Từ vựng & Flashcard SRS (SM-2):** Lật thẻ 3D cảm ứng, tính toán chu kỳ ôn tập ngắt quãng (1, 2, 4, 7 ngày), thêm từ vựng cá nhân.
4. **Ngữ pháp HSK:** Công thức, ví dụ phân tích, cảnh báo lỗi và so sánh các cặp dễ nhầm lẫn (*想 vs 要, 二 vs 两, 刚 vs 刚才, 把*).
5. **11 Dạng bài tập tương tác:** Trắc nghiệm, ghép Hán-Pinyin, ghép nghĩa, nghe-chọn, điền từ, sắp xếp câu, dịch xuôi/ngược, nhận diện Hán tự, đọc câu, viết chữ.
6. **Luyện phát âm & Pinyin:** 21 thanh mẫu, 36 vận mẫu, 4 thanh điệu, quy tắc biến điệu, sửa lỗi phát âm người Việt kèm thu âm chấm điểm 0 - 100.
7. **Luyện viết chữ Hán (Hanzi Writer):** Hoạt họa thứ tự nét bút trên ô điền tự (米字格) và chấm nét vẽ cảm ứng trực tiếp trên màn hình điện thoại.
8. **Đọc hiểu phân cấp (Graded Readers):** Hỗ trợ Ruby Pinyin, ẩn/hiện bản dịch tiếng Việt, audio đọc truyện, tra từ tức thì và câu hỏi đọc hiểu.
9. **Luyện nghe hiểu:** Điều chỉnh tốc độ nói (0.8x, 1.0x, 1.2x), ẩn/hiện lời thoại và kiểm tra nghe hiểu.
10. **AI Tutor & Voice Chat 2 chiều:** Luyện nói với Gemini 3.8 Live API; 5 chế độ đàm thoại, sửa lỗi câu trực tiếp và lưu trữ bộ nhớ học tập dài hạn.
11. **Bài học dành cho bạn (AI Personalized Curriculum):** Tự động phân tích hội thoại và biên soạn bài học cá nhân hóa với cơ chế chống dạy trùng lặp kiến thức, bài tập tương tác chấm điểm tự động.
12. **Bộ nhớ học tập dài hạn (SQLite Memory Ledger):** Lưu trữ có cấu trúc mọi từ vựng đã dạy, cấu trúc ngữ pháp, mức độ thành thạo và sổ tay lỗi sai thường gặp.
13. **Thống kê học tập:** Theo dõi thời gian, từ đã thuộc, biểu đồ học tập tuần và đặt mục tiêu ngày.
14. **Cài đặt & Quản lý API:** Cấu hình IP máy chủ PC linh hoạt, quản lý Text API & Live API riêng biệt, kiểm tra tổng thể và sao lưu dữ liệu JSON.

---

## 🛠️ Dành Cho Lập Trình Viên: Build APK

Khi bạn muốn tự đóng gói lại ứng dụng Android:
```bash
# 1. Build frontend React và đồng bộ vào Android project
npm run build
npx cap sync android

# 2. Mở dự án trong Android Studio để chạy hoặc build APK release
npx cap open android
```

Hoặc khi bạn tạo Git tag mới (ví dụ: `git tag v1.3.0 && git push origin main --tags`), GitHub Actions sẽ tự động biên dịch APK release có chữ ký và phát hành trên GitHub Releases.

---

© 2026 Halo Chinese - Công cụ học tập tiếng Trung cá nhân & nội bộ.
