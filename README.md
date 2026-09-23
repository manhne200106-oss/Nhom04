# Hệ Thống Quản Lý Dự Án Nhóm Có Tích Hợp AI

Dự án được khởi tạo thành công theo tài liệu `SRS.md`.

## Tech Stack
- **Backend**: FastAPI, SQLAlchemy, Pydantic, SQLite, Google Gemini API
- **Frontend**: React, Vite, TailwindCSS
- **Database**: SQLite (mặc định) có thể cấu hình sang PostgreSQL.

## Cấu trúc thư mục
- `backend/`: Chứa mã nguồn API, CSDL, Auth JWT và AI Service.
- `frontend/`: Chứa mã nguồn giao diện Kanban, Dashboard.

## Hướng dẫn chạy dự án

### 1. Khởi chạy Backend
Mở Terminal, di chuyển vào thư mục `backend/`:
```bash
cd backend
python -m venv venv
# Active venv (Windows)
venv\Scripts\activate
# Cài đặt thư viện
pip install -r requirements.txt
# Khởi tạo dữ liệu mẫu (Admin, PM, Member, Tasks)
python seed_data.py
# Chạy server (Mặc định ở port 8000)
uvicorn app.main:app --reload
```
Lưu ý: Mở file `backend/.env.example` sao chép thành `.env` và nhập `GEMINI_API_KEY` thực tế để dùng được AI.

### 2. Khởi chạy Frontend
Mở Terminal mới, di chuyển vào thư mục `frontend/`:
```bash
cd frontend
# Cài đặt thư viện
npm install
# Khởi chạy server giao diện
npm run dev
```

Truy cập `http://localhost:5173` để trải nghiệm giao diện và `http://localhost:8000/docs` để xem tài liệu Swagger API.

### Tài khoản Demo (đã được seed)
- **Admin**: `admin` / `123`
- **PM**: `manager` / `123`
- **Member 1 (Frontend)**: `manh` / `123`
- **Member 2 (Backend)**: `tu` / `123`
