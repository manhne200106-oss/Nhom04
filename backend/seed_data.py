from sqlalchemy.orm import Session
from app.core.database import engine, Base, SessionLocal
from app.models.user import User
from app.models.project import Project, ProjectMember
from app.models.sprint import Sprint
from app.models.task import Task
from app.models.meeting import MeetingNote
from app.core.security import get_password_hash
from datetime import datetime


def seed_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    # ── 2 Users Only ───────────────────────────────────────────────────
    camtu = User(
        username="camtu",
        password_hash=get_password_hash("123"),
        role="PM",
        skills="Project Management, UI/UX, SCRUM"
    )
    ducmanh = User(
        username="ducmanh",
        password_hash=get_password_hash("123"),
        role="MEMBER",
        skills="Backend, Frontend, Python, FastAPI, React"
    )
    db.add_all([camtu, ducmanh])
    db.commit()

    # ── Project ─────────────────────────────────────────────────────────
    project = Project(
        name="TaskMaster AI",
        description="He thong quan ly du an nhom tich hop tri tue nhan tao Gemini"
    )
    db.add(project)
    db.commit()

    # ── 2 Project Members (CamTu: Leader/PM, DucManh: Member) ───────────
    db.add_all([
        ProjectMember(project_id=project.id, user_id=camtu.id, is_leader=True),
        ProjectMember(project_id=project.id, user_id=ducmanh.id, is_leader=False),
    ])
    db.commit()

    # ── Sprints ─────────────────────────────────────────────────────────
    sprint1 = Sprint(
        project_id=project.id,
        name="Sprint 1",
        start_date=datetime(2026, 8, 17),
        end_date=datetime(2026, 8, 30)
    )
    sprint2 = Sprint(
        project_id=project.id,
        name="Sprint 2",
        start_date=datetime(2026, 8, 31),
        end_date=datetime(2026, 9, 13)
    )
    db.add_all([sprint1, sprint2])
    db.commit()

    # ── 12 Tasks mẫu trong Sprint 1 (chỉ chia cho CamTu và DucManh) ─────
    tasks = [
        # 1. ERD & Database Design -> DucManh (DONE)
        Task(
            project_id=project.id, sprint_id=sprint1.id, assignee_id=ducmanh.id,
            title="Thiet ke co so du lieu (ERD)",
            description="Tao so do ERD, tao schema Users, Projects, Tasks, Sprints",
            status="DONE", priority="HIGH", story_points=5,
            due_date=datetime(2026, 8, 20), required_skills="Database, SQL, Python"
        ),
        # 2. Sprint Planning & Work Breakdown -> CamTu (DONE)
        Task(
            project_id=project.id, sprint_id=sprint1.id, assignee_id=camtu.id,
            title="Ke hoach Sprint & Phan ra cong viec",
            description="Lap danh sach tinh nang, xac dinh do uu tien va phan bo nguon luc",
            status="DONE", priority="HIGH", story_points=5,
            due_date=datetime(2026, 8, 21), required_skills="Project Management, SCRUM"
        ),
        # 3. Auth API (JWT Login) -> DucManh (DONE)
        Task(
            project_id=project.id, sprint_id=sprint1.id, assignee_id=ducmanh.id,
            title="Xay dung API Auth (JWT Login)",
            description="Endpoint POST /auth/login tra ve access_token, ma hoa mat khau bcrypt",
            status="DONE", priority="HIGH", story_points=8,
            due_date=datetime(2026, 8, 24), required_skills="Backend, Python, FastAPI"
        ),
        # 4. Login UI -> CamTu (DONE)
        Task(
            project_id=project.id, sprint_id=sprint1.id, assignee_id=camtu.id,
            title="Giao dien Dang nhap he thong",
            description="Form dang nhap responsive, bat loi ro rang, thiet ke hien dai",
            status="DONE", priority="HIGH", story_points=3,
            due_date=datetime(2026, 8, 23), required_skills="UI/UX, Frontend, React"
        ),
        # 5. Projects & Members CRUD API -> DucManh (DONE)
        Task(
            project_id=project.id, sprint_id=sprint1.id, assignee_id=ducmanh.id,
            title="CRUD API Du an & Thanh vien",
            description="API quan ly du an, danh sach thanh vien, thong ke tien do",
            status="DONE", priority="HIGH", story_points=5,
            due_date=datetime(2026, 8, 26), required_skills="Backend, Python, FastAPI"
        ),
        # 6. Sidebar & Dashboard UI -> CamTu (DONE)
        Task(
            project_id=project.id, sprint_id=sprint1.id, assignee_id=camtu.id,
            title="Giao dien Sidebar & Dashboard",
            description="Thiet ke Sidebar toi mau slate-900, 4 the KPI, thanh tien do Sprint",
            status="DONE", priority="MEDIUM", story_points=5,
            due_date=datetime(2026, 8, 27), required_skills="UI/UX, Frontend, React"
        ),
        # 7. Tasks CRUD API & Filter -> DucManh (IN_PROGRESS)
        Task(
            project_id=project.id, sprint_id=sprint1.id, assignee_id=ducmanh.id,
            title="CRUD API Task & bo loc trang thai",
            description="Loc theo status, priority, assignee, tim kiem tu khoa",
            status="IN_PROGRESS", priority="HIGH", story_points=8,
            due_date=datetime(2026, 8, 29), required_skills="Backend, Python, FastAPI"
        ),
        # 8. Kanban Board UI -> CamTu (IN_PROGRESS)
        Task(
            project_id=project.id, sprint_id=sprint1.id, assignee_id=camtu.id,
            title="Giao dien Kanban Board keo tha",
            description="Bang 4 cot TODO, IN_PROGRESS, REVIEW, DONE ho tro keo tha truc quan",
            status="IN_PROGRESS", priority="HIGH", story_points=8,
            due_date=datetime(2026, 8, 30), required_skills="UI/UX, Frontend, React"
        ),
        # 9. Integrate Gemini AI API -> DucManh (IN_PROGRESS)
        Task(
            project_id=project.id, sprint_id=sprint1.id, assignee_id=ducmanh.id,
            title="Tich hop Gemini AI API",
            description="Ket noi Google Gemini de phan tich tien do va goi y phan cong",
            status="IN_PROGRESS", priority="HIGH", story_points=8,
            due_date=datetime(2026, 8, 28), required_skills="Backend, Python, AI"
        ),
        # 10. Task Modal & AI Suggestion -> CamTu (REVIEW)
        Task(
            project_id=project.id, sprint_id=sprint1.id, assignee_id=camtu.id,
            title="Modal Tao Task & Goi y phan cong AI",
            description="Hop thoai tao/sua nhiem vu, nut goi y thanh vien phu hop bang AI",
            status="REVIEW", priority="HIGH", story_points=5,
            due_date=datetime(2026, 8, 29), required_skills="UI/UX, Frontend, React"
        ),
        # 11. Meeting Minutes AI Page -> CamTu (TODO)
        Task(
            project_id=project.id, sprint_id=sprint1.id, assignee_id=camtu.id,
            title="Trang Bien ban hop tu dong bang AI",
            description="Nhap ghi chu tho, AI sinh bien ban cuoc hop chuan cau truc va luu DB",
            status="TODO", priority="MEDIUM", story_points=5,
            due_date=datetime(2026, 8, 30), required_skills="UI/UX, Frontend, React"
        ),
        # 12. Unit Tests & System Deployment -> DucManh (TODO)
        Task(
            project_id=project.id, sprint_id=sprint1.id, assignee_id=ducmanh.id,
            title="Viet Unit Test & Kiem thu he thong",
            description="Kiem thu cac API Auth, Task, Project, AI va toi uu hieu nang",
            status="TODO", priority="LOW", story_points=3,
            due_date=datetime(2026, 8, 30), required_skills="Backend, Python, Testing"
        ),
    ]
    db.add_all(tasks)
    db.commit()

    # ── Demo Meeting Note ───────────────────────────────────────────────
    db.add(MeetingNote(
        project_id=project.id,
        raw_content=(
            "Cuoc hop ngay 19/09/2026. Thanh vien: camtu (PM / Leader), ducmanh (Member).\n"
            "DucManh da hoan thanh Database ERD va Auth API, dang lam API Task va Gemini AI.\n"
            "CamTu da hoan thien UI Login, Sidebar, Dashboard, dang lam Kanban Board.\n"
            "Quyet dinh: Su dung Google Gemini REST API de tom tat tien do va phan cong task.\n"
            "Action items: DucManh hoan tat API Task truoc 29/8. CamTu hoan tat UI Kanban truoc 30/8."
        ),
        generated_minutes=(
            "### Biên bản cuộc họp Sprint 1\n"
            "- **Mục tiêu:** Báo cáo tiến độ phát triển hệ thống TaskMaster AI.\n"
            "- **Người tham gia:** Lục Thị Cẩm Tú (PM/Leader), Nguyễn Đức Mạnh (Member).\n"
            "- **Nội dung thảo luận:** Đã hoàn thành các module nền tảng CSDL, Auth, Dashboard. Đang triển khai Kanban và AI.\n"
            "- **Kế hoạch hành động:**\n"
            "  + Nguyễn Đức Mạnh: Hoàn tất CRUD Task và tích hợp Gemini API.\n"
            "  + Lục Thị Cẩm Tú: Hoàn thiện bảng Kanban kéo thả và giao diện Biên bản họp AI."
        ),
    ))
    db.commit()
    db.close()

    print("[OK] Seed 'TaskMaster AI' - 12 tasks in Sprint 1, 2 members only!")
    print("  Login: camtu/123 (PM/Leader) | ducmanh/123 (Member)")


if __name__ == "__main__":
    seed_db()
