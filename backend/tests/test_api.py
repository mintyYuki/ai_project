import asyncio
from datetime import UTC, datetime, timedelta

from auth import get_password_hash
from httpx import ASGITransport, AsyncClient
from main import app
from models import User, UserRole, Mechanic, Service
import pytest

def get_auth_token(client, email, password):
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    return response.json()["access_token"]

def test_role_access_control(client):
    admin_token = get_auth_token(client, "admin@example.com", "password123")
    client_token = get_auth_token(client, "client@example.com", "password123")
    mechanic_token = get_auth_token(client, "mechanic@example.com", "password123")

    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    headers_client = {"Authorization": f"Bearer {client_token}"}
    headers_mechanic = {"Authorization": f"Bearer {mechanic_token}"}

    resp = client.get("/api/admin/reports", headers=headers_admin)
    assert resp.status_code == 200

    resp = client.get("/api/admin/reports", headers=headers_client)
    assert resp.status_code == 403

    resp = client.get("/api/admin/reports", headers=headers_mechanic)
    assert resp.status_code == 403

    service_id = client.get("/api/services").json()[0]["id"]
    mechanic_id = client.get("/api/mechanics").json()[0]["id"]
    future_time = (datetime.now(UTC) + timedelta(days=1)).isoformat()

    booking_payload = {
        "mechanic_id": mechanic_id,
        "service_id": service_id,
        "start_at": future_time
    }

    resp = client.post("/api/bookings", json=booking_payload, headers=headers_admin)
    assert resp.status_code == 201

    resp = client.post("/api/bookings", json=booking_payload, headers=headers_mechanic)
    assert resp.status_code == 403

@pytest.mark.asyncio
async def test_booking_concurrency():
    from tests.conftest import TestingSessionLocal
    db = TestingSessionLocal()
    
    client_user = User(email="concurrent_client@example.com", password=get_password_hash("password123"), role=UserRole.client)
    db.add(client_user)
    db.commit()
    db.refresh(client_user)

    mechanic_user = User(email="concurrent_mech@example.com", password=get_password_hash("password123"), role=UserRole.mechanic)
    db.add(mechanic_user)
    db.commit()
    db.refresh(mechanic_user)

    mechanic = Mechanic(user_id=mechanic_user.id, specialization="Brakes")
    service = Service(name="Brake Repair", duration_minutes=60, price=100.00)
    db.add_all([mechanic, service])
    db.commit()
    db.refresh(mechanic)
    db.refresh(service)
    
    mech_id = mechanic.id
    serv_id = service.id
    db.close()

    from fastapi.testclient import TestClient
    with TestClient(app) as tc:
        token = get_auth_token(tc, "concurrent_client@example.com", "password123")

    headers = {"Authorization": f"Bearer {token}"}
    future_time = (datetime.now(UTC) + timedelta(days=2)).isoformat()
    booking_payload = {
        "mechanic_id": mech_id,
        "service_id": serv_id,
        "start_at": future_time
    }

    transport = ASGITransport(app=app)
    async def send_request(ac):
        return await ac.post("/api/bookings", json=booking_payload, headers=headers)

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        tasks = [send_request(ac) for _ in range(10)]
        responses = await asyncio.gather(*tasks)

    status_codes = [r.status_code for r in responses]
    created_count = status_codes.count(201)
    conflict_count = status_codes.count(409)

    assert created_count == 1
    assert conflict_count == 9

def test_admin_reports_and_csv(client):
    admin_token = get_auth_token(client, "admin@example.com", "password123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    resp = client.get("/api/admin/reports", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "report" in data
    assert isinstance(data["report"], list)

    resp_csv = client.get("/api/admin/reports/export-csv", headers=headers)
    assert resp_csv.status_code == 200
    assert "text/csv" in resp_csv.headers["content-type"]
    assert "Service ID" in resp_csv.text

def test_admin_reports_date_validation(client):
    admin_token = get_auth_token(client, "admin@example.com", "password123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    resp = client.get("/api/admin/reports?date_from=01-01-2023", headers=headers)
    assert resp.status_code == 400

    resp = client.get("/api/admin/reports?date_from=2023-01-01&date_to=2023-01-31", headers=headers)
    assert resp.status_code == 400

    resp = client.get("/api/admin/reports?date_from=31-01-2023&date_to=01-01-2023", headers=headers)
    assert resp.status_code == 400

    resp = client.get("/api/admin/reports?date_from=01-01-2023&date_to=31-01-2023", headers=headers)
    assert resp.status_code == 200
