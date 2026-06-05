"""Backend tests for Facciamo Ape? — covers health, waitlist, auth gating, profile, conversations, gating, accept, add_participant, block, upload."""
import os
import io
import time
import uuid
import requests
import pytest
from pymongo import MongoClient
from datetime import datetime, timezone, timedelta

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://happy-hour-crew.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

# Direct mongo for seeding test sessions (auth bypass per /app/auth_testing.md)
mc = MongoClient("mongodb://localhost:27017")
mdb = mc["test_database"]


def _seed_user(suffix=""):
    uid = f"test-user-{int(time.time()*1000)}-{suffix}-{uuid.uuid4().hex[:6]}"
    tok = f"test_session_{uid}"
    username = f"testu_{uid[-10:]}".lower()
    mdb.users.insert_one({
        "user_id": uid, "email": f"{uid}@example.com", "name": "Test " + suffix,
        "picture": None, "username": username, "age": 28, "city": "Milano",
        "zone": "Navigli", "time_slot": "20-21", "drink": "Spritz", "bio": "t",
        "photo_path": None, "lat": 45.45, "lng": 9.17,
        "aperitivi_count": 0, "blocked_users": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    mdb.user_sessions.insert_one({
        "user_id": uid, "session_token": tok,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return uid, tok, username


@pytest.fixture(scope="module")
def userA():
    uid, tok, uname = _seed_user("A")
    yield {"uid": uid, "tok": tok, "uname": uname, "h": {"Authorization": f"Bearer {tok}"}}


@pytest.fixture(scope="module")
def userB():
    uid, tok, uname = _seed_user("B")
    yield {"uid": uid, "tok": tok, "uname": uname, "h": {"Authorization": f"Bearer {tok}"}}


@pytest.fixture(scope="module")
def demo_user():
    # Wait briefly for seed in case
    for _ in range(5):
        u = mdb.users.find_one({"username": "giulia_b"})
        if u:
            return u
        time.sleep(1)
    pytest.skip("demo user giulia_b not seeded")


# === Health & waitlist ===
def test_health():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("message") == "Facciamo Ape?"


def test_waitlist():
    r = requests.post(f"{API}/waitlist", json={"email": f"w_{uuid.uuid4().hex[:6]}@x.com", "city": "Milano"})
    assert r.status_code == 200
    d = r.json()
    assert d["ok"] is True and "id" in d


# === Auth gating ===
def test_nearby_requires_auth():
    r = requests.get(f"{API}/users/nearby")
    assert r.status_code == 401


def test_auth_me(userA):
    r = requests.get(f"{API}/auth/me", headers=userA["h"])
    assert r.status_code == 200
    assert r.json()["user_id"] == userA["uid"]


# === Profile update ===
def test_update_profile(userA):
    payload = {"age": 30, "city": "Roma", "zone": "Trastevere", "time_slot": "18-19",
               "drink": "Vino", "bio": "updated", "lat": 41.89, "lng": 12.47}
    r = requests.put(f"{API}/users/me", json=payload, headers=userA["h"])
    assert r.status_code == 200
    d = r.json()
    assert d["age"] == 30 and d["city"] == "Roma" and d["bio"] == "updated"
    # persist check
    r2 = requests.get(f"{API}/auth/me", headers=userA["h"])
    assert r2.json()["zone"] == "Trastevere"


# === Nearby ===
def test_nearby_includes_demos(userA, demo_user):
    r = requests.get(f"{API}/users/nearby", headers=userA["h"])
    assert r.status_code == 200
    users = r.json()
    unames = {u.get("username") for u in users}
    for required in ["giulia_b", "marco_r", "sofia_e", "lorenzo_c", "chiara_m"]:
        assert required in unames, f"missing demo {required}"
    # Should not include self
    assert userA["uid"] not in [u["user_id"] for u in users]


def test_get_single_user_distance(userA, demo_user):
    r = requests.get(f"{API}/users/{demo_user['user_id']}", headers=userA["h"])
    assert r.status_code == 200
    d = r.json()
    assert d["user_id"] == demo_user["user_id"]
    assert "distance_km" in d


# === Conversation flow ===
def test_conversation_flow_and_gating(userA, demo_user):
    target = demo_user["user_id"]
    r = requests.post(f"{API}/conversations", json={"target_user_id": target, "text": "ciao"}, headers=userA["h"])
    assert r.status_code == 200, r.text
    d = r.json()
    cid = d["conversation_id"]
    assert d["message"]["text"] == "ciao"

    # Second message via POST /conversations -> 403
    r2 = requests.post(f"{API}/conversations", json={"target_user_id": target, "text": "second"}, headers=userA["h"])
    assert r2.status_code == 403
    assert "Aspetta che ti risponda" in r2.text

    # Second message via /messages -> 403
    r3 = requests.post(f"{API}/conversations/{cid}/messages", json={"text": "second"}, headers=userA["h"])
    assert r3.status_code == 403
    assert "Aspetta" in r3.text

    # Simulate demo replying — create a session for demo user
    demo_tok = f"test_session_demo_{uuid.uuid4().hex[:8]}"
    mdb.user_sessions.insert_one({
        "user_id": target, "session_token": demo_tok,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    # Get aperitivi before
    a_before = mdb.users.find_one({"user_id": userA["uid"]})["aperitivi_count"]
    d_before = mdb.users.find_one({"user_id": target})["aperitivi_count"]
    r4 = requests.post(f"{API}/conversations/{cid}/messages", json={"text": "ciao a te"},
                       headers={"Authorization": f"Bearer {demo_tok}"})
    assert r4.status_code == 200
    a_after = mdb.users.find_one({"user_id": userA["uid"]})["aperitivi_count"]
    d_after = mdb.users.find_one({"user_id": target})["aperitivi_count"]
    assert a_after == a_before + 1
    assert d_after == d_before + 1

    # Conv is accepted now
    conv = mdb.conversations.find_one({"id": cid})
    assert conv["accepted"] is True

    # Now A can send unlimited
    r5 = requests.post(f"{API}/conversations/{cid}/messages", json={"text": "third"}, headers=userA["h"])
    assert r5.status_code == 200
    r6 = requests.post(f"{API}/conversations/{cid}/messages", json={"text": "fourth"}, headers=userA["h"])
    assert r6.status_code == 200


def test_accept_own_conv_forbidden(userA):
    # Create new convo to a new demo (marco_r) to avoid prior state
    marco = mdb.users.find_one({"username": "marco_r"})
    r = requests.post(f"{API}/conversations", json={"target_user_id": marco["user_id"], "text": "yo"}, headers=userA["h"])
    assert r.status_code == 200
    cid = r.json()["conversation_id"]
    r2 = requests.post(f"{API}/conversations/{cid}/accept", headers=userA["h"])
    assert r2.status_code == 403


def test_add_participant_becomes_group(userA, userB):
    # Create conv A->demo (sofia_e); then A adds userB by username
    sofia = mdb.users.find_one({"username": "sofia_e"})
    r = requests.post(f"{API}/conversations", json={"target_user_id": sofia["user_id"], "text": "hi"}, headers=userA["h"])
    cid = r.json()["conversation_id"]
    r2 = requests.post(f"{API}/conversations/{cid}/add_participant",
                      json={"username": userB["uname"]}, headers=userA["h"])
    assert r2.status_code == 200, r2.text
    conv = mdb.conversations.find_one({"id": cid})
    assert conv["is_group"] is True
    assert conv["accepted"] is True
    assert len(conv["participants"]) == 3


def test_block_filters_and_blocks_messaging(userA):
    chiara = mdb.users.find_one({"username": "chiara_m"})
    r = requests.post(f"{API}/users/block/{chiara['user_id']}", headers=userA["h"])
    assert r.status_code == 200
    # nearby should not include chiara
    r2 = requests.get(f"{API}/users/nearby", headers=userA["h"])
    unames = {u.get("username") for u in r2.json()}
    assert "chiara_m" not in unames
    # Have chiara block userA back to test the other direction also
    mdb.users.update_one({"user_id": chiara["user_id"]}, {"$addToSet": {"blocked_users": userA["uid"]}})
    # Now creating a conv to chiara should fail 403 (chiara has blocked us)
    r3 = requests.post(f"{API}/conversations",
                       json={"target_user_id": chiara["user_id"], "text": "hi"}, headers=userA["h"])
    assert r3.status_code == 403


def test_upload_and_download(userA):
    # Tiny valid JPEG bytes
    jpeg = bytes.fromhex(
        "ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffda000c03010002110311003f00fbfb0014ffd9"
    )
    files = {"file": ("test.jpg", io.BytesIO(jpeg), "image/jpeg")}
    r = requests.post(f"{API}/upload", files=files, headers=userA["h"])
    assert r.status_code == 200, r.text
    path = r.json()["path"]
    assert path
    # Download
    r2 = requests.get(f"{API}/files/{path}")
    assert r2.status_code == 200
    assert r2.headers.get("content-type", "").startswith("image/")
    assert len(r2.content) > 0


# === New features: ws-token, referral, websocket ===
def test_ws_token_requires_auth():
    r = requests.get(f"{API}/auth/ws-token")
    assert r.status_code == 401


def test_ws_token_returns_token(userA):
    r = requests.get(f"{API}/auth/ws-token", headers=userA["h"])
    assert r.status_code == 200
    assert r.json().get("ws_token") == userA["tok"]


def test_my_referral_endpoint(userA):
    r = requests.get(f"{API}/users/me/referral", headers=userA["h"])
    assert r.status_code == 200
    d = r.json()
    assert d["username"] == userA["uname"]
    assert f"/?ref={userA['uname']}" in d["link"]
    assert "invited_count" in d and "completed_count" in d


def test_referral_completion_flow():
    # Create referrer R and referred user X (X.referred_by = R)
    rid, rtok, runame = _seed_user("R")
    xid = f"test-user-x-{uuid.uuid4().hex[:8]}"
    xtok = f"test_session_{xid}"
    mdb.users.insert_one({
        "user_id": xid, "email": f"{xid}@x.com", "name": "Referred X",
        "username": f"x_{xid[-6:]}", "age": 25, "city": "Milano", "zone": "Navigli",
        "time_slot": "20-21", "drink": "Spritz", "bio": "x",
        "lat": 45.45, "lng": 9.17, "aperitivi_count": 0, "blocked_users": [],
        "referred_by": rid, "referral_completed_with": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    mdb.user_sessions.insert_one({
        "user_id": xid, "session_token": xtok,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    hR = {"Authorization": f"Bearer {rtok}"}
    hX = {"Authorization": f"Bearer {xtok}"}
    # R messages X first
    r1 = requests.post(f"{API}/conversations", json={"target_user_id": xid, "text": "ciao amico"}, headers=hR)
    assert r1.status_code == 200
    cid = r1.json()["conversation_id"]
    # X replies (auto-accept) -> triggers maybe_complete_referral
    r2 = requests.post(f"{API}/conversations/{cid}/messages", json={"text": "ehi!"}, headers=hX)
    assert r2.status_code == 200
    # Verify both have each other in referral_completed_with
    R = mdb.users.find_one({"user_id": rid})
    X = mdb.users.find_one({"user_id": xid})
    assert xid in R.get("referral_completed_with", []), f"R missing X: {R.get('referral_completed_with')}"
    assert rid in X.get("referral_completed_with", []), f"X missing R: {X.get('referral_completed_with')}"
    assert R["aperitivi_count"] >= 1 and X["aperitivi_count"] >= 1

    # Idempotency: invoking accept again should not duplicate (already accepted, but force re-run helper)
    r3 = requests.post(f"{API}/conversations/{cid}/messages", json={"text": "ancora"}, headers=hR)
    assert r3.status_code == 200
    R2 = mdb.users.find_one({"user_id": rid})
    assert R2["referral_completed_with"].count(xid) == 1


def test_auth_session_referrer_invalid_no_crash():
    # Posting with invalid session_id should 401; we just verify endpoint shape
    r = requests.post(f"{API}/auth/session", json={"session_id": "bogus", "referrer_username": "giulia_b"})
    assert r.status_code in (400, 401)


def test_websocket_broadcast(userA):
    """Two users open WS; A POSTs message; both should receive via WS."""
    try:
        from websockets.sync.client import connect
    except Exception:
        pytest.skip("websockets lib not installed")
    # Seed userZ
    zid, ztok, zuname = _seed_user("Z")
    ws_base = BASE.replace("https://", "wss://").replace("http://", "ws://")
    import json as _json
    received_a, received_z = [], []
    with connect(f"{ws_base}/api/ws/{userA['tok']}", open_timeout=10) as wsA, \
         connect(f"{ws_base}/api/ws/{ztok}", open_timeout=10) as wsZ:
        # A initiates conversation to Z
        r = requests.post(f"{API}/conversations",
                          json={"target_user_id": zid, "text": "ws-hello"}, headers=userA["h"])
        assert r.status_code == 200
        cid = r.json()["conversation_id"]
        # Read frames with short timeout
        for ws, bucket in ((wsA, received_a), (wsZ, received_z)):
            try:
                ws.socket.settimeout(5)
                frame = ws.recv(timeout=5)
                bucket.append(_json.loads(frame))
            except Exception as e:
                print(f"recv error: {e}")
    assert any(m.get("type") == "message" and m.get("conversation_id") == cid for m in received_a), received_a
    assert any(m.get("type") == "message" and m.get("conversation_id") == cid for m in received_z), received_z


# === Moderation: report + auto-suspension ===
def test_report_requires_auth():
    r = requests.post(f"{API}/users/report/anyone", json={"reason": "spam"})
    assert r.status_code == 401


def test_report_self_blocked(userA):
    r = requests.post(f"{API}/users/report/{userA['uid']}", json={"reason": "spam"}, headers=userA["h"])
    assert r.status_code == 400
    assert "te stesso" in r.text


def test_report_invalid_reason(userA, userB):
    r = requests.post(f"{API}/users/report/{userB['uid']}", json={"reason": "wrong_value"}, headers=userA["h"])
    assert r.status_code == 400
    assert "Motivo non valido" in r.text


def test_report_idempotent_no_suspend(userA):
    # Fresh target
    tid, _, _ = _seed_user("RT1")
    # Same reporter twice with same reason -> already_reported, no double row, no suspend
    r1 = requests.post(f"{API}/users/report/{tid}", json={"reason": "spam"}, headers=userA["h"])
    assert r1.status_code == 200 and r1.json().get("ok") is True
    r2 = requests.post(f"{API}/users/report/{tid}", json={"reason": "spam"}, headers=userA["h"])
    assert r2.status_code == 200 and r2.json().get("already_reported") is True
    target = mdb.users.find_one({"user_id": tid})
    assert not target.get("is_suspended")
    # And reporter side blocked the target
    A = mdb.users.find_one({"user_id": userA["uid"]})
    assert tid in A.get("blocked_users", [])
    # Cleanup reports for this target
    mdb.reports.delete_many({"reported_id": tid})


def test_auto_suspend_at_3_unique_reporters():
    tid, _, _ = _seed_user("TGT")
    reporters = []
    for s in ["R1", "R2", "R3"]:
        uid, tok, _ = _seed_user(s)
        reporters.append((uid, tok))
    # First 2 -> not suspended
    for i, (uid, tok) in enumerate(reporters):
        r = requests.post(f"{API}/users/report/{tid}", json={"reason": "molestie"},
                          headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 200
        t = mdb.users.find_one({"user_id": tid})
        if i < 2:
            assert not t.get("is_suspended"), f"suspended early after {i+1}"
        else:
            assert t.get("is_suspended") is True
            assert t.get("suspended_at")

    # Suspended user excluded from nearby
    other_uid, other_tok, _ = _seed_user("OBS")
    r2 = requests.get(f"{API}/users/nearby", headers={"Authorization": f"Bearer {other_tok}"})
    assert r2.status_code == 200
    assert tid not in [u["user_id"] for u in r2.json()]

    # Cannot message a suspended target
    r3 = requests.post(f"{API}/conversations",
                       json={"target_user_id": tid, "text": "hi"},
                       headers={"Authorization": f"Bearer {other_tok}"})
    assert r3.status_code == 403
    assert "non è più disponibile" in r3.text or "non e' piu' disponibile" in r3.text.lower()

    # Suspended user cannot create conversations
    # Make a session for the suspended user
    sus_tok = f"test_session_sus_{uuid.uuid4().hex[:8]}"
    mdb.user_sessions.insert_one({
        "user_id": tid, "session_token": sus_tok,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    marco = mdb.users.find_one({"username": "marco_r"})
    r4 = requests.post(f"{API}/conversations",
                       json={"target_user_id": marco["user_id"], "text": "hi"},
                       headers={"Authorization": f"Bearer {sus_tok}"})
    assert r4.status_code == 403
    assert "sospeso" in r4.text.lower()

    # Suspended user cannot send messages in existing conv
    # Create conv from clean user -> we'll piggyback: use existing conv participants only if exist
    # Make a conv where suspended user is a participant: pre-insert
    conv_id = str(uuid.uuid4())
    mdb.conversations.insert_one({
        "id": conv_id, "participants": [tid, marco["user_id"]],
        "is_group": False, "initiated_by": [marco["user_id"]],
        "accepted": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    r5 = requests.post(f"{API}/conversations/{conv_id}/messages",
                       json={"text": "test"},
                       headers={"Authorization": f"Bearer {sus_tok}"})
    assert r5.status_code == 403
    assert "Account sospeso" in r5.text

    mdb.reports.delete_many({"reported_id": tid})
    mdb.conversations.delete_one({"id": conv_id})


# Cleanup
def teardown_module(module):
    try:
        mdb.user_sessions.delete_many({"session_token": {"$regex": "^test_session_"}})
        mdb.users.delete_many({"user_id": {"$regex": "^test-user-"}})
        mdb.waitlist.delete_many({"email": {"$regex": "^w_"}})
    except Exception:
        pass
