from datetime import datetime, timedelta, timezone, date
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from pydantic import BaseModel, EmailStr

from database import get_db
from models import User, RefreshToken, UserRole, Service, Mechanic, Booking, BookingStatus, ActionLog
from auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_token,
    get_current_user,
    require_role,
    REFRESH_TOKEN_EXPIRE_DAYS
)

app = FastAPI(title="Car Service API", version="1.0.0")

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    role: UserRole

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: str

class BookingCreate(BaseModel):
    mechanic_id: int
    service_id: int
    start_at: datetime

class StatusChangeRequest(BaseModel):
    status: BookingStatus

# Valid state transitions mapping
VALID_TRANSITIONS = {
    BookingStatus.created: [BookingStatus.confirmed, BookingStatus.cancelled],
    BookingStatus.confirmed: [BookingStatus.completed, BookingStatus.cancelled],
    BookingStatus.completed: [],
    BookingStatus.cancelled: []
}

@app.get("/")
def read_root():
    return {"message": "Welcome to Car Service API"}

@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        password=hashed_password,
        role=user_data.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "User registered successfully", "user_id": new_user.id, "email": new_user.email}

@app.post("/api/auth/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.id, "role": user.role.value})
    refresh_token_str = create_refresh_token(data={"sub": user.id})
    
    # Save refresh token hash in db
    token_hash = hash_token(refresh_token_str)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    db_refresh_token = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
        revoked=False
    )
    db.add(db_refresh_token)
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token_str,
        "token_type": "bearer"
    }

@app.post("/api/auth/refresh", response_model=TokenResponse)
def refresh_token(body: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        
    token_hash = hash_token(body.refresh_token)
    db_token = db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.token_hash == token_hash
    ).first()
    
    if not db_token or db_token.revoked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked or is invalid")
        
    if db_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
    # Rotate refresh token: revoke old one and issue a new pair
    db_token.revoked = True
    
    new_access_token = create_access_token(data={"sub": user.id, "role": user.role.value})
    new_refresh_token_str = create_refresh_token(data={"sub": user.id})
    
    new_token_hash = hash_token(new_refresh_token_str)
    new_expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    new_db_refresh_token = RefreshToken(
        user_id=user.id,
        token_hash=new_token_hash,
        expires_at=new_expires_at,
        revoked=False
    )
    db.add(new_db_refresh_token)
    db.commit()
    
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token_str,
        "token_type": "bearer"
    }

@app.post("/api/auth/logout")
def logout(body: LogoutRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    token_hash = hash_token(body.refresh_token)
    db_token = db.query(RefreshToken).filter(
        RefreshToken.user_id == current_user.id,
        RefreshToken.token_hash == token_hash
    ).first()
    
    if db_token:
        db_token.revoked = True
        db.commit()
        
    return {"message": "Logged out successfully"}

@app.get("/api/services")
def list_services(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    services = db.query(Service).offset(offset).limit(limit).all()
    return services

@app.get("/api/mechanics")
def list_mechanics(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    mechanics = db.query(Mechanic).offset(offset).limit(limit).all()
    return mechanics

@app.post("/api/bookings", status_code=status.HTTP_201_CREATED)
def create_booking(
    booking_data: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.client))
):
    # Validate mechanic exists
    mechanic = db.query(Mechanic).filter(Mechanic.id == booking_data.mechanic_id).first()
    if not mechanic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mechanic not found")
        
    # Validate service exists
    service = db.query(Service).filter(Service.id == booking_data.service_id).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
        
    start_at = booking_data.start_at
    if start_at.tzinfo is None:
        start_at = start_at.replace(tzinfo=timezone.utc)
        
    if start_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot book in the past")
        
    end_at = start_at + timedelta(minutes=service.duration_minutes)
    
    try:
        db.begin_nested()
        
        existing_mechanic = db.query(Mechanic).filter(Mechanic.id == booking_data.mechanic_id).with_for_update().first()
        if not existing_mechanic:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mechanic not found")
            
        overlap = db.query(Booking).filter(
            Booking.mechanic_id == booking_data.mechanic_id,
            Booking.status.in_([BookingStatus.created, BookingStatus.confirmed]),
            or_(
                and_(Booking.start_at <= start_at, Booking.end_at > start_at),
                and_(Booking.start_at < end_at, Booking.end_at >= end_at),
                and_(Booking.start_at >= start_at, Booking.end_at <= end_at)
            )
        ).with_for_update().first()
        
        if overlap:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Mechanic is already booked for this time interval"
            )
            
        new_booking = Booking(
            client_id=current_user.id,
            mechanic_id=booking_data.mechanic_id,
            service_id=booking_data.service_id,
            start_at=start_at,
            end_at=end_at,
            status=BookingStatus.created
        )
        db.add(new_booking)
        
        # Log action
        action_log = ActionLog(
            user_id=current_user.id,
            action="CREATE_BOOKING",
            details=f"Booking {new_booking.id} created for mechanic {booking_data.mechanic_id}"
        )
        db.add(action_log)
        
        db.commit()
        db.refresh(new_booking)
        
        return {
            "message": "Booking created successfully",
            "booking_id": new_booking.id,
            "start_at": new_booking.start_at,
            "end_at": new_booking.end_at,
            "status": new_booking.status
        }
    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@app.get("/api/bookings/my")
def get_my_bookings(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Booking)
    if current_user.role == UserRole.client:
        query = query.filter(Booking.client_id == current_user.id)
    elif current_user.role == UserRole.mechanic:
        mechanic = db.query(Mechanic).filter(Mechanic.user_id == current_user.id).first()
        if mechanic:
            query = query.filter(Booking.mechanic_id == mechanic.id)
        else:
            return []
            
    bookings = query.offset(offset).limit(limit).all()
    return bookings

@app.get("/api/mechanics/bookings")
def get_mechanic_bookings_by_date(
    date: str = Query(..., description="Date in DD-MM-YYYY format"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.mechanic))
):
    try:
        parsed_date = datetime.strptime(date, "%d-%m-%Y").date()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format, use DD-MM-YYYY")
        
    mechanic = db.query(Mechanic).filter(Mechanic.user_id == current_user.id).first()
    if not mechanic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mechanic profile not found for current user")
        
    start_of_day = datetime.combine(parsed_date, datetime.min.time()).replace(tzinfo=timezone.utc)
    end_of_day = datetime.combine(parsed_date, datetime.max.time()).replace(tzinfo=timezone.utc)
    
    bookings = db.query(Booking).filter(
        Booking.mechanic_id == mechanic.id,
        Booking.start_at >= start_of_day,
        Booking.start_at <= end_of_day
    ).all()
    
    return bookings

@app.post("/api/bookings/{booking_id}/status")
def change_booking_status(
    booking_id: int,
    body: StatusChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.mechanic, UserRole.administrator]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only mechanics or administrators can change booking status")
        
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
        
    if current_user.role == UserRole.mechanic:
        mechanic = db.query(Mechanic).filter(Mechanic.user_id == current_user.id).first()
        if not mechanic or booking.mechanic_id != mechanic.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Mechanic can only update their own bookings")
            
    old_status = booking.status
    new_status = body.status
    
    if new_status not in VALID_TRANSITIONS.get(old_status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition from {old_status} to {new_status}"
        )
        
    try:
        db.begin_nested()
        
        booking.status = new_status
        
        action_log = ActionLog(
            user_id=current_user.id,
            action="CHANGE_BOOKING_STATUS",
            details=f"Booking {booking.id} status changed from {old_status} to {new_status}"
        )
        db.add(action_log)
        
        db.commit()
        db.refresh(booking)
        
        return {
            "message": "Booking status updated successfully",
            "booking_id": booking.id,
            "previous_status": old_status,
            "new_status": booking.status,
            "updated_by": current_user.id,
            "timestamp": datetime.now(timezone.utc)
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@app.post("/api/bookings/{booking_id}/cancel")
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
        
    if current_user.role == UserRole.client and booking.client_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to cancel this booking")
    
    old_status = booking.status
    if old_status == BookingStatus.cancelled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking is already cancelled")
        
    if BookingStatus.cancelled not in VALID_TRANSITIONS.get(old_status, []):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot cancel booking in status {old_status}")
        
    try:
        db.begin_nested()
        booking.status = BookingStatus.cancelled
        
        action_log = ActionLog(
            user_id=current_user.id,
            action="CANCEL_BOOKING",
            details=f"Booking {booking.id} cancelled from status {old_status}"
        )
        db.add(action_log)
        
        db.commit()
        db.refresh(booking)
        
        return {"message": "Booking cancelled successfully", "booking_id": booking.id, "status": booking.status}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
