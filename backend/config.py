import os

PRODUCTION_FRONTEND_URL = "https://facciamoape.netlify.app"


def frontend_url() -> str:
    url = os.environ.get("FRONTEND_URL", PRODUCTION_FRONTEND_URL).rstrip("/")
    if os.environ.get("RENDER") and "localhost" in url:
        return PRODUCTION_FRONTEND_URL
    return url
