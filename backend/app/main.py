from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response
from fastapi import Request
import os
from dotenv import load_dotenv
from sqlalchemy import inspect, text
from app.models import Base
from app.models.database import engine

# Import routers correctly from each file
from app.routes.auth import router as auth_router
from app.routes.jobs import router as jobs_router
from app.routes.users import router as users_router
from app.routes.delivery_proofs import router as delivery_proofs_router
from app.routes.driver_ratings import router as driver_ratings_router
from app.routes.production_stock import router as production_stock_router
from app.routes.activity_logs import router as activity_logs_router
from app.routes.directories import router as directories_router
from app.routes.payments import router as payments_router

load_dotenv()

# Create database tables
Base.metadata.create_all(bind=engine)

def _ensure_schema_alignment():
    insp = inspect(engine)
    try:
        driver_cols = [c["name"] for c in insp.get_columns("driver_profiles")]
        if "user_id" not in driver_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE driver_profiles ADD COLUMN user_id INT NULL"))
                try:
                    conn.execute(text("ALTER TABLE driver_profiles ADD CONSTRAINT fk_driver_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL"))
                except Exception:
                    pass
        try:
            job_cols = [c["name"] for c in insp.get_columns("jobs")]
            with engine.begin() as conn:
                if "price_per_case" not in job_cols:
                    conn.execute(text("ALTER TABLE jobs ADD COLUMN price_per_case FLOAT NOT NULL DEFAULT 0"))
                if "total_price" not in job_cols:
                    conn.execute(text("ALTER TABLE jobs ADD COLUMN total_price FLOAT NOT NULL DEFAULT 0"))
                if "payment_mode" not in job_cols:
                    conn.execute(text("ALTER TABLE jobs ADD COLUMN payment_mode VARCHAR(20) NOT NULL DEFAULT 'UPI'"))
                if "payment_status" not in job_cols:
                    conn.execute(text("ALTER TABLE jobs ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'"))
        except Exception:
            pass
    except Exception:
        pass

_ensure_schema_alignment()

# Initialize FastAPI app
app = FastAPI(
    title="Production & Logistics Tracking System",
    description="A comprehensive system for tracking production, assignments, and deliveries",
    version="1.0.0"
)

# Configure CORS
_frontend_url = os.getenv("FRONTEND_URL", "")
_allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]
if _frontend_url:
    _allowed_origins.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# @app.middleware("http")
# async def allow_preflight(request: Request, call_next):
#     if request.method == "OPTIONS":
#         return Response(status_code=200)
#     return await call_next(request)

# Static files (uploads)
uploads_dir = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(uploads_dir, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Include routers
app.include_router(auth_router)
app.include_router(jobs_router)
app.include_router(users_router)
app.include_router(delivery_proofs_router)
app.include_router(driver_ratings_router)
app.include_router(production_stock_router)
app.include_router(activity_logs_router)
app.include_router(directories_router)
app.include_router(payments_router)

@app.get("/")
def root():
    return {
        "message": "Production & Logistics Tracking System API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
