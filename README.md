# Scholar Awards — Monorepo

This monorepo contains both the frontend and backend for the Scholar Awards application.

## Structure

```
ScholarAward-/
├── frontend/   # React + Vite (deployed on Vercel)
└── backend/    # Node.js + Express (deployed on Render)
```

## Deployments

| Service  | Platform | Root Dir   |
|----------|----------|------------|
| Frontend | Vercel   | `frontend` |
| Backend  | Render   | `backend`  |

## Local Development

```bash
# Install dependencies
cd frontend && npm install
cd ../backend && npm install

# Run frontend (port 5173)
cd frontend && npm run dev

# Run backend
cd backend && npm run dev
```

## Deployment Notes

### Vercel (Frontend)
In your Vercel project settings, set **Root Directory** to `frontend`.

### Render (Backend)
In your Render service settings, set **Root Directory** to `backend`.
All environment variables (MONGODB_URI, JWT_SECRET, CLOUDINARY_*, etc.) must be set in Render's dashboard.
