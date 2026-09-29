from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Literal

from database import Base, SessionLocal, engine
from models import Issue

app = FastAPI(title="CivicLens API")

Base.metadata.create_all(bind=engine)


class IssueCreate(BaseModel):
    title: str
    description: str
    category: str
    location: str
    priority: Literal["Low", "Medium", "High"]


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@app.get("/")
def root():
    return {
        "message": "CivicLens backend is running",
        "status": "ok",
    }


@app.get("/issues")
def get_issues(db: Session = Depends(get_db)):
    return db.query(Issue).all()


@app.post("/issues")
def create_issue(
    issue_data: IssueCreate,
    db: Session = Depends(get_db),
):
    new_issue = Issue(
        title=issue_data.title,
        description=issue_data.description,
        category=issue_data.category,
        location=issue_data.location,
        priority=issue_data.priority,
        confirmations=0,
        status="Open",
    )

    db.add(new_issue)
    db.commit()
    db.refresh(new_issue)

    return new_issue


@app.post("/issues/{issue_id}/confirm")
def confirm_issue(
    issue_id: int,
    db: Session = Depends(get_db),
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    if issue is None:
        raise HTTPException(
            status_code=404,
            detail="Issue not found",
        )

    issue.confirmations += 1

    db.commit()
    db.refresh(issue)

    return issue