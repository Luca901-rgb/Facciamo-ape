# Facciamo Ape? — PRD

## Original problem statement
Italian aperitivo companion app. Mobile-first, dark warm amber & burnt orange palette. NO swipe, NO dating, NO algorithms. Landing page with email+city waitlist; "Come funziona" (3 passi); profile with foto/nome/età/distanza/zona/fascia oraria/ordine al bar/bio/aperitivi count (no interests). Messaging: 1st message free, 2nd unlocks only after accept, block anytime. Group chat: add by username → diventa di gruppo. Tono: informale, italiano, caldo.

## User choices
- Login: Emergent-managed Google OAuth
- Photos: real object storage upload
- Distance: real geolocation (browser GPS)
- Chat: realtime (websocket scaffold + 4s polling)
- Demo data: pre-seeded Italian profiles (Milano, Roma, Torino, Firenze, Bologna)

## Architecture
- Backend: FastAPI + Motor + MongoDB. All routes under `/api`. WebSocket `/api/ws/{token}`.
- Frontend: React 19 + Tailwind + Shadcn UI primitives. Fonts: Cabinet Grotesk (display) + Outfit (body).
- Storage: Emergent object storage at `facciamoape/uploads/{user_id}/{uuid}.{ext}`. Downloads via `/api/files/{path}`.

## What's been implemented (2026-02-04)
- Landing page (hero, 3 steps, drink vibes strip, manifesto, footer) with waitlist + Google login CTAs
- Google OAuth flow (AuthCallback handles `#session_id`, sets httpOnly cookie)
- Onboarding flow for new users (età, città, zona, fascia oraria, drink, bio, GPS)
- Explore page — grid of nearby user cards sorted by distance, excludes blocked users
- Public profile page — full details, "Scrivi a …" first-message form, block button
- Self profile page — edit all fields, upload avatar to object storage, update GPS
- Conversation create with gating (1st msg free, 403 on 2nd if not accepted)
- Conversation detail with message thread, accept banner, gating notice, add participant modal
- Auto-accept when the other party replies, +1 to aperitivi_count for both
- Block / unblock endpoints; blocked users filtered from nearby + conversation create
- Group chat: add by username → is_group=true
- Demo seed: 8 Italian profiles created at startup

## Backlog / Next
- P1: replace polling with real WS connection (expose short-lived ws token via `/auth/me` since cookie is httpOnly)
- P1: unread counters per conversation
- P2: city-based filter on explore
- P2: profile reporting / moderation flow
- P2: "Stasera disponibile" toggle on profile

## Test credentials
See `/app/memory/test_credentials.md` (mongosh script to create a session_token).
