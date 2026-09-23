from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project, ProjectMember
from app.models.task import Task
from app.schemas.schemas import ProjectCreate, ProjectResponse
from datetime import datetime

router = APIRouter()

@router.get("", response_model=list[ProjectResponse])
@router.get("/", response_model=list[ProjectResponse])
def list_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == "ADMIN":
        return db.query(Project).all()
    else:
        member_projects = db.query(ProjectMember).filter(ProjectMember.user_id == current_user.id).all()
        project_ids = [m.project_id for m in member_projects]
        return db.query(Project).filter(Project.id.in_(project_ids)).all()

@router.post("", response_model=ProjectResponse)
@router.post("/", response_model=ProjectResponse)
def create_project(project: ProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_project = Project(
        name=project.name,
        description=project.description or "",
        created_at=datetime.utcnow()
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    
    member = ProjectMember(project_id=new_project.id, user_id=current_user.id, is_leader=True)
    db.add(member)
    db.commit()
    
    return new_project

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: int, project_update: ProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["ADMIN", "PM"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    project.name = project_update.name
    if project_update.description is not None:
        project.description = project_update.description
    
    db.commit()
    db.refresh(project)
    return project

@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["ADMIN", "PM"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}

@router.get("/{project_id}/stats")
def get_project_stats(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    
    total = len(tasks)
    done = sum(1 for t in tasks if t.status == "DONE")
    in_progress = sum(1 for t in tasks if t.status == "IN_PROGRESS")
    review = sum(1 for t in tasks if t.status == "REVIEW")
    todo = sum(1 for t in tasks if t.status == "TODO")
    
    now = datetime.utcnow()
    overdue = sum(1 for t in tasks if t.due_date and t.due_date < now and t.status != "DONE")
    
    completion_rate = (done / total * 100) if total > 0 else 0
    
    return {
        "total_tasks": total,
        "done": done,
        "in_progress": in_progress,
        "review": review,
        "todo": todo,
        "overdue": overdue,
        "completion_rate": completion_rate
    }
