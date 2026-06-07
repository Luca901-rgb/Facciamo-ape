"""Set password for an existing user."""
import asyncio
import os
import sys
from pathlib import Path

import bcrypt
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "facciamoape")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


async def main():
    if len(sys.argv) < 3:
        print("Usage: python set_password.py <email> <password>")
        sys.exit(1)
    email = sys.argv[1].strip().lower()
    password = sys.argv[2]

    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    user = await db.users.find_one({"email": email}, {"_id": 0, "user_id": 1})
    if not user:
        print(f"NOT FOUND: {email}")
        sys.exit(1)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"password_hash": hash_password(password), "is_admin": True}},
    )
    print(f"Password set for {email}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
