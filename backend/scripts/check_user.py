"""Check user account in MongoDB."""
import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "facciamoape")
EMAIL = "lcammarota24@gmail.com"


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    user = await db.users.find_one(
        {"email": {"$regex": f"^{EMAIL}$", "$options": "i"}},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1, "password_hash": 1, "is_admin": 1, "picture": 1},
    )
    if not user:
        print("USER NOT FOUND")
    else:
        has_pw = bool(user.get("password_hash"))
        print(f"email={user.get('email')}")
        print(f"name={user.get('name')}")
        print(f"user_id={user.get('user_id')}")
        print(f"is_admin={user.get('is_admin')}")
        print(f"has_password={has_pw}")
        if has_pw:
            print(f"password_hash_prefix={user['password_hash'][:20]}...")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
