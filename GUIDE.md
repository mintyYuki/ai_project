# Car Service Management System - Complete Guide & Documentation

## 1. About the Project
The **Car Service Management System** is a full-stack web application designed for automobile service centers. It provides a robust, role-based workflow platform connecting clients, mechanics, and administrators.

### Core Capabilities:
- **Role-Based Access Control (RBAC):** Three distinct user roles (`client`, `mechanic`, `administrator`).
- **Service & Mechanic Catalog:** Browse available services with pricing and duration, along with specialist mechanic profiles.
- **Concurrent Booking Engine:** Clients can schedule service appointments. The backend uses strict transaction locking (`SELECT ... FOR UPDATE`) to prevent double-building and time overlaps.
- **Client Panel:** View personal bookings, track statuses (`created`, `confirmed`, `completed`, `cancelled`), and cancel active appointments.
- **Mechanic Panel:** View daily schedules by date and update booking statuses.
- **Administrator Panel:** Comprehensive SQL analytics reports with custom date range filtering and authenticated CSV report export.
- **Dark Mode UI:** Modern Material-You inspired dark-mode interface.
- **Verbose Logging & Security:** JWT authentication with access/refresh token rotation, comprehensive backend request/response middleware logging, and Axios frontend interceptors.

---

## 2. Tech Stack
- **Backend:** Python, FastAPI, SQLAlchemy, Alembic, PostgreSQL, Pydantic, Pytest.
- **Frontend:** React, TypeScript, Vite, React Router, Axios, Oxlint.
- **Package Manager:** `pnpm` (frontend), `pip`/`venv` (backend).

---

## 3. Environment Configuration (`.env`)
The backend relies on environment variables defined in `backend/.env` (you can copy `backend/.env.example` to `backend/.env`).

```env
DATABASE_URL=postgresql://postgres@localhost:5432/carservice
SECRET_KEY=your-super-secret-jwt-key-here
REFRESH_TOKEN_EXPIRE_DAYS=7
```
> *Note:* Ensure PostgreSQL is running locally and that the database `carservice` exists.

---

## 4. Database Setup & Migrations

### Step 1: Create the Database
Ensure PostgreSQL is running and create the `carservice` database if it doesn't already exist:
```bash
psql -U postgres -c "CREATE DATABASE carservice;"
```

### Step 2: Run Alembic Migrations
Apply database schema migrations to create all required tables (`users`, `refresh_tokens`, `services`, `mechanics`, `bookings`, `action_logs`):
```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

---

## 5. Database Seeding
To populate the database with comprehensive mock test data (5+ services, 4 specialized mechanics, and test users for all roles), run the seeding script:

```bash
backend/venv/bin/python backend/seed.py
```

### Seeded Test Accounts:
- **Administrator:** `admin@carservice.com` / `adminpassword123`
- **Client:** `client@carservice.com` / `clientpassword123`
- **Mechanics:**
  - `mechanic1@carservice.com` / `mech1pass` (Engine & Transmission)
  - `mechanic2@carservice.com` / `mech2pass` (Brakes & Suspension)
  - `mechanic3@carservice.com` / `mech3pass` (Electrical & Diagnostics)
  - `mechanic4@carservice.com` / `mech4pass` (General Maintenance & Oil Change)

---

## 6. How to Start the Application

### 1. Start the Backend Server
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```
*(The backend API runs at `http://localhost:8000` with interactive docs at `http://localhost:8000/docs`)*

### 2. Start the Frontend Development Server
Open a new terminal window:
```bash
pnpm --dir frontend dev
```
*(The frontend runs at `http://localhost:5173`)*

---

## 7. How to Run Tests & Linting

### Run Backend Tests:
```bash
pytest
```

### Run Frontend Linter (`oxlint`):
```bash
pnpm --dir frontend lint
```
