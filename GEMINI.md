# Halo Chinese - Nguyên Tắc Phát Triển & Phiên Bản

## 1. Quy ước đặt phiên bản (Semantic Versioning)
Tuân thủ nghiêm ngặt quy tắc nâng phiên bản theo yêu cầu:
- **Cập nhật đáng kể (Tính năng mới, tái cấu trúc hoặc fix bug lớn):** Tăng số **MINOR** (ví dụ: `1.0.0` ➔ `1.1.0` ➔ `1.2.0`).
- **Nâng cấp nhỏ (Sửa lỗi nhỏ, cải tiến UI/UX nhẹ, chỉnh sửa nội dung):** Tăng số **PATCH** (ví dụ: `1.0.0` ➔ `1.0.1` ➔ `1.0.2`).
- **Cập nhật đột phá kiến trúc toàn diện (nếu có):** Tăng số **MAJOR** (ví dụ: `2.0.0`).

## 2. Quy trình khi nâng phiên bản:
1. Cập nhật `version` trong `package.json`.
2. Cập nhật `versionName` và tăng `versionCode` trong `android/app/build.gradle`.
3. Cập nhật nhãn phiên bản hiển thị trong giao diện `src/App.tsx`.
4. Build và kiểm thử: `npm run build && npx cap sync android`.
5. Tạo Git commit và Git tag tương ứng (ví dụ: `git tag v1.0.1` hoặc `git tag v1.1.0`).
6. Đẩy lên remote (`git push origin main --tags`) để kích hoạt GitHub Actions tự động build APK phát hành trên GitHub Releases.
