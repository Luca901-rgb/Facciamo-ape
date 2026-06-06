# Facciamo Ape?

App italiana per trovare compagnia all'aperitivo. Frontend React + backend FastAPI + MongoDB.

## Architettura

| Componente | Hosting | Cartella |
|---|---|---|
| Frontend | [Netlify](https://www.netlify.com) | `frontend/` |
| Backend API | [Render](https://render.com) | `backend/` |
| Database | MongoDB Atlas | — |

## Setup locale

### 1. Backend

```bash
cd backend
cp .env.example .env
# Compila MONGO_URL, EMERGENT_LLM_KEY, CORS_ORIGINS
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# Imposta REACT_APP_BACKEND_URL=http://localhost:8000
npm install
npm start
```

Apri http://localhost:3000

## Deploy su Render (backend)

1. Vai su [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
2. Collega il repo GitHub `Luca901-rgb/Facciamo-ape`
3. Render legge `render.yaml` e crea il servizio `facciamo-ape-api`
4. Imposta le variabili d'ambiente (sync: false nel blueprint):
   - `MONGO_URL` — connection string MongoDB Atlas
   - `DB_NAME` — es. `facciamoape`
   - `EMERGENT_LLM_KEY` — chiave Emergent (storage + auth)
   - `CORS_ORIGINS` — URL Netlify del frontend, es. `https://tuo-sito.netlify.app`
   - `ADMIN_EMAILS` — email admin separate da virgola
5. Dopo il deploy, copia l'URL del servizio (es. `https://facciamo-ape-api.onrender.com`)

## Deploy su Netlify (frontend)

1. Vai su [Netlify](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Collega lo stesso repo GitHub
3. Netlify usa automaticamente `netlify.toml`:
   - Base directory: `frontend`
   - Build: `yarn build`
   - Publish: `build`
4. In **Site configuration → Environment variables** aggiungi:
   - `REACT_APP_BACKEND_URL` = URL Render del backend (senza slash finale)
5. Deploy

## Variabili d'ambiente

### Backend (`backend/.env`)

| Variabile | Descrizione |
|---|---|
| `MONGO_URL` | Connection string MongoDB |
| `DB_NAME` | Nome database |
| `EMERGENT_LLM_KEY` | Chiave Emergent per storage OAuth |
| `CORS_ORIGINS` | URL frontend consentiti (virgola) |
| `ADMIN_EMAILS` | Email admin |
| `APP_NAME` | Prefisso path upload (default `facciamoape`) |

### Frontend (`frontend/.env`)

| Variabile | Descrizione |
|---|---|
| `REACT_APP_BACKEND_URL` | URL base del backend Render |

## Auth

Login via Google OAuth gestito da Emergent (`auth.emergentagent.com`).  
Il redirect post-login punta a `{frontend}/explore#session_id=...`.

Assicurati che `CORS_ORIGINS` sul backend includa l'URL Netlify esatto.

## Note

- Il piano free di Render mette il servizio in sleep dopo inattività (~30s al primo avvio).
- I cookie di sessione sono `SameSite=None; Secure` per funzionare cross-origin (Netlify → Render).
- MongoDB Atlas: aggiungi `0.0.0.0/0` alle IP allowlist per Render, oppure usa Render static outbound IPs.
