"""One-off: delete users by email from MongoDB."""
import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "facciamoape")
SUPER_ADMIN = os.environ.get("SUPER_ADMIN_EMAIL", "lcammarota24@gmail.com").strip().lower()

EMAILS_TO_DELETE = [
    "Luca.cammarota@live.it",
    "keccabio@gmail.com",
]


async def delete_user(db, user_id: str, email: str):
    await db.user_sessions.delete_many({"user_id": user_id})
    convs = await db.conversations.find({"participants": user_id}, {"_id": 0, "id": 1}).to_list(500)
    conv_ids = [c["id"] for c in convs]
    if conv_ids:
        await db.messages.delete_many({"conversation_id": {"$in": conv_ids}})
    await db.conversations.delete_many({"participants": user_id})
    await db.reports.delete_many({"$or": [{"reporter_id": user_id}, {"reported_id": user_id}]})
    await db.password_reset_tokens.delete_many({"email": email})
    await db.magic_links.delete_many({"email": email})
    await db.users.update_many({"referred_by": user_id}, {"$set": {"referred_by": None}})
    result = await db.users.delete_one({"user_id": user_id})
    return result.deleted_count


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    for raw in EMAILS_TO_DELETE:
        email = raw.strip().lower()
        if email == SUPER_ADMIN:
            print(f"SKIP (super admin): {email}")
            continue
        user = await db.users.find_one({"email": {"$regex": f"^{email}$", "$options": "i"}}, {"_id": 0, "user_id": 1, "email": 1, "name": 1})
        if not user:
            print(f"NOT FOUND: {email}")
            continue
        n = await delete_user(db, user["user_id"], user.get("email", email))
        print(f"DELETED ({n}): {user.get('name', '?')} <{user.get('email', email)}>")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
