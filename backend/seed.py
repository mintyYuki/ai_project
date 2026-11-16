import sys
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import User, Mechanic, Service, UserRole
from auth import get_password_hash

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    
    try:
        # Check if already seeded
        existing_admin = db.query(User).filter(User.email == "admin@carservice.com").first()
        if existing_admin:
            print("Database is already seeded. Skipping seed process.")
            return

        print("Starting database seeding within transaction...")

        # 1. Seed Users (All roles used)
        admin_user = User(
            email="admin@carservice.com",
            password=get_password_hash("adminpassword123"),
            role=UserRole.administrator
        )
        db.add(admin_user)

        client_user = User(
            email="client@carservice.com",
            password=get_password_hash("clientpassword123"),
            role=UserRole.client
        )
        db.add(client_user)

        mechanic_users = [
            User(email="mechanic1@carservice.com", password=get_password_hash("mech1pass"), role=UserRole.mechanic),
            User(email="mechanic2@carservice.com", password=get_password_hash("mech2pass"), role=UserRole.mechanic),
            User(email="mechanic3@carservice.com", password=get_password_hash("mech3pass"), role=UserRole.mechanic),
            User(email="mechanic4@carservice.com", password=get_password_hash("mech4pass"), role=UserRole.mechanic),
        ]
        db.add_all(mechanic_users)
        db.flush() # Flush to get IDs

        # 2. Seed Mechanics (4 mechanics with various specializations)
        mechanics = [
            Mechanic(user_id=mechanic_users[0].id, specialization="Engine & Transmission"),
            Mechanic(user_id=mechanic_users[1].id, specialization="Brakes & Suspension"),
            Mechanic(user_id=mechanic_users[2].id, specialization="Electrical & Diagnostics"),
            Mechanic(user_id=mechanic_users[3].id, specialization="General Maintenance & Oil Change"),
        ]
        db.add_all(mechanics)

        # 3. Seed Services (At least 5 services)
        services = [
            Service(name="Замена масла и фильтров", duration_minutes=30, price=2500.0),
            Service(name="Диагностика подвески", duration_minutes=45, price=1500.0),
            Service(name="Ремонт тормозной системы", duration_minutes=90, price=5000.0),
            Service(name="Компьютерная диагностика ЭБУ", duration_minutes=30, price=2000.0),
            Service(name="Замена ремня ГРМ", duration_minutes=180, price=12000.0),
            Service(name="Регулировка сход-развала", duration_minutes=60, price=3000.0),
        ]
        db.add_all(services)

        db.commit()
        print("Database seeded successfully with all mock data!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
