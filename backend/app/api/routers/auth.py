from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.models.user import User
from app.schemas.schemas import LoginRequest

router = APIRouter()

@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    try:
        user = db.query(User).filter(User.username == request.username).first()
        if not user or not verify_password(request.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        token = create_access_token(data={"sub": str(user.id)})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "role": user.role,
                "skills": user.skills
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during login")
