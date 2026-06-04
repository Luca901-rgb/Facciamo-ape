# Auth Testing Playbook — FacciamoApe?

Auth: Emergent Google OAuth. No app-managed passwords.

## Step 1 — Create test user + session
```bash
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
  username: 'test_user_' + Date.now(),
  age: 28, city: 'Milano', zone: 'Navigli',
  time_slot: '20-21', drink: 'Spritz', bio: 'Test',
  photo_path: null, lat: 45.45, lng: 9.17,
  aperitivi_count: 0, blocked_users: [],
  created_at: new Date().toISOString()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
  created_at: new Date().toISOString()
});
print('Session: ' + sessionToken);
print('User: ' + userId);
"
```

## Step 2 — Use session token
Backend accepts the token via:
- `Authorization: Bearer <session_token>` header
- `session_token` cookie (httpOnly, secure, samesite=none, path=/)

## Step 3 — Browser testing
```python
await page.context.add_cookies([{
    "name": "session_token",
    "value": "<SESSION_TOKEN>",
    "domain": "happy-hour-crew.preview.emergentagent.com",
    "path": "/",
    "httpOnly": True,
    "secure": True,
    "sameSite": "None"
}])
await page.goto("https://happy-hour-crew.preview.emergentagent.com/explore")
```

## Endpoints
- `POST /api/auth/session` body `{session_id}` (real OAuth flow)
- `GET /api/auth/me` (requires session)
- `POST /api/auth/logout`
- `GET /api/users/nearby`, `GET /api/users/{id}`
- `PUT /api/users/me`
- `POST /api/users/block/{id}`, `POST /api/users/unblock/{id}`
- `POST /api/conversations` body `{target_user_id, text}`
- `GET /api/conversations`, `GET /api/conversations/{id}`
- `POST /api/conversations/{id}/messages` body `{text}`
- `POST /api/conversations/{id}/accept`
- `POST /api/conversations/{id}/add_participant` body `{username}`
- `POST /api/upload` (multipart)
- `POST /api/waitlist` body `{email, city}` (no auth)
