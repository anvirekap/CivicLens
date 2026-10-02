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

To point the frontend at a different API while developing, set `VITE_API_URL` in `frontend/.env.local`. See [frontend/.env.example](frontend/.env.example).

## Deploy

The repository includes a Render Blueprint (`render.yaml`) for the static frontend and FastAPI service. The API is configured to use a hosted PostgreSQL database in production; local development continues to use SQLite.

1. Create a Supabase project and open **Connect** → **Session pooler**. Copy the PostgreSQL connection string. Render's backend uses IPv4, so Supabase's session pooler is the compatible connection option. Keep this string private.
2. In Render, choose **New** → **Blueprint**, connect the `anvirekap/CivicLens` GitHub repository, and select the branch containing the deployment changes.
3. When Render asks for `DATABASE_URL`, paste the Supabase session-pooler connection string. The Blueprint creates `civiclens-api` and `civiclens-web`; its configured public URLs are `https://civiclens-api.onrender.com` and `https://civiclens-web.onrender.com`.
4. Wait for both services to finish deploying. Open the web URL and check that issue loading works. The API health check is available at `https://civiclens-api.onrender.com/`.

If Render requires different service names because those names are already in use, update the corresponding `VITE_API_URL` and `CORS_ORIGINS` values in `render.yaml` to match the generated `onrender.com` URLs. If you connect a custom frontend domain, add its full `https://` origin to the API's `CORS_ORIGINS` setting.

Render's free web service may sleep when idle, so its first request after a quiet period can take longer. The frontend is hosted as a static site. See [Render's free instance details](https://render.com/docs/free) and [Supabase's connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres).

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

The backend stores data in a local SQLite database at `backend/civiclens.db` unless `DATABASE_URL` is set. Production should use a persistent PostgreSQL database.
