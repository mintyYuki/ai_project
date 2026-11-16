import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import Base, get_db
from main import app
from models import User, UserRole, Service, Mechanic
from auth import get_password_hash

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    admin_user = User(email="admin@example.com", password=get_password_hash("password123"), role=UserRole.administrator)
    client_user = User(email="client@example.com", password=get_password_hash("password123"), role=UserRole.client)
    mechanic_user = User(email="mechanic@example.com", password=get_password_hash("password123"), role=UserRole.mechanic)
    db.add_all([admin_user, client_user, mechanic_user])
    db.commit()
    db.refresh(admin_user)
    db.refresh(client_user)
    db.refresh(mechanic_user)

    service = Service(name="Oil Change", duration_minutes=30, price=50.00)
    db.add(service)
    db.commit()
    db.refresh(service)

    mechanic = Mechanic(user_id=mechanic_user.id, specialization="Engine")
    db.add(mechanic)
    db.commit()

    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def client():
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
