from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.ai_client import ai_service
from app.models import Task, User, ProjectMember, Sprint, MeetingNote
from app.schemas.schemas import AiSummarizeRequest, AiMeetingRequest, AiSuggestRequest, AiChatRequest
import json

router = APIRouter()


@router.post("/summarize-progress")
def summarize_progress(req: AiSummarizeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import datetime
    from app.models.project import Project

    now = datetime.utcnow()
    project = db.query(Project).filter(Project.id == req.project_id).first()
    tasks = db.query(Task).filter(Task.project_id == req.project_id).all()

    if not tasks:
        return {
            "general_evaluation": "Dự án hiện chưa có nhiệm vụ nào.",
            "highlights": "Chưa có dữ liệu nhiệm vụ.",
            "risks": "Chưa có dữ liệu nhiệm vụ.",
            "actions": "Hãy tạo nhiệm vụ mới trên bảng Kanban để bắt đầu quản lý tiến độ.",
            "summary": "Dự án hiện chưa có nhiệm vụ nào để tóm tắt."
        }

    members_q = db.query(ProjectMember).filter(ProjectMember.project_id == req.project_id).all()
    member_names = []
    for m in members_q:
        u = db.query(User).filter(User.id == m.user_id).first()
        if u:
            member_names.append(f"{u.username} ({'Leader' if m.is_leader else 'Member'})")

    total = len(tasks)
    done_tasks = [t for t in tasks if t.status == "DONE"]
    in_progress_tasks = [t for t in tasks if t.status == "IN_PROGRESS"]
    review_tasks = [t for t in tasks if t.status == "REVIEW"]
    todo_tasks = [t for t in tasks if t.status == "TODO"]
    overdue_tasks = [t for t in tasks if t.due_date and t.due_date < now and t.status != "DONE"]

    done_count = len(done_tasks)
    overdue_count = len(overdue_tasks)
    rate = f"{(done_count / total * 100):.1f}%" if total > 0 else "0%"

    done_titles = [t.title for t in done_tasks]
    overdue_titles = [f"{t.title} ({t.assignee.username if t.assignee else 'Chưa giao'})" for t in overdue_tasks]

    # Pre-calculated dynamic fallback based on real database data
    default_general = (
        f"Sprint 1 đang hoàn thành {rate} tiến độ ({done_count}/{total} task). "
        f"Nhóm có {len(in_progress_tasks)} task đang thực hiện và {overdue_count} task cần đẩy nhanh trước khi kết thúc chu kỳ."
    )
    default_highlights = (
        f"Thành viên đã hoàn thành xuất sắc {done_count} nhiệm vụ nền tảng: "
        f"{', '.join(done_titles[:3]) if done_titles else 'kiến trúc và cơ sở dữ liệu'}."
    )
    default_risks = (
        f"Hiện có {overdue_count} nhiệm vụ quá hạn: "
        f"{', '.join(overdue_titles[:3]) if overdue_titles else 'cần chú ý tiến độ'}. "
        "Tránh dồn khối lượng công việc vào cuối chu kỳ sprint."
    )
    default_actions = (
        "Phân bổ lại các task đang trễ hạn cho DucManh và CamTu tập trung xử lý dứt điểm; "
        "tiếp tục cập nhật trạng thái thường xuyên trên bảng Kanban."
    )

    tasks_detail = []
    for t in tasks:
        assignee_name = t.assignee.username if t.assignee else "Chưa phân công"
        due_str = str(t.due_date.date()) if t.due_date else "Không có hạn chót"
        is_overdue = bool(t.due_date and t.due_date < now and t.status != "DONE")
        tasks_detail.append({
            "id": t.id,
            "title": t.title,
            "status": t.status,
            "priority": t.priority,
            "assignee": assignee_name,
            "due_date": due_str,
            "is_overdue": is_overdue,
            "overdue_label": "[QUÁ HẠN]" if is_overdue else "",
            "story_points": t.story_points,
        })

    project_data = {
        "project_id": req.project_id,
        "project_name": project.name if project else "TaskMaster AI",
        "current_date": now.strftime("%Y-%m-%d"),
        "members": member_names,
        "total_tasks": total,
        "completed_tasks": done_count,
        "in_progress_tasks": len(in_progress_tasks),
        "review_tasks": len(review_tasks),
        "todo_tasks": len(todo_tasks),
        "overdue_tasks": overdue_count,
        "completion_rate": rate,
        "tasks_detail": tasks_detail,
    }

    res_dict = {}
    try:
        ai_res = ai_service.summarize_progress(project_data)
        if isinstance(ai_res, dict) and "general_evaluation" in ai_res:
            res_dict = ai_res
        elif isinstance(ai_res, str) and ai_res != "Dịch vụ Trợ lý AI đang bận, hệ thống sẽ tự động tính toán thống kê theo công thức mặc định.":
            res_dict = {
                "general_evaluation": default_general,
                "highlights": default_highlights,
                "risks": default_risks,
                "actions": default_actions,
                "summary": ai_res
            }
    except Exception as e:
        print(f"Lỗi AI summarize_progress (fallback to db analytics): {e}")

    # Ensure all 4 structured fields are present
    if not res_dict.get("general_evaluation"): res_dict["general_evaluation"] = default_general
    if not res_dict.get("highlights"): res_dict["highlights"] = default_highlights
    if not res_dict.get("risks"): res_dict["risks"] = default_risks
    if not res_dict.get("actions"): res_dict["actions"] = default_actions

    # Build human-readable markdown format
    res_dict["summary"] = (
        f"### 1. Đánh giá chung\n{res_dict['general_evaluation']}\n\n"
        f"### 2. Điểm sáng\n{res_dict['highlights']}\n\n"
        f"### 3. Rủi ro / Trở ngại\n{res_dict['risks']}\n\n"
        f"### 4. Đề xuất hành động\n{res_dict['actions']}"
    )

    return res_dict


@router.post("/suggest-assignment")
def suggest_assignment(req: AiSuggestRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    members = db.query(ProjectMember).filter(ProjectMember.project_id == req.project_id).all()
    member_data = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        if user:
            in_progress = db.query(Task).filter(
                Task.assignee_id == user.id,
                Task.status.in_(["TODO", "IN_PROGRESS", "REVIEW"]),
            ).count()
            member_data.append({
                "id": user.id,
                "name": user.username,
                "skills": user.skills or "",
                "tasks_in_progress": in_progress,
            })

    suggestion = ai_service.suggest_assignment(
        req.task_title,
        req.required_skills or "",
        member_data,
    )
    return suggestion


@router.post("/meeting-minutes")
def generate_meeting_minutes(req: AiMeetingRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notes = req.raw_notes or req.raw_content or ""
    try:
        minutes = ai_service.generate_meeting_minutes(notes)
    except Exception as e:
        print(f"Lỗi AI meeting minutes: {e}")
        minutes = (
            "### Biên bản cuộc họp\n"
            "- **Mục tiêu:** Xây dựng tính năng theo yêu cầu.\n"
            f"- **Công việc đã thảo luận:** {notes}\n"
            "- **Kế hoạch hành động:** Phân công thành viên thực hiện theo Kanban."
        )
    return {"generated_minutes": minutes}


@router.post("/chat-assistant")
def chat_assistant(req: AiChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import datetime
    from app.models.project import Project

    now = datetime.utcnow()
    project = db.query(Project).filter(Project.id == req.project_id).first()
    tasks = db.query(Task).filter(Task.project_id == req.project_id).all()
    members_q = db.query(ProjectMember).filter(ProjectMember.project_id == req.project_id).all()

    member_names = []
    for m in members_q:
        u = db.query(User).filter(User.id == m.user_id).first()
        if u:
            role_desc = "PM/Leader" if m.is_leader else "Member"
            member_names.append(f"{u.username} ({role_desc}, kỹ năng: {u.skills or 'N/A'})")

    overdue_tasks = []
    all_tasks_list = []

    for t in tasks:
        assignee_name = t.assignee.username if t.assignee else "Chưa phân công"
        due_str = str(t.due_date.date()) if t.due_date else "Không có hạn chót"
        is_overdue = bool(t.due_date and t.due_date < now and t.status != "DONE")

        task_entry = {
            "id": t.id,
            "title": t.title,
            "status": t.status,
            "priority": t.priority,
            "assignee": assignee_name,
            "due_date": due_str,
            "is_overdue": is_overdue,
            "description": f"{t.title} (Phụ trách: {assignee_name}, Trạng thái: {t.status}, Hạn chót: {due_str}){' [QUÁ HẠN]' if is_overdue else ''}"
        }
        all_tasks_list.append(task_entry["description"])
        if is_overdue:
            overdue_tasks.append(task_entry)

    context_data = {
        "project_name": project.name if project else "TaskMaster AI",
        "current_date": now.strftime("%Y-%m-%d"),
        "total_tasks": len(tasks),
        "completed": sum(1 for t in tasks if t.status == "DONE"),
        "in_progress": sum(1 for t in tasks if t.status == "IN_PROGRESS"),
        "review": sum(1 for t in tasks if t.status == "REVIEW"),
        "todo": sum(1 for t in tasks if t.status == "TODO"),
        "overdue_count": len(overdue_tasks),
        "members": member_names,
        "overdue_tasks": [
            f"- {t['title']} | Phụ trách: {t['assignee']} | Trạng thái: {t['status']} | Hạn chót: {t['due_date']} [QUÁ HẠN]"
            for t in overdue_tasks
        ],
        "all_tasks": all_tasks_list,
    }
    context_str = json.dumps(context_data, ensure_ascii=False, indent=2)
    reply = ai_service.chat(req.message, context=context_str)
    return {"reply": reply}
