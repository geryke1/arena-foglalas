from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import bcrypt
import jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'arena-booking-secret-key-2024')
JWT_ALGORITHM = "HS256"

# SMTP Config (optional)
SMTP_HOST = os.environ.get('SMTP_HOST', '')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM = os.environ.get('SMTP_FROM', '')

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer(auto_error=False)

# ==================== MODELS ====================

class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    role: str  # user, admin, subadmin
    assigned_sports: List[str] = []

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class SportBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None

class SportCreate(SportBase):
    pass

class SportResponse(SportBase):
    id: str
    created_at: str

class EventBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    description: Optional[str] = None
    sport_id: str
    event_date: str
    max_capacity: int
    cover_image: Optional[str] = None

class EventCreate(EventBase):
    pass

class EventUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[str] = None
    max_capacity: Optional[int] = None
    cover_image: Optional[str] = None

class EventResponse(EventBase):
    id: str
    current_bookings: int = 0
    created_at: str
    sport_name: Optional[str] = None

class BookingBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    event_id: str

class BookingCreate(BookingBase):
    pass

class BookingResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    event_id: str
    user_id: str
    user_name: str
    user_email: str
    user_phone: Optional[str] = None
    event_name: str
    event_date: str
    sport_name: str
    status: str  # active, cancelled
    created_at: str

class SubadminCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    phone: Optional[str] = None
    assigned_sports: List[str] = []

class SubadminUpdate(BaseModel):
    name: Optional[str] = None
    assigned_sports: Optional[List[str]] = None

class MessageResponse(BaseModel):
    message: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

class SiteSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    site_name: str = "Aréna"
    site_logo: Optional[str] = None
    hero_title: str = "Sport, Koncertek, Élmények"
    hero_subtitle: str = "A város multifunkcionális sport- és rendezvényközpontja, 5000 fő férőhellyel"
    hero_image: Optional[str] = None
    footer_text: str = "© 2024 Aréna Sport- és Rendezvényközpont. Minden jog fenntartva."
    footer_logo: Optional[str] = None

class SiteSettingsResponse(SiteSettings):
    id: str

# ==================== HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7  # 7 days
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Nincs bejelentkezve")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Felhasználó nem található")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token lejárt")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Érvénytelen token")

async def get_admin_user(user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "subadmin"]:
        raise HTTPException(status_code=403, detail="Nincs jogosultság")
    return user

async def get_super_admin(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Csak admin jogosultság")
    return user

def send_email(to_email: str, subject: str, body: str):
    """Send email via SMTP - silently fails if not configured"""
    if not all([SMTP_HOST, SMTP_USER, SMTP_PASSWORD]):
        logging.info(f"SMTP not configured. Would send email to {to_email}: {subject}")
        return False
    
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_FROM or SMTP_USER
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html'))
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        logging.error(f"Email sending failed: {e}")
        return False

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Ez az email már regisztrálva van")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "phone": user_data.phone,
        "password": hash_password(user_data.password),
        "role": "user",
        "assigned_sports": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user_data.email, "user")
    return TokenResponse(
        token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            phone=user_data.phone,
            role="user",
            assigned_sports=[]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Hibás email vagy jelszó")
    
    token = create_token(user["id"], user["email"], user["role"])
    return TokenResponse(
        token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            phone=user.get("phone"),
            role=user["role"],
            assigned_sports=user.get("assigned_sports", [])
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        phone=user.get("phone"),
        role=user["role"],
        assigned_sports=user.get("assigned_sports", [])
    )

# ==================== SPORTS ROUTES ====================

@api_router.get("/sports", response_model=List[SportResponse])
async def get_sports():
    sports = await db.sports.find({}, {"_id": 0}).to_list(100)
    return [SportResponse(**s) for s in sports]

@api_router.get("/sports/{sport_id}", response_model=SportResponse)
async def get_sport(sport_id: str):
    sport = await db.sports.find_one({"id": sport_id}, {"_id": 0})
    if not sport:
        raise HTTPException(status_code=404, detail="Sport nem található")
    return SportResponse(**sport)

@api_router.post("/admin/sports", response_model=SportResponse)
async def create_sport(sport_data: SportCreate, user: dict = Depends(get_super_admin)):
    sport_id = str(uuid.uuid4())
    sport_doc = {
        "id": sport_id,
        "name": sport_data.name,
        "description": sport_data.description,
        "image_url": sport_data.image_url,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.sports.insert_one(sport_doc)
    return SportResponse(**sport_doc)

@api_router.put("/admin/sports/{sport_id}", response_model=SportResponse)
async def update_sport(sport_id: str, sport_data: SportCreate, user: dict = Depends(get_super_admin)):
    sport = await db.sports.find_one({"id": sport_id})
    if not sport:
        raise HTTPException(status_code=404, detail="Sport nem található")
    
    update_data = {
        "name": sport_data.name,
        "description": sport_data.description,
        "image_url": sport_data.image_url
    }
    await db.sports.update_one({"id": sport_id}, {"$set": update_data})
    
    updated = await db.sports.find_one({"id": sport_id}, {"_id": 0})
    return SportResponse(**updated)

@api_router.delete("/admin/sports/{sport_id}", response_model=MessageResponse)
async def delete_sport(sport_id: str, user: dict = Depends(get_super_admin)):
    result = await db.sports.delete_one({"id": sport_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sport nem található")
    
    # Delete related events and bookings
    await db.events.delete_many({"sport_id": sport_id})
    await db.bookings.delete_many({"sport_id": sport_id})
    
    return MessageResponse(message="Sport törölve")

# ==================== EVENTS ROUTES ====================

@api_router.get("/events", response_model=List[EventResponse])
async def get_events(sport_id: Optional[str] = None):
    query = {}
    if sport_id:
        query["sport_id"] = sport_id
    
    events = await db.events.find(query, {"_id": 0}).to_list(1000)
    
    # Enrich with sport name and booking count
    result = []
    for event in events:
        sport = await db.sports.find_one({"id": event["sport_id"]}, {"_id": 0})
        booking_count = await db.bookings.count_documents({"event_id": event["id"], "status": "active"})
        result.append(EventResponse(
            **event,
            sport_name=sport["name"] if sport else "Ismeretlen",
            current_bookings=booking_count
        ))
    return result

@api_router.get("/events/{event_id}", response_model=EventResponse)
async def get_event(event_id: str):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Esemény nem található")
    
    sport = await db.sports.find_one({"id": event["sport_id"]}, {"_id": 0})
    booking_count = await db.bookings.count_documents({"event_id": event_id, "status": "active"})
    
    return EventResponse(
        **event,
        sport_name=sport["name"] if sport else "Ismeretlen",
        current_bookings=booking_count
    )

@api_router.post("/admin/events", response_model=EventResponse)
async def create_event(event_data: EventCreate, user: dict = Depends(get_admin_user)):
    # Check sport exists
    sport = await db.sports.find_one({"id": event_data.sport_id}, {"_id": 0})
    if not sport:
        raise HTTPException(status_code=404, detail="Sport nem található")
    
    # Subadmin can only create events for assigned sports
    if user["role"] == "subadmin" and event_data.sport_id not in user.get("assigned_sports", []):
        raise HTTPException(status_code=403, detail="Nincs jogosultság ehhez a sporthoz")
    
    event_id = str(uuid.uuid4())
    event_doc = {
        "id": event_id,
        "name": event_data.name,
        "description": event_data.description,
        "sport_id": event_data.sport_id,
        "event_date": event_data.event_date,
        "max_capacity": event_data.max_capacity,
        "cover_image": event_data.cover_image,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.events.insert_one(event_doc)
    
    return EventResponse(**event_doc, sport_name=sport["name"], current_bookings=0)

@api_router.put("/admin/events/{event_id}", response_model=EventResponse)
async def update_event(event_id: str, event_data: EventUpdate, user: dict = Depends(get_admin_user)):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Esemény nem található")
    
    # Subadmin can only update events for assigned sports
    if user["role"] == "subadmin" and event["sport_id"] not in user.get("assigned_sports", []):
        raise HTTPException(status_code=403, detail="Nincs jogosultság ehhez az eseményhez")
    
    update_data = {k: v for k, v in event_data.model_dump().items() if v is not None}
    if update_data:
        await db.events.update_one({"id": event_id}, {"$set": update_data})
    
    updated = await db.events.find_one({"id": event_id}, {"_id": 0})
    sport = await db.sports.find_one({"id": updated["sport_id"]}, {"_id": 0})
    booking_count = await db.bookings.count_documents({"event_id": event_id, "status": "active"})
    
    return EventResponse(**updated, sport_name=sport["name"] if sport else "Ismeretlen", current_bookings=booking_count)

@api_router.delete("/admin/events/{event_id}", response_model=MessageResponse)
async def delete_event(event_id: str, user: dict = Depends(get_admin_user)):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Esemény nem található")
    
    # Subadmin can only delete events for assigned sports
    if user["role"] == "subadmin" and event["sport_id"] not in user.get("assigned_sports", []):
        raise HTTPException(status_code=403, detail="Nincs jogosultság ehhez az eseményhez")
    
    await db.events.delete_one({"id": event_id})
    await db.bookings.delete_many({"event_id": event_id})
    
    return MessageResponse(message="Esemény törölve")

# ==================== BOOKING ROUTES ====================

@api_router.post("/bookings", response_model=BookingResponse)
async def create_booking(booking_data: BookingCreate, user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"id": booking_data.event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Esemény nem található")
    
    # Check capacity
    current_bookings = await db.bookings.count_documents({"event_id": booking_data.event_id, "status": "active"})
    if current_bookings >= event["max_capacity"]:
        raise HTTPException(status_code=400, detail="Az esemény betelt")
    
    # Check if already booked
    existing = await db.bookings.find_one({
        "event_id": booking_data.event_id, 
        "user_id": user["id"],
        "status": "active"
    })
    if existing:
        raise HTTPException(status_code=400, detail="Már van foglalásod erre az eseményre")
    
    sport = await db.sports.find_one({"id": event["sport_id"]}, {"_id": 0})
    
    booking_id = str(uuid.uuid4())
    booking_doc = {
        "id": booking_id,
        "event_id": booking_data.event_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "user_email": user["email"],
        "user_phone": user.get("phone"),
        "event_name": event["name"],
        "event_date": event["event_date"],
        "sport_id": event["sport_id"],
        "sport_name": sport["name"] if sport else "Ismeretlen",
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.bookings.insert_one(booking_doc)
    
    # Send confirmation email
    send_email(
        user["email"],
        f"Foglalás megerősítve - {event['name']}",
        f"""
        <h2>Kedves {user['name']}!</h2>
        <p>Foglalásod sikeresen rögzítettük a következő eseményre:</p>
        <p><strong>Esemény:</strong> {event['name']}</p>
        <p><strong>Sport:</strong> {sport['name'] if sport else 'N/A'}</p>
        <p><strong>Időpont:</strong> {event['event_date']}</p>
        <p>Várunk szeretettel!</p>
        """
    )
    
    return BookingResponse(**booking_doc)

@api_router.get("/bookings/my", response_model=List[BookingResponse])
async def get_my_bookings(user: dict = Depends(get_current_user)):
    bookings = await db.bookings.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    return [BookingResponse(**b) for b in bookings]

@api_router.delete("/bookings/{booking_id}", response_model=MessageResponse)
async def cancel_booking(booking_id: str, user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Foglalás nem található")
    
    # User can only cancel own booking, admin/subadmin can cancel any
    if booking["user_id"] != user["id"] and user["role"] not in ["admin", "subadmin"]:
        raise HTTPException(status_code=403, detail="Nincs jogosultság")
    
    # Subadmin can only cancel for assigned sports
    if user["role"] == "subadmin" and booking["sport_id"] not in user.get("assigned_sports", []):
        raise HTTPException(status_code=403, detail="Nincs jogosultság ehhez a foglaláshoz")
    
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": "cancelled"}})
    
    # Send cancellation email
    send_email(
        booking["user_email"],
        f"Foglalás törölve - {booking['event_name']}",
        f"""
        <h2>Kedves {booking['user_name']}!</h2>
        <p>A következő foglalásod törölve lett:</p>
        <p><strong>Esemény:</strong> {booking['event_name']}</p>
        <p><strong>Időpont:</strong> {booking['event_date']}</p>
        """
    )
    
    return MessageResponse(message="Foglalás törölve")

# ==================== ADMIN BOOKING ROUTES ====================

@api_router.get("/admin/bookings", response_model=List[BookingResponse])
async def get_all_bookings(event_id: Optional[str] = None, user: dict = Depends(get_admin_user)):
    query = {}
    if event_id:
        query["event_id"] = event_id
    
    # Subadmin can only see bookings for assigned sports
    if user["role"] == "subadmin":
        query["sport_id"] = {"$in": user.get("assigned_sports", [])}
    
    bookings = await db.bookings.find(query, {"_id": 0}).to_list(1000)
    return [BookingResponse(**b) for b in bookings]

# ==================== SUBADMIN ROUTES ====================

@api_router.get("/admin/subadmins", response_model=List[UserResponse])
async def get_subadmins(user: dict = Depends(get_super_admin)):
    subadmins = await db.users.find({"role": "subadmin"}, {"_id": 0, "password": 0}).to_list(100)
    return [UserResponse(**s) for s in subadmins]

@api_router.post("/admin/subadmins", response_model=UserResponse)
async def create_subadmin(subadmin_data: SubadminCreate, user: dict = Depends(get_super_admin)):
    existing = await db.users.find_one({"email": subadmin_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Ez az email már regisztrálva van")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": subadmin_data.email,
        "name": subadmin_data.name,
        "phone": subadmin_data.phone,
        "password": hash_password(subadmin_data.password),
        "role": "subadmin",
        "assigned_sports": subadmin_data.assigned_sports,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    return UserResponse(
        id=user_id,
        email=subadmin_data.email,
        name=subadmin_data.name,
        phone=subadmin_data.phone,
        role="subadmin",
        assigned_sports=subadmin_data.assigned_sports
    )

@api_router.put("/admin/subadmins/{subadmin_id}", response_model=UserResponse)
async def update_subadmin(subadmin_id: str, subadmin_data: SubadminUpdate, user: dict = Depends(get_super_admin)):
    subadmin = await db.users.find_one({"id": subadmin_id, "role": "subadmin"})
    if not subadmin:
        raise HTTPException(status_code=404, detail="Subadmin nem található")
    
    update_data = {k: v for k, v in subadmin_data.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one({"id": subadmin_id}, {"$set": update_data})
    
    updated = await db.users.find_one({"id": subadmin_id}, {"_id": 0, "password": 0})
    return UserResponse(**updated)

@api_router.delete("/admin/subadmins/{subadmin_id}", response_model=MessageResponse)
async def delete_subadmin(subadmin_id: str, user: dict = Depends(get_super_admin)):
    result = await db.users.delete_one({"id": subadmin_id, "role": "subadmin"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subadmin nem található")
    return MessageResponse(message="Subadmin törölve")

# ==================== FILE UPLOAD ====================

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_admin_user)):
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Csak kép fájlok engedélyezettek")
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = UPLOAD_DIR / filename
    
    # Save file
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {"url": f"/api/uploads/{filename}"}

# ==================== STATS ====================

@api_router.get("/admin/stats")
async def get_stats(user: dict = Depends(get_admin_user)):
    if user["role"] == "admin":
        total_sports = await db.sports.count_documents({})
        total_events = await db.events.count_documents({})
        total_bookings = await db.bookings.count_documents({"status": "active"})
        total_users = await db.users.count_documents({"role": "user"})
        total_subadmins = await db.users.count_documents({"role": "subadmin"})
    else:
        # Subadmin sees only their sports
        assigned = user.get("assigned_sports", [])
        total_sports = len(assigned)
        total_events = await db.events.count_documents({"sport_id": {"$in": assigned}})
        total_bookings = await db.bookings.count_documents({"sport_id": {"$in": assigned}, "status": "active"})
        total_users = 0
        total_subadmins = 0
    
    return {
        "total_sports": total_sports,
        "total_events": total_events,
        "total_bookings": total_bookings,
        "total_users": total_users,
        "total_subadmins": total_subadmins
    }

# ==================== INIT ADMIN ====================

@api_router.post("/init-admin", response_model=MessageResponse)
async def init_admin():
    """Create initial admin user if none exists"""
    existing = await db.users.find_one({"role": "admin"})
    if existing:
        return MessageResponse(message="Admin már létezik")
    
    admin_doc = {
        "id": str(uuid.uuid4()),
        "email": "admin@arena.hu",
        "name": "Rendszergazda",
        "phone": None,
        "password": hash_password("admin123"),
        "role": "admin",
        "assigned_sports": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_doc)
    return MessageResponse(message="Admin létrehozva: admin@arena.hu / admin123")

# ==================== PROFILE UPDATE ====================

@api_router.put("/auth/profile", response_model=UserResponse)
async def update_profile(profile_data: ProfileUpdate, user: dict = Depends(get_current_user)):
    update_data = {}
    
    # Update name
    if profile_data.name:
        update_data["name"] = profile_data.name
    
    # Update phone
    if profile_data.phone is not None:
        update_data["phone"] = profile_data.phone
    
    # Update email
    if profile_data.email and profile_data.email != user["email"]:
        existing = await db.users.find_one({"email": profile_data.email})
        if existing:
            raise HTTPException(status_code=400, detail="Ez az email már foglalt")
        update_data["email"] = profile_data.email
    
    # Update password
    if profile_data.new_password:
        if not profile_data.current_password:
            raise HTTPException(status_code=400, detail="Jelenlegi jelszó szükséges")
        if not verify_password(profile_data.current_password, user["password"]):
            raise HTTPException(status_code=400, detail="Hibás jelenlegi jelszó")
        update_data["password"] = hash_password(profile_data.new_password)
    
    if update_data:
        await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return UserResponse(**updated)

# ==================== SITE SETTINGS ====================

@api_router.get("/settings", response_model=SiteSettingsResponse)
async def get_site_settings():
    settings = await db.site_settings.find_one({}, {"_id": 0})
    if not settings:
        # Return defaults
        default_settings = {
            "id": "default",
            "site_name": "Aréna",
            "site_logo": None,
            "hero_title": "Sport, Koncertek, Élmények",
            "hero_subtitle": "A város multifunkcionális sport- és rendezvényközpontja, 5000 fő férőhellyel",
            "hero_image": None,
            "footer_text": "© 2024 Aréna Sport- és Rendezvényközpont. Minden jog fenntartva.",
            "footer_logo": None
        }
        await db.site_settings.insert_one(default_settings)
        return SiteSettingsResponse(**default_settings)
    return SiteSettingsResponse(**settings)

@api_router.put("/admin/settings", response_model=SiteSettingsResponse)
async def update_site_settings(settings_data: SiteSettings, user: dict = Depends(get_super_admin)):
    settings = await db.site_settings.find_one({})
    
    update_data = settings_data.model_dump()
    
    if settings:
        await db.site_settings.update_one({}, {"$set": update_data})
    else:
        update_data["id"] = "default"
        await db.site_settings.insert_one(update_data)
    
    updated = await db.site_settings.find_one({}, {"_id": 0})
    return SiteSettingsResponse(**updated)

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Aréna Booking API"}

# Include the router in the main app
app.include_router(api_router)

# Serve uploaded files
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
