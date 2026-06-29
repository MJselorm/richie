from fastapi import FastAPI
from auth import router
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI(title="Richie Auth API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root():
    return {
        "status": "running"
    }