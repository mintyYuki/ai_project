import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Numeric, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from database import Base

class UserRole(str, enum.Enum):
    client = "client"
    mechanic = "mechanic"
    administrator = "administrator"

class BookingStatus(str, enum.Enum):
    created = "created"
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String