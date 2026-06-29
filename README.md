# Richie Auth Backend

A minimal FastAPI backend for sign up and sign in using Supabase Auth.

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

## Run

```bash
uvicorn app.main:app --reload
```

## Endpoints

- `GET /health`
- `POST /auth/signup`
- `POST /auth/signin`
