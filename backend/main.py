from classifier import classify_issue
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
    location: str
    latitude: float
    longitude: float

class IssueStatusUpdate(BaseModel):
    status: Literal["Open", "In Progress", "Resolved"]

class IssueClassificationRequest(BaseModel):
    title: str
    description: str


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def calculate_urgency(priority: str, confirmations: int):
    priority_points = {
        "Low": 1,
        "Medium": 2,
        "High": 3,
    }

    return priority_points[priority] * 10 + confirmations


@app.get("/")
def root():
    return {
        "message": "CivicLens backend is running",
        "status": "ok",
    }


@app.get("/issues")
def get_issues(
    priority: str | None = None,
    category: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Issue)

    if priority:
        query = query.filter(Issue.priority == priority)

    if category:
        query = query.filter(Issue.category == category)

    if status:
        query = query.filter(Issue.status == status)

    issues = query.all()

    results = []

    for issue in issues:
        results.append(
            {
                "id": issue.id,
                "title": issue.title,
                "description": issue.description,
                "category": issue.category,
                "location": issue.location,
                "latitude": issue.latitude,
                "longitude": issue.longitude,
                "priority": issue.priority,
                "confirmations": issue.confirmations,
                "status": issue.status,
                "urgency_score": calculate_urgency(
                    issue.priority,
                    issue.confirmations,
                ),
            }
        )

    return sorted(
        results,
        key=lambda issue: issue["urgency_score"],
        reverse=True,
    )


@app.post("/issues")
def create_issue(
    issue_data: IssueCreate,
    db: Session = Depends(get_db),
):
    classification = classify_issue(
        issue_data.title,
        issue_data.description,
    )

    new_issue = Issue(
        title=issue_data.title,
        description=issue_data.description,
        category=classification["category"],
        location=issue_data.location,
        latitude=issue_data.latitude,
        longitude=issue_data.longitude,
        priority=classification["priority"],
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
        raise HTTPException(status_code=404, detail="Issue not found")

    issue.confirmations += 1

    db.commit()
    db.refresh(issue)

    return issue

@app.patch("/issues/{issue_id}/status")
def update_issue_status(
    issue_id: int,
    status_data: IssueStatusUpdate,
    db: Session = Depends(get_db),
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")

    issue.status = status_data.status

    db.commit()
    db.refresh(issue)

    return issue

@app.post("/classify")
def classify_report(report: IssueClassificationRequest):
    return classify_issue(
        report.title,
        report.description,
    )