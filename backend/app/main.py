from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="QL Nhom API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.routers import auth, projects, tasks, sprints, ai, members, meeting_notes

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["Projects"])
app.include_router(tasks.router, prefix="/api/v1", tags=["Tasks"])
app.include_router(sprints.router, prefix="/api/v1", tags=["Sprints"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["AI"])
app.include_router(members.router, prefix="/api/v1", tags=["Members"])
app.include_router(meeting_notes.router, prefix="/api/v1", tags=["MeetingNotes"])


@app.get("/")
def root():
    return {"message": "QL Nhom API is running"}
