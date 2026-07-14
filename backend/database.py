import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# Use DATABASE_URL if provided, else default to local SQLite .db file
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./hcp_crm.db")

# For SQLite, we need connect_args={"check_same_thread": False}.
# For Postgres/MySQL, this arg is invalid, so we conditionally add it.
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
