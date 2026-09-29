from fastapi import FastAPI

app = FastAPI(title="CivicLens API")


@app.get("/")
def root():
    return {
        "message": "CivicLens backend is running",
        "status": "ok"
    }