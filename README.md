# StudyHub Student Dashboard

A FastAPI and Supabase Auth student management app with a responsive frontend dashboard.

## Setup

1. Create a virtual environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Copy the environment example:
   ```bash
   copy .env.example .env
   ```
4. Fill in your Supabase project values in `.env`.
   ```env
   SUPABASE_URL=your-project-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_ANON_KEY=your-anon-key
   ```
5. Run the profile dashboard SQL in Supabase SQL Editor:
   ```bash
   supabase_dashboard.sql
   ```

## Run

```bash
uvicorn app:app --reload
```

In another terminal, install frontend dependencies and start Vite:

```bash
npm install
npm run dev
```

## Endpoints

- `GET /`
- `POST /auth/signup`
- `POST /auth/signin`
- `GET /profile/me`
- `PATCH /profile/me`
