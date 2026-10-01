# CivicLens

CivicLens is a community issue reporting dashboard built for WarriorHacks 2.0. Residents can report local problems, see them on a map, and confirm issues that need attention.

## Features

- Report street, sidewalk, garbage, intersection, and public-space issues with a map location.
- Automatically classify reports using the backend's keyword and rule-based classifier.
- Browse reports on a Leaflet map with OpenStreetMap tiles and attribution.
- Confirm an issue once per browser session; confirmations contribute to its urgency score.
- Track active reports, high-priority reports, confirmations, and resolved reports.

Urgency is calculated as 10 points for Low, 20 for Medium, or 30 for High priority, plus the report's confirmation count. Issues are ordered by urgency.

## Requirements

- Python 3.10 or newer
- Node.js and npm

## Run locally

Start the backend in one terminal:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8002
```

Start the frontend in a second terminal:

```bash
cd frontend
npm install
npm run dev -- --port 5175
```

Open the local URL printed by Vite (typically `http://localhost:5175`). The frontend expects the API at `http://127.0.0.1:8002`.

## API routes

- `GET /` — API health check
- `GET /issues` — list issues, optionally filtered by priority, category, or status
- `POST /issues` — create an issue; category and priority are assigned by the rule-based classifier
- `POST /issues/{issue_id}/confirm` — add a community confirmation
- `PATCH /issues/{issue_id}/status` — update an issue status
- `POST /classify` — preview the rule-based classification for a title and description

Interactive API documentation is available at `http://127.0.0.1:8002/docs` while the backend is running.

## Frontend checks

From `frontend/`:

```bash
npm run lint
npm run build
```

The backend stores data in a local SQLite database at `backend/civiclens.db`.
