# [Halo Chinese] Kế Hoạch Chi Tiết Chuyển Đổi Sang Flutter Android Native (100% Mobile Standalone)

> **Dành cho Agent/Developer:** Kế hoạch này được thiết kế để triển khai từng bước có thể kiểm thử độc lập (TDD), không gây bất kỳ xung đột nào với mã nguồn hiện tại, biến ứng dụng thành một App Android Native hoàn toàn độc lập, không cần máy tính và không cần Cloudflare.

**Mục tiêu:** Xây dựng lại toàn bộ ứng dụng Halo Chinese bằng Flutter Native dành riêng cho Android, chạy độc lập 100% trên điện thoại (Local SQLite + Gemini AI SDK trực tiếp + Native Audio + Giao diện 60/120fps chuẩn Material 3).

**Kiến trúc:** Clean Architecture / Feature-First kết hợp Repository Pattern & State Management (Riverpod). 
* **Cơ sở dữ liệu:** SQLite cục bộ trên máy qua `sqflite` (WAL mode, offline-first).
* **AI:** Google Gemini API SDK chính thức cho Dart (`google_generative_ai`) gọi thẳng từ điện thoại.
* **UI:** Flutter Native Widgets với thiết kế Lime Green / Dark Forest tối ưu màn hình cảm ứng, tự động tương thích 100% tai thỏ (Notch) và thanh điều hướng ảo (Navigation bar).

---

## 1. Nguyên Tắc Bảo Đảm "Không Xung Đột - Không Lỗi"

1. **Cô lập thư mục (Zero Conflict):**
   * Toàn bộ mã nguồn Flutter được khởi tạo trong thư mục `flutter_app/` nằm trong repository.
   * Hoàn toàn không đụng chạm đến thư mục `android/` hay `package.json` cũ của Capacitor, đảm bảo dự án cũ vẫn an toàn trong suốt quá trình phát triển mới.
2. **Offline-First Tuyệt Đối:**
   * Dữ liệu từ vựng, ngữ pháp, SRS, lịch sử học tập được nạp vào SQLite của điện thoại. Người dùng có thể học không cần mạng internet.
3. **Gọi AI Trực Tiếp (Không Cần Server Trung Gian):**
   * Thay vì qua Node.js trên máy tính, app Flutter dùng `google_generative_ai` kết nối thẳng Google AI Endpoint qua HTTPS. Người dùng chỉ cần dán Gemini API Key trong app một lần.

---

## 2. Bản Đồ Cấu Trúc Thư Mục Flutter (`flutter_app/`)

```text
flutter_app/
├── android/                   # Cấu hình Android Native, Keystore, Manifest
├── assets/
│   ├── data/                 # JSON seed data (1,200+ từ vựng, ngữ pháp HSK, bài đọc)
│   ├── fonts/                # Inter & Noto Sans SC (Font tiếng Trung)
│   └── audio/                # Âm thanh hiệu ứng
├── lib/
│   ├── core/
│   │   ├── constants/        # Màu sắc (Lime #A3D635), Kích thước, API Endpoints
│   │   ├── database/         # SQLite Helper, Migrations, Seed Loader
│   │   ├── network/          # Gemini AI Client (google_generative_ai)
│   │   ├── theme/            # Light & Dark Theme chuẩn Palette
│   │   └── utils/            # Pinyin Helper, SM-2 SRS Algorithm, Audio Recorder
│   ├── features/
│   │   ├── home/             # Màn hình Trang chủ & Thống kê chuỗi ngày
│   │   ├── placement_test/   # Khảo sát trình độ đầu vào CAT (6 kỹ năng)
│   │   ├── roadmap/          # Lộ trình HSK 1-6 thích ứng
│   │   ├── dictionary/       # Tra từ điển & phân tích chữ
│   │   ├── vocabulary_srs/   # Flashcard SRS lặp lại ngắt quãng
│   │   ├── grammar/          # Ngữ pháp HSK & bài tập ứng dụng
│   │   ├── practice/         # Luyện tập tương tác
│   │   ├── pronunciation/    # Phòng Lab luyện phát âm & ASR
│   │   ├── shadowing/        # Luyện nói nhại 7 cấp độ
│   │   ├── hanzi_writing/    # Canvas luyện viết chữ Hán theo thứ tự nét
│   │   ├── reading/          # Luyện đọc hiểu tương tác
│   │   ├── listening/        # Luyện nghe người bản xứ
│   │   ├── ai_tutor/         # Hội thoại Voice & Text với AI Tutor
│   │   └── profile/          # Hồ sơ học viên & Cài đặt API Key
│   └── main.dart             # Điểm khởi chạy ứng dụng
├── test/                     # Unit test & Widget test
└── pubspec.yaml              # Khai báo thư viện & assets
```

---

## 3. Lộ Trình Triển Khai Chi Tiết (6 Giai Đoạn)

### Giai Đoạn 1: Khởi Tạo Dự Án & Cấu Trúc Cốt Lõi (Scaffolding & Core)
* **Nhiệm vụ 1.1:** Chạy lệnh `flutter create --org com.halochinese --platforms android halo_chinese` trong thư mục `flutter_app`.
* **Nhiệm vụ 1.2:** Khai báo các dependency chất lượng cao trong `pubspec.yaml`:
  * `flutter_riverpod` (Quản lý trạng thái hiện đại, reactive)
  * `sqflite` & `path` (Quản lý SQLite offline trên Android)
  * `google_generative_ai` (Gemini API SDK chính thức của Google)
  * `flutter_secure_storage` (Lưu trữ API Key an toàn trong Android Keystore)
  * `record` & `audioplayers` (Thu âm microphone & phát audio)
  * `google_fonts` (Font Inter & Noto Sans SC)
  * `lucide_icons` (Bộ icon đồng bộ với phiên bản hiện tại)
* **Nhiệm vụ 1.3:** Cấu hình Android: Bổ sung quyền Microphone, Internet vào `AndroidManifest.xml`, đặt màu theme và hỗ trợ Android 15 Edge-to-edge.

---

### Giai Đoạn 2: Cơ Sở Dữ Liệu SQLite & Thuật Toán Offline-First
* **Nhiệm vụ 2.1: SQLite Database Engine:**
  * Xây dựng `AppDatabase` khởi tạo SQLite WAL mode trên Android.
  * Thiết kế bảng dữ liệu tối ưu: `vocabularies`, `srs_items`, `learner_evidence`, `mastery_snapshots`, `chat_messages`, `reading_passages`.
* **Nhiệm vụ 2.2: Data Seeder:**
  * Viết module tự động giải nén và nạp sẵn 1.200+ từ vựng HSK 1–6, ví dụ câu và âm pinyin vào SQLite ở lần mở app đầu tiên.
* **Nhiệm vụ 2.3: Bộ não SRS (Spaced Repetition Engine):**
  * Porting thuật toán SM-2 (SuperMemo) sang Dart thuần: Tính toán `easeFactor`, `intervalDays`, `repetitionCount` chính xác 100%.
  * Viết Unit test kiểm tra thuật toán SRS (`flutter test test/srs_test.dart`).

---

### Giai Đoạn 3: Kết Nối Trực Tiếp Gemini AI & AI Tutor Engine
* **Nhiệm vụ 3.1: Gemini AI Service:**
  * Xây dựng `GeminiService` sử dụng model `gemini-2.0-flash` hoặc `gemini-2.5-flash`.
  * Hỗ trợ streaming text token-by-token (hiệu ứng chữ gõ tức thì).
* **Nhiệm vụ 3.2: AI Tutor & Context Builder trong Dart:**
  * Đóng gói System Prompt sư phạm tiếng Trung (sửa lỗi theo 3 bước, chống sửa nhầm câu đúng, phiên âm Ruby).
  * Truy xuất lịch sử hội thoại từ SQLite cục bộ để tạo ngữ cảnh cá nhân hóa cho AI Tutor.
* **Nhiệm vụ 3.3: Module Kiểm Tra API Key:**
  * Xây dựng màn hình cài đặt API Key: Tự động test ping tới Google Gemini để xác nhận Key hợp lệ trước khi lưu.

---

### Giai Đoạn 4: Hệ Thống Giao Diện (Design System & Shell)
* **Nhiệm vụ 4.1: Theme & Màu Sắc Chuẩn:**
  * Tông màu chủ đạo: Xanh lá mạ (`#A3D635`), Trắng ngà (`#F6FAF2`), Xanh rừng đậm (`#121811` / `#1A2418`).
  * Hỗ trợ chuyển đổi Sáng (Light) / Tối (Dark) mượt mà.
* **Nhiệm vụ 4.2: Component Đặc Thù Tiếng Trung (`RubyText` Widget):**
  * Xây dựng Widget hiển thị chữ Hán kèm Pinyin phía trên chuẩn xác, không bị lệch hàng, hỗ trợ nhấn vào từng từ để nghe phát âm.
* **Nhiệm vụ 4.3: Thanh Điều Hướng 5 Tab (Main App Shell):**
  * Bọc toàn bộ giao diện bằng `SafeArea` (tự động né 100% tai thỏ camera và thanh cử chỉ Android).
  * 5 tab chuẩn: **Trang chủ**, **Học tập**, **AI Tutor** (nút tròn nổi bật ở giữa), **Ôn tập**, **Cá nhân**.

---

### Giai Đoạn 5: Xây Dựng 22 Phân Hệ Học Tập Chuyên Sâu
* **Nhiệm vụ 5.1: Trang Chủ (Home Screen):**
  * Card chào mừng, thống kê chuỗi ngày học (Streak), số thẻ SRS cần ôn hôm nay, truy cập nhanh AI Voice Tutor.
* **Nhiệm vụ 5.2: Khảo Sát Năng Lực Đầu Vào (Placement Test):**
  * Bài kiểm tra thích ứng 6 kỹ năng, tự động chấm điểm và xếp lớp HSK.
* **Nhiệm vụ 5.3: Flashcard & Ôn Tập SRS:**
  * Giao diện lật thẻ mượt mà với 4 nút đánh giá: *Quên (Again)*, *Khó (Hard)*, *Tốt (Good)*, *Dễ (Easy)*.
* **Nhiệm vụ 5.4: Luyện Viết Chữ Hán (Hanzi Writing):**
  * CustomPainter vẽ thứ tự nét chữ Hán, hỗ trợ học viên tô theo mẫu và kiểm tra đúng nét.
* **Nhiệm vụ 5.5: Phòng Luyện Âm Học & Shadowing:**
  * Ghi âm microphone native, phát audio người bản xứ, so sánh nhịp điệu và ngữ điệu.
* **Nhiệm vụ 5.6: Luyện Đọc Hiểu & Từ Điển:**
  * Bài đọc có Pinyin, tra từ điển tức thì khi nhấn vào chữ Hán bất kỳ.

---

### Giai Đoạn 6: Tối Ưu Hóa, Kiểm Thử & Xuất Bản APK Release
* **Nhiệm vụ 6.1: Kiểm thử hồi quy tự động:**
  * Chạy `flutter test` bảo đảm 100% unit tests của DB, SRS và AI parser vượt qua.
* **Nhiệm vụ 6.2: Tối ưu hiệu năng Android:**
  * Cấu hình ProGuard / R8 để thu nhỏ dung lượng APK (< 25 MB).
  * Đảm bảo app đạt 60fps – 120fps trên mọi thiết bị Android từ Android 8.0 đến Android 15.
* **Nhiệm vụ 6.3: Build APK Release hoàn thiện:**
  * Ký bằng Keystore cố định và xuất file: `release-apk/halo-chinese-flutter-v1.0.0.apk`.

---

## 4. Kế Hoạch Phân Bổ Phiên Làm Việc (Execution Sprints)

| Sprint | Mục tiêu | Sản phẩm bàn giao |
| :--- | :--- | :--- |
| **Sprint 1** | Khởi tạo Flutter project, Theme Lime/Dark, SQLite DB, Seeder 1200 từ HSK | App chạy lên có khung, DB SQLite sẵn sàng |
| **Sprint 2** | Gemini AI Direct SDK, System Prompt AI Tutor, RubyText Pinyin Widget | Voice/Text chat trực tiếp với Gemini trên điện thoại |
| **Sprint 3** | Trang chủ, Flashcard SRS SM-2, Từ điển tra cứu tức thời | Học từ vựng và ôn tập flashcard hoàn toàn offline |
| **Sprint 4** | Bài kiểm tra đầu vào thích ứng CAT, Lộ trình học HSK 1-6 | Khảo sát 6 kỹ năng và tạo lộ trình cá nhân |
| **Sprint 5** | Luyện viết chữ Hán (Hanzi Canvas), Luyện phát âm & Shadowing | Hoàn thiện toàn bộ các kỹ năng âm học & chữ viết |
| **Sprint 6** | Tinh chỉnh UI/UX, Kiểm thử toàn diện, Đóng gói Release APK | Gói APK Flutter hoàn chỉnh, không lỗi |
