from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, Header, Query, WebSocket, WebSocketDisconnect, Depends, Cookie
from fastapi.responses import Response as FastResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from bson import ObjectId
import os
import logging
import uuid
import math
import json
import asyncio
import io
import requests
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Set
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
gridfs_bucket = AsyncIOMotorGridFSBucket(db, bucket_name="uploads")

APP_NAME = os.environ.get("APP_NAME", "facciamoape")
ADMIN_EMAILS = set(e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip())
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
MAX_UPLOAD_BYTES = 5 * 1024 * 1024

# Supported university cities (lat, lng of city center)
SUPPORTED_CITIES = [
    {"name": "Milano", "lat": 45.4642, "lng": 9.1900},
    {"name": "Roma", "lat": 41.9028, "lng": 12.4964},
    {"name": "Napoli", "lat": 40.8518, "lng": 14.2681},
    {"name": "Bologna", "lat": 44.4949, "lng": 11.3426},
    {"name": "Firenze", "lat": 43.7696, "lng": 11.2558},
    {"name": "Torino", "lat": 45.0703, "lng": 7.6869},
    {"name": "Padova", "lat": 45.4064, "lng": 11.8768},
    {"name": "Pisa", "lat": 43.7228, "lng": 10.4017},
    {"name": "Pavia", "lat": 45.1847, "lng": 9.1582},
    {"name": "Perugia", "lat": 43.1107, "lng": 12.3908},
    {"name": "Trento", "lat": 46.0667, "lng": 11.1167},
    {"name": "Catania", "lat": 37.5079, "lng": 15.0830},
    {"name": "Bari", "lat": 41.1171, "lng": 16.8719},
    {"name": "Genova", "lat": 44.4056, "lng": 8.9463},
    {"name": "Verona", "lat": 45.4384, "lng": 10.9916},
    {"name": "Parma", "lat": 44.8015, "lng": 10.3279},
    {"name": "Modena", "lat": 44.6471, "lng": 10.9252},
    {"name": "Siena", "lat": 43.3188, "lng": 11.3308},
    {"name": "Salerno", "lat": 40.6824, "lng": 14.7681},
    {"name": "Cagliari", "lat": 39.2238, "lng": 9.1217},
    {"name": "Palermo", "lat": 38.1157, "lng": 13.3613},
]
CITY_BY_NAME = {c["name"].lower(): c for c in SUPPORTED_CITIES}

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def set_session_cookie(response: Response, session_token: str):
    response.set_cookie(
        "session_token", session_token,
        httponly=True, secure=True, samesite="none",
        max_age=7 * 24 * 60 * 60, path="/"
    )


async def upsert_user_from_oauth(
    email: str,
    name: str,
    picture: Optional[str],
    referrer_username: Optional[str] = None,
) -> dict:
    is_admin = email.lower() in ADMIN_EMAILS
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture, "is_admin": is_admin}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        base_username = email.split("@")[0].lower().replace(".", "_")[:20]
        username = base_username
        suffix = 1
        while await db.users.find_one({"username": username}):
            username = f"{base_username}{suffix}"
            suffix += 1
        referred_by = None
        if referrer_username:
            ref = await db.users.find_one({"username": referrer_username.strip().lower()}, {"_id": 0})
            if ref and ref["user_id"] != user_id:
                referred_by = ref["user_id"]
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "username": username,
            "age": None,
            "city": None,
            "zone": None,
            "time_slot": None,
            "drink": None,
            "bio": None,
            "photo_path": None,
            "lat": None,
            "lng": None,
            "aperitivi_count": 0,
            "blocked_users": [],
            "referred_by": referred_by,
            "referral_completed_with": [],
            "is_admin": is_admin,
            "is_suspended": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    return await db.users.find_one({"user_id": user_id}, {"_id": 0})


async def store_upload(path: str, data: bytes, content_type: str, user_id: str) -> dict:
    file_id = await gridfs_bucket.upload_from_stream(
        path,
        io.BytesIO(data),
        metadata={"content_type": content_type, "user_id": user_id, "storage_path": path},
    )
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "storage_path": path,
        "gridfs_id": str(file_id),
        "content_type": content_type,
        "size": len(data),
        "user_id": user_id,
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"path": path, "size": len(data)}


async def read_upload(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record or not record.get("gridfs_id"):
        raise HTTPException(status_code=404, detail="File not found")
    stream = await gridfs_bucket.open_download_stream(ObjectId(record["gridfs_id"]))
    data = await stream.read()
    return data, record.get("content_type") or "application/octet-stream"


app = FastAPI()
api_router = APIRouter(prefix="/api")


# ===== Models =====
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    username: Optional[str] = None
    age: Optional[int] = None
    city: Optional[str] = None
    zone: Optional[str] = None
    time_slot: Optional[str] = None  # "18-19" or "20-21"
    drink: Optional[str] = None  # birra, vino, cocktail, analcolico
    bio: Optional[str] = None
    photo_path: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    aperitivi_count: int = 0
    created_at: str
    blocked_users: List[str] = []
    referred_by: Optional[str] = None
    referral_completed_with: List[str] = []


class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    age: Optional[int] = None
    city: Optional[str] = None
    zone: Optional[str] = None
    time_slot: Optional[str] = None
    drink: Optional[str] = None
    bio: Optional[str] = None
    photo_path: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class WaitlistEntry(BaseModel):
    email: str
    city: str


class MessageCreate(BaseModel):
    text: str


class ConversationCreate(BaseModel):
    target_user_id: str
    text: str


class AddParticipant(BaseModel):
    username: str


# ===== Auth helper =====
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth.split(" ", 1)[1]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ===== Auth endpoints =====
@api_router.post("/auth/session")
async def auth_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    referrer_username = body.get("referrer_username")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    r = requests.get(
        "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
        headers={"X-Session-ID": session_id}, timeout=30
    )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    data = r.json()

    user = await upsert_user_from_oauth(
        email=data["email"],
        name=data["name"],
        picture=data.get("picture"),
        referrer_username=referrer_username,
    )
    session_token = data.get("session_token") or f"sess_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user["user_id"],
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    set_session_cookie(response, session_token)
    return user


@api_router.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    return user


@api_router.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


@api_router.get("/auth/ws-token")
async def auth_ws_token(request: Request, user: dict = Depends(get_current_user)):
    """Return the current session token so the frontend can open a WebSocket.
    The cookie is httpOnly so JS can't read it; this endpoint is auth-gated."""
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth.split(" ", 1)[1]
    return {"ws_token": token}


@api_router.get("/users/me/referral")
async def my_referral(request: Request, user: dict = Depends(get_current_user)):
    origin = request.headers.get("origin") or ""
    invited = await db.users.count_documents({"referred_by": user["user_id"]})
    return {
        "username": user.get("username"),
        "link": f"{origin}/?ref={user.get('username')}" if origin else f"/?ref={user.get('username')}",
        "invited_count": invited,
        "completed_count": len(user.get("referral_completed_with", [])),
    }


# ===== Waitlist =====
@api_router.post("/waitlist")
async def join_waitlist(entry: WaitlistEntry):
    doc = {
        "id": str(uuid.uuid4()),
        "email": entry.email,
        "city": entry.city,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.waitlist.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "id": doc["id"]}


# ===== Profile =====
@api_router.put("/users/me")
async def update_profile(payload: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "username" in updates:
        u = updates["username"].strip().lower()
        existing = await db.users.find_one({"username": u, "user_id": {"$ne": user["user_id"]}})
        if existing:
            raise HTTPException(status_code=400, detail="Username già preso")
        updates["username"] = u
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    return await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})


@api_router.get("/cities")
async def list_cities():
    return SUPPORTED_CITIES


@api_router.get("/users/nearby")
async def get_nearby(
    user: dict = Depends(get_current_user),
    limit: int = 100,
    city: Optional[str] = None,
    radius_km: float = 5.0,
):
    query = {"user_id": {"$ne": user["user_id"]}, "age": {"$ne": None}, "is_suspended": {"$ne": True}}
    if city:
        query["city"] = {"$regex": f"^{city}$", "$options": "i"}

    # Determine the reference point for distance: user GPS, else city center if specified, else None
    ref_lat = user.get("lat")
    ref_lng = user.get("lng")
    if (ref_lat is None or ref_lng is None) and city:
        cc = CITY_BY_NAME.get(city.lower())
        if cc:
            ref_lat, ref_lng = cc["lat"], cc["lng"]

    cursor = db.users.find(query, {"_id": 0}).limit(limit * 3)
    results = []
    async for u in cursor:
        if user["user_id"] in u.get("blocked_users", []):
            continue
        if u["user_id"] in user.get("blocked_users", []):
            continue
        if ref_lat is not None and ref_lng is not None and u.get("lat") and u.get("lng"):
            d = round(haversine(ref_lat, ref_lng, u["lat"], u["lng"]), 2)
            if d > radius_km:
                continue
            u["distance_km"] = d
        else:
            u["distance_km"] = None
        results.append(u)
        if len(results) >= limit:
            break
    results.sort(key=lambda x: (x["distance_km"] is None, x["distance_km"] or 999))
    return results


REPORT_REASONS = {"spam", "contenuto_inappropriato", "molestie", "profilo_falso", "altro"}
AUTO_SUSPEND_THRESHOLD = 3


class ReportPayload(BaseModel):
    reason: str
    detail: Optional[str] = None


@api_router.post("/users/report/{user_id}")
async def report_user(user_id: str, payload: ReportPayload, user: dict = Depends(get_current_user)):
    if user_id == user["user_id"]:
        raise HTTPException(status_code=400, detail="Non puoi segnalare te stesso")
    if payload.reason not in REPORT_REASONS:
        raise HTTPException(status_code=400, detail="Motivo non valido")
    target = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    # Idempotent per (reporter, reported, reason)
    existing = await db.reports.find_one({
        "reporter_id": user["user_id"], "reported_id": user_id, "reason": payload.reason
    })
    if existing:
        return {"ok": True, "already_reported": True}
    await db.reports.insert_one({
        "id": str(uuid.uuid4()),
        "reporter_id": user["user_id"],
        "reported_id": user_id,
        "reason": payload.reason,
        "detail": payload.detail,
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    # Count unique reporters
    unique_reporters = await db.reports.distinct("reporter_id", {"reported_id": user_id, "status": "open"})
    if len(unique_reporters) >= AUTO_SUSPEND_THRESHOLD and not target.get("is_suspended"):
        await db.users.update_one({"user_id": user_id}, {"$set": {"is_suspended": True, "suspended_at": datetime.now(timezone.utc).isoformat()}})
    # Also auto-block on reporter side so they don't see them again
    await db.users.update_one({"user_id": user["user_id"]}, {"$addToSet": {"blocked_users": user_id}})
    return {"ok": True, "report_count": len(unique_reporters)}


@api_router.get("/users/{user_id}")
async def get_user(user_id: str, user: dict = Depends(get_current_user)):
    target = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    if user.get("lat") and user.get("lng") and target.get("lat") and target.get("lng"):
        target["distance_km"] = round(haversine(user["lat"], user["lng"], target["lat"], target["lng"]), 1)
    return target


@api_router.post("/users/block/{user_id}")
async def block_user(user_id: str, user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$addToSet": {"blocked_users": user_id}}
    )
    return {"ok": True}


@api_router.post("/users/unblock/{user_id}")
async def unblock_user(user_id: str, user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$pull": {"blocked_users": user_id}}
    )
    return {"ok": True}


def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


async def maybe_complete_referral(user_a_id: str, user_b_id: str):
    """If A referred B (or vice versa) and they haven't already completed, mark badge on both."""
    a = await db.users.find_one({"user_id": user_a_id}, {"_id": 0})
    b = await db.users.find_one({"user_id": user_b_id}, {"_id": 0})
    if not a or not b:
        return
    pair = None
    if a.get("referred_by") == b["user_id"]:
        pair = (b["user_id"], a["user_id"])  # (referrer, referred)
    elif b.get("referred_by") == a["user_id"]:
        pair = (a["user_id"], b["user_id"])
    if not pair:
        return
    referrer_id, referred_id = pair
    referrer = a if a["user_id"] == referrer_id else b
    referred = b if referrer is a else a
    if referred["user_id"] in referrer.get("referral_completed_with", []):
        return  # already completed
    await db.users.update_one({"user_id": referrer_id}, {"$addToSet": {"referral_completed_with": referred_id}})
    await db.users.update_one({"user_id": referred_id}, {"$addToSet": {"referral_completed_with": referrer_id}})


# ===== Upload =====
@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
    if ext not in {"jpg", "jpeg", "png", "webp", "gif"}:
        raise HTTPException(status_code=400, detail="Formato immagine non supportato")
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Immagine troppo grande (max 5MB)")
    path = f"{APP_NAME}/uploads/{user['user_id']}/{uuid.uuid4()}.{ext}"
    content_type = file.content_type or "image/jpeg"
    result = await store_upload(path, data, content_type, user["user_id"])
    return {"path": result["path"]}


@api_router.get("/files/{path:path}")
async def download_file(path: str):
    data, content_type = await read_upload(path)
    return FastResponse(content=data, media_type=content_type)


# ===== Conversations =====
@api_router.get("/conversations")
async def list_conversations(user: dict = Depends(get_current_user)):
    convs = await db.conversations.find({"participants": user["user_id"]}, {"_id": 0}).sort("updated_at", -1).to_list(200)
    if not convs:
        return []
    all_user_ids = set()
    conv_ids = []
    for c in convs:
        conv_ids.append(c["id"])
        all_user_ids.update([p for p in c["participants"] if p != user["user_id"]])
    users_map = {}
    if all_user_ids:
        async for u in db.users.find(
            {"user_id": {"$in": list(all_user_ids)}},
            {"_id": 0, "user_id": 1, "name": 1, "username": 1, "photo_path": 1, "picture": 1}
        ):
            users_map[u["user_id"]] = u
    messages_map = {}
    async for msg in db.messages.aggregate([
        {"$match": {"conversation_id": {"$in": conv_ids}}},
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$conversation_id", "last_message": {"$first": "$$ROOT"}}}
    ]):
        last = msg["last_message"]
        last.pop("_id", None)
        messages_map[msg["_id"]] = last
    for c in convs:
        other_ids = [p for p in c["participants"] if p != user["user_id"]]
        c["other_participants"] = [users_map[uid] for uid in other_ids if uid in users_map]
        c["last_message"] = messages_map.get(c["id"])
    return convs


@api_router.post("/conversations")
async def create_conversation(payload: ConversationCreate, user: dict = Depends(get_current_user)):
    if user.get("is_suspended"):
        raise HTTPException(status_code=403, detail="Il tuo account è sospeso per segnalazioni multiple")
    target = await db.users.find_one({"user_id": payload.target_user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    if target.get("is_suspended"):
        raise HTTPException(status_code=403, detail="Questo utente non è più disponibile")
    if user["user_id"] in target.get("blocked_users", []):
        raise HTTPException(status_code=403, detail="Non puoi scrivere a questo utente")

    # Check existing 1-to-1 conv
    existing = await db.conversations.find_one({
        "is_group": False,
        "participants": {"$all": [user["user_id"], payload.target_user_id], "$size": 2}
    }, {"_id": 0})

    now = datetime.now(timezone.utc).isoformat()

    if existing:
        conv = existing
        # Check gating: requesting user has already sent and not accepted
        if user["user_id"] in conv.get("initiated_by", []) and not conv.get("accepted"):
            # Check if they already sent a first message
            count_sent = await db.messages.count_documents({
                "conversation_id": conv["id"], "sender_id": user["user_id"]
            })
            if count_sent >= 1:
                raise HTTPException(status_code=403, detail="Aspetta che ti risponda prima di scrivere di nuovo")
    else:
        conv = {
            "id": str(uuid.uuid4()),
            "participants": [user["user_id"], payload.target_user_id],
            "is_group": False,
            "initiated_by": [user["user_id"]],
            "accepted": False,
            "created_at": now,
            "updated_at": now
        }
        await db.conversations.insert_one(dict(conv))

    msg = {
        "id": str(uuid.uuid4()),
        "conversation_id": conv["id"],
        "sender_id": user["user_id"],
        "text": payload.text,
        "created_at": now
    }
    await db.messages.insert_one(dict(msg))
    await db.conversations.update_one({"id": conv["id"]}, {"$set": {"updated_at": now}})

    # Broadcast via websocket
    await ws_manager.broadcast_to_conv(conv["id"], {
        "type": "message",
        "message": msg,
        "conversation_id": conv["id"]
    })
    conv.pop("_id", None)
    return {"conversation_id": conv["id"], "message": msg}


@api_router.get("/conversations/{conv_id}")
async def get_conversation(conv_id: str, user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one({"id": conv_id}, {"_id": 0})
    if not conv or user["user_id"] not in conv["participants"]:
        raise HTTPException(status_code=404, detail="Conversazione non trovata")
    # Get messages
    msgs = await db.messages.find({"conversation_id": conv_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    # Get participants info
    parts = []
    async for u in db.users.find({"user_id": {"$in": conv["participants"]}}, {"_id": 0, "user_id": 1, "name": 1, "username": 1, "photo_path": 1, "picture": 1}):
        parts.append(u)
    conv["messages"] = msgs
    conv["participants_info"] = parts

    # Can current user send another message? Gating
    can_send = True
    block_reason = None
    if not conv["is_group"]:
        other_id = [p for p in conv["participants"] if p != user["user_id"]][0]
        other = await db.users.find_one({"user_id": other_id}, {"_id": 0})
        # If user is blocked
        if user["user_id"] in other.get("blocked_users", []):
            can_send = False
            block_reason = "blocked"
        elif not conv.get("accepted") and user["user_id"] in conv.get("initiated_by", []):
            # already sent first message, awaiting accept
            sent = await db.messages.count_documents({"conversation_id": conv_id, "sender_id": user["user_id"]})
            if sent >= 1:
                can_send = False
                block_reason = "awaiting_accept"
    conv["can_send"] = can_send
    conv["block_reason"] = block_reason
    return conv


@api_router.post("/conversations/{conv_id}/messages")
async def send_message(conv_id: str, payload: MessageCreate, user: dict = Depends(get_current_user)):
    if user.get("is_suspended"):
        raise HTTPException(status_code=403, detail="Account sospeso")
    conv = await db.conversations.find_one({"id": conv_id}, {"_id": 0})
    if not conv or user["user_id"] not in conv["participants"]:
        raise HTTPException(status_code=404, detail="Conversazione non trovata")

    if not conv.get("is_group") and not conv.get("accepted"):
        if user["user_id"] in conv.get("initiated_by", []):
            sent = await db.messages.count_documents({"conversation_id": conv_id, "sender_id": user["user_id"]})
            if sent >= 1:
                raise HTTPException(status_code=403, detail="Aspetta che ti risponda")

    now = datetime.now(timezone.utc).isoformat()
    msg = {
        "id": str(uuid.uuid4()),
        "conversation_id": conv_id,
        "sender_id": user["user_id"],
        "text": payload.text,
        "created_at": now
    }
    await db.messages.insert_one(dict(msg))

    # If recipient is replying to a non-accepted conv, auto-accept
    updates = {"updated_at": now}
    if not conv.get("is_group") and not conv.get("accepted") and user["user_id"] not in conv.get("initiated_by", []):
        updates["accepted"] = True
        # Bump aperitivi count for both
        for p in conv["participants"]:
            await db.users.update_one({"user_id": p}, {"$inc": {"aperitivi_count": 1}})
        # Check referral completion
        if len(conv["participants"]) == 2:
            await maybe_complete_referral(conv["participants"][0], conv["participants"][1])
    await db.conversations.update_one({"id": conv_id}, {"$set": updates})

    await ws_manager.broadcast_to_conv(conv_id, {
        "type": "message",
        "message": msg,
        "conversation_id": conv_id,
        "accepted": updates.get("accepted", conv.get("accepted", False))
    })
    return msg


@api_router.post("/conversations/{conv_id}/accept")
async def accept_conversation(conv_id: str, user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one({"id": conv_id}, {"_id": 0})
    if not conv or user["user_id"] not in conv["participants"]:
        raise HTTPException(status_code=404, detail="Conversazione non trovata")
    if user["user_id"] in conv.get("initiated_by", []):
        raise HTTPException(status_code=403, detail="Non puoi accettare la tua stessa conversazione")
    await db.conversations.update_one({"id": conv_id}, {"$set": {"accepted": True}})
    for p in conv["participants"]:
        await db.users.update_one({"user_id": p}, {"$inc": {"aperitivi_count": 1}})
    if len(conv["participants"]) == 2:
        await maybe_complete_referral(conv["participants"][0], conv["participants"][1])
    await ws_manager.broadcast_to_conv(conv_id, {"type": "accepted", "conversation_id": conv_id})
    return {"ok": True}


@api_router.post("/conversations/{conv_id}/add_participant")
async def add_participant(conv_id: str, payload: AddParticipant, user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one({"id": conv_id}, {"_id": 0})
    if not conv or user["user_id"] not in conv["participants"]:
        raise HTTPException(status_code=404, detail="Conversazione non trovata")
    target = await db.users.find_one({"username": payload.username.strip().lower()}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Username non trovato")
    if target["user_id"] in conv["participants"]:
        raise HTTPException(status_code=400, detail="Già nella chat")
    new_participants = conv["participants"] + [target["user_id"]]
    await db.conversations.update_one({"id": conv_id}, {"$set": {
        "participants": new_participants,
        "is_group": True,
        "accepted": True,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }})
    await ws_manager.broadcast_to_conv(conv_id, {
        "type": "participant_added",
        "conversation_id": conv_id,
        "user": {"user_id": target["user_id"], "name": target["name"], "username": target.get("username")}
    })
    return {"ok": True}


# ===== WebSocket =====
class WSManager:
    def __init__(self):
        self.user_sockets: Dict[str, Set[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.user_sockets.setdefault(user_id, set()).add(ws)

    def disconnect(self, user_id: str, ws: WebSocket):
        if user_id in self.user_sockets:
            self.user_sockets[user_id].discard(ws)

    async def broadcast_to_conv(self, conv_id: str, payload: dict):
        conv = await db.conversations.find_one({"id": conv_id}, {"_id": 0})
        if not conv:
            return
        msg = json.dumps(payload, default=str)
        for uid in conv["participants"]:
            for ws in list(self.user_sockets.get(uid, set())):
                try:
                    await ws.send_text(msg)
                except Exception:
                    pass


ws_manager = WSManager()


@app.websocket("/api/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        await websocket.close(code=4401)
        return
    user_id = session["user_id"]
    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id, websocket)
    except Exception:
        ws_manager.disconnect(user_id, websocket)


# ===== Admin =====
async def get_admin(user: dict = Depends(get_current_user)) -> dict:
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Solo admin")
    return user


@api_router.get("/admin/reports")
async def admin_list_reports(status: str = "open", admin: dict = Depends(get_admin)):
    cursor = db.reports.find({"status": status}, {"_id": 0}).sort("created_at", -1).limit(500)
    reports = await cursor.to_list(500)
    # Enrich with reporter + reported user info
    ids = set()
    for r in reports:
        ids.add(r["reporter_id"])
        ids.add(r["reported_id"])
    users_map = {}
    if ids:
        async for u in db.users.find(
            {"user_id": {"$in": list(ids)}},
            {"_id": 0, "user_id": 1, "name": 1, "username": 1, "email": 1, "is_suspended": 1, "picture": 1, "photo_path": 1}
        ):
            users_map[u["user_id"]] = u
    # Group by reported_id with counts
    grouped = {}
    for r in reports:
        rid = r["reported_id"]
        if rid not in grouped:
            grouped[rid] = {
                "reported_user": users_map.get(rid),
                "report_count": 0,
                "reports": []
            }
        grouped[rid]["report_count"] += 1
        grouped[rid]["reports"].append({
            **r,
            "reporter": users_map.get(r["reporter_id"])
        })
    result = [g for g in grouped.values() if g["reported_user"]]
    result.sort(key=lambda x: -x["report_count"])
    return result


@api_router.post("/admin/users/{user_id}/unsuspend")
async def admin_unsuspend(user_id: str, admin: dict = Depends(get_admin)):
    target = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_suspended": False, "suspended_at": None}}
    )
    # Resolve their open reports so they don't auto-suspend again immediately
    await db.reports.update_many(
        {"reported_id": user_id, "status": "open"},
        {"$set": {"status": "resolved", "resolved_at": datetime.now(timezone.utc).isoformat(), "resolved_by": admin["user_id"]}}
    )
    return {"ok": True}


@api_router.post("/admin/users/{user_id}/suspend")
async def admin_suspend(user_id: str, admin: dict = Depends(get_admin)):
    target = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    if target.get("is_admin"):
        raise HTTPException(status_code=400, detail="Non puoi sospendere un admin")
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_suspended": True, "suspended_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"ok": True}


@api_router.post("/admin/reports/{report_id}/resolve")
async def admin_resolve_report(report_id: str, admin: dict = Depends(get_admin)):
    res = await db.reports.update_one(
        {"id": report_id},
        {"$set": {"status": "resolved", "resolved_at": datetime.now(timezone.utc).isoformat(), "resolved_by": admin["user_id"]}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Report non trovato")
    return {"ok": True}


# ===== Demo seed =====
DEMO_USERS = [
    {"name": "Giulia Bianchi", "username": "giulia_b", "age": 27, "city": "Milano", "zone": "Navigli", "time_slot": "20-21", "drink": "Spritz", "bio": "Cerco compagnia per spritz a sorpresa nei Navigli.", "lat": 45.4500, "lng": 9.1700, "picture": "https://images.pexels.com/photos/6952734/pexels-photo-6952734.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "aperitivi_count": 12},
    {"name": "Marco Rossi", "username": "marco_r", "age": 31, "city": "Milano", "zone": "Brera", "time_slot": "18-19", "drink": "Vino rosso", "bio": "Architetto, amante del rosso e dei tramonti milanesi.", "lat": 45.4720, "lng": 9.1880, "picture": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop", "aperitivi_count": 8},
    {"name": "Sofia Esposito", "username": "sofia_e", "age": 24, "city": "Roma", "zone": "Trastevere", "time_slot": "20-21", "drink": "Cocktail", "bio": "Romana DOC, sempre pronta per un giro a Trastevere.", "lat": 41.8890, "lng": 12.4690, "picture": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop", "aperitivi_count": 22},
    {"name": "Lorenzo Conti", "username": "lorenzo_c", "age": 29, "city": "Torino", "zone": "Quadrilatero", "time_slot": "18-19", "drink": "Birra", "bio": "Vermouth e chiacchiere fino a tardi.", "lat": 45.0700, "lng": 7.6850, "picture": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop", "aperitivi_count": 5},
    {"name": "Chiara Marino", "username": "chiara_m", "age": 26, "city": "Milano", "zone": "Isola", "time_slot": "20-21", "drink": "Analcolico", "bio": "Designer, cerco gente curiosa con cui parlare di tutto.", "lat": 45.4860, "lng": 9.1900, "picture": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop", "aperitivi_count": 15},
    {"name": "Davide Romano", "username": "davide_r", "age": 33, "city": "Bologna", "zone": "Centro", "time_slot": "18-19", "drink": "Vino bianco", "bio": "Tortellini e calici. Bologna è casa.", "lat": 44.4940, "lng": 11.3420, "picture": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop", "aperitivi_count": 9},
    {"name": "Alessia Greco", "username": "alessia_g", "age": 28, "city": "Milano", "zone": "Porta Romana", "time_slot": "20-21", "drink": "Spritz", "bio": "Tre cose: amici nuovi, musica, spritz.", "lat": 45.4520, "lng": 9.2020, "picture": "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop", "aperitivi_count": 18},
    {"name": "Matteo Russo", "username": "matteo_r", "age": 30, "city": "Firenze", "zone": "Oltrarno", "time_slot": "18-19", "drink": "Cocktail", "bio": "Firenze al tramonto è un'altra cosa. Negroni mandatory.", "lat": 43.7660, "lng": 11.2480, "picture": "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=400&fit=crop", "aperitivi_count": 11},
]


async def seed_demo():
    count = await db.users.count_documents({"is_demo": True})
    if count >= len(DEMO_USERS):
        return
    for d in DEMO_USERS:
        if await db.users.find_one({"username": d["username"]}):
            continue
        user_id = f"demo_{uuid.uuid4().hex[:10]}"
        doc = {
            "user_id": user_id,
            "email": f"{d['username']}@demo.facciamoape.it",
            "name": d["name"],
            "picture": d["picture"],
            "username": d["username"],
            "age": d["age"],
            "city": d["city"],
            "zone": d["zone"],
            "time_slot": d["time_slot"],
            "drink": d["drink"],
            "bio": d["bio"],
            "photo_path": None,
            "lat": d["lat"],
            "lng": d["lng"],
            "aperitivi_count": d["aperitivi_count"],
            "blocked_users": [],
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(doc)
    logger.info("Demo users seeded")


@app.on_event("startup")
async def startup():
    # Demo seed disabled for production
    try:
        deleted = await db.users.delete_many({"is_demo": True})
        if deleted.deleted_count:
            logger.info(f"Removed {deleted.deleted_count} demo users")
    except Exception as e:
        logger.error(f"Demo cleanup failed: {e}")
    # Performance indexes
    try:
        await db.reports.create_index([("reported_id", 1), ("reporter_id", 1), ("reason", 1)])
        await db.reports.create_index([("status", 1), ("created_at", -1)])
        await db.messages.create_index([("conversation_id", 1), ("created_at", -1)])
        await db.conversations.create_index([("participants", 1), ("updated_at", -1)])
        await db.users.create_index("email", unique=True)
        await db.users.create_index("username", unique=True, sparse=True)
        await db.user_sessions.create_index("session_token", unique=True)
        logger.info("Indexes ensured")
    except Exception as e:
        logger.error(f"Index creation failed: {e}")


@api_router.get("/")
async def root():
    return {"message": "Facciamo Ape?"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
