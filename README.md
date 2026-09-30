# 🚀 TaskMaster AI - Hệ thống quản lý dự án nhóm có tích hợp AI
**Nhóm 4 (ICTU)**

## 📥 Hướng dẫn khởi chạy nhanh (Dành cho Giảng viên)

Dự án đã được cấu hình script tự động hóa hoàn toàn để thuận tiện nhất cho việc chấm bài. Thầy/Cô không cần phải gõ bất kỳ lệnh cài đặt thủ công nào.

1. Yêu cầu máy tính đã cài đặt sẵn **Python** và **Node.js**.
2. Giải nén mã nguồn ra một thư mục độc lập.
3. Nhấp đúp chuột vào file **`start_app.bat`** nằm ở ngoài cùng thư mục.
4. Quá trình tự động diễn ra:
   - Tự động tạo môi trường ảo (venv) và cài thư viện backend.
   - Tự động cài `node_modules` cho frontend.
   - Tự động nạp cơ sở dữ liệu mẫu.
   - Tự động bật server và mở sẵn trình duyệt web (`http://localhost:5173`).

*(Lưu ý: Quá trình khởi chạy lần đầu tiên cần tải thư viện nên có thể mất khoảng 1-2 phút).*

## 🔐 Tài khoản Demo (Đã nạp sẵn dữ liệu test)

- **Tài khoản PM (Quản lý dự án):** 
  - Tên đăng nhập: `camtu`
  - Mật khẩu: `123`
- **Tài khoản Member (Thành viên):** 
  - Tên đăng nhập: `ducmanh`
  - Mật khẩu: `123`

## 🛠️ Công nghệ sử dụng
- **Frontend:** React + Vite
- **Backend:** FastAPI (Python)
- **Cơ sở dữ liệu:** SQLite (Mặc định cho môi trường local để dễ chấm)
- **AI Tích hợp:** Google Gemini Flash
