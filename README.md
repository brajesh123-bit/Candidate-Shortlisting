# Candidate Profile Shortlisting System

A full-stack candidate shortlisting platform built with:

- `Express` + `MongoDB` + `Mongoose`
- `React` + `Vite`
- `OpenRouter` for AI-assisted candidate ranking and explanations

## Features

- Add and manage candidate profiles
- Search and filter candidates
- Basic shortlist scoring using skill overlap and experience fit
- AI-based shortlist suggestions with explanations
- Suggested interview questions for top matches
- Save promising candidates for later review
- Production setup where the backend can serve the frontend build

## Project Structure

```text
backend/   Express API, MongoDB models, AI integration
frontend/  React recruiter dashboard
```

## Environment Variables

Create `backend/.env` from `.env.example`:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=google/gemma-2-9b-it:free
FRONTEND_URL=http://localhost:5173
```

## Run Locally

1. Install dependencies:

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

2. Start MongoDB locally or use MongoDB Atlas.

3. Run the app:

```bash
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:5000`

If `MONGODB_URI` is not set, the backend automatically falls back to in-memory storage for quick demos. For real persistence and deployment, use MongoDB Atlas or a local MongoDB instance.

By default, this project is configured to use `google/gemma-2-9b-it:free`. You can switch to any specific paid or free model later by changing `OPENROUTER_MODEL`.

## API Endpoints

### Candidates

- `POST /api/candidates`
- `GET /api/candidates`
- `PATCH /api/candidates/:id/save`

### Matching

- `POST /api/match`
- `POST /api/ai/shortlist`
- `GET /api/health`

## Deployment

### Option 1: Render

- Create a MongoDB Atlas database
- Deploy the backend as a Web Service
- Set environment variables from `.env.example`
- Build command:

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
npm run build
```

- Start command:

```bash
npm start
```

### Option 2: Railway

- Provision a MongoDB plugin or connect Atlas
- Add the same environment variables
- Use the same build and start commands as above

In production, the Express server will serve the built frontend from `frontend/dist`.

## Sample Request Bodies

### Add Candidate

```json
{
  "name": "Rahul Sharma",
  "email": "rahul@gmail.com",
  "skills": ["React", "Node.js", "MongoDB"],
  "experience": 2,
  "bio": "Frontend-heavy full-stack engineer",
  "projects": ["Hiring dashboard", "Inventory app"]
}
```

### Basic Match

```json
{
  "requiredSkills": ["React", "Node.js"],
  "preferredSkills": ["MongoDB", "AWS"],
  "minExperience": 2
}
```
