# Chinese Learning Ecosystem Workspace

Không gian làm việc bao gồm 2 dự án học tiếng Trung riêng biệt:

## 1. Halo Chinese (`/halo_chinese`)
* **Phiên bản:** v3.2.3
* **Công nghệ:** React + Vite + Tailwind CSS + Capacitor Android + Node.js/SQLite Backend.
* **Đặc điểm:** Hỗ trợ đa nền tảng (Web, Desktop LAN, Android Hybrid qua Capacitor). Đầy đủ 22 phân hệ giao diện, Live WebSocket Gemini Audio, hệ thống khảo sát đầu vào thích ứng CAT, kiểm toán benchmark 27 ca golden.

## 2. Hi Chinese (`/hi_chinese`)
* **Công nghệ:** Flutter Native (100% Android Mobile Standalone).
* **Đặc điểm:** Chạy hoàn toàn độc lập trên thiết bị Android.
  * Cơ sở dữ liệu SQLite cục bộ trên máy (`sqflite`).
  * Gọi trực tiếp Google Gemini API SDK (`google_generative_ai`) từ điện thoại.
  * Native Audio thu âm & phát âm thanh.
  * Tận dụng kho dữ liệu từ vựng HSK, ngữ pháp và thuật toán SRS từ dự án Halo Chinese.
