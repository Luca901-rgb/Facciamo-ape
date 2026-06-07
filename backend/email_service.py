"""Transactional email via Brevo REST API (HTTPS, works on Render free)."""
import logging
import os
import re
from typing import Optional, Tuple

import requests

from config import frontend_url

logger = logging.getLogger(__name__)

BREVO_API_KEY = os.environ.get("BREVO_API_KEY")
EMAIL_FROM = os.environ.get("EMAIL_FROM", "lcammarota24@gmail.com")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Facciamo Ape")
BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def _sender_parts() -> Tuple[str, str]:
    if "<" in EMAIL_FROM and ">" in EMAIL_FROM:
        name = EMAIL_FROM.split("<", 1)[0].strip().strip('"') or EMAIL_FROM_NAME
        email = EMAIL_FROM.split("<", 1)[1].rsplit(">", 1)[0].strip()
        return name, email
    return EMAIL_FROM_NAME, EMAIL_FROM.strip()


def _email_layout(
    title: str,
    body_html: str,
    button_label: Optional[str] = None,
    button_href: Optional[str] = None,
    footer: str = "",
) -> str:
    button = ""
    if button_label and button_href:
        button = f"""
    <p style="margin:28px 0;">
      <a href="{button_href}" style="background:#e85d04;color:#fff;text-decoration:none;font-weight:bold;padding:14px 24px;border-radius:999px;display:inline-block;">
        {button_label}
      </a>
    </p>"""
    link_fallback = ""
    if button_href:
        link_fallback = f'<p style="color:#666;font-size:12px;word-break:break-all;">Se il pulsante non funziona: {button_href}</p>'
    return f"""<!DOCTYPE html>
<html><body style="font-family:sans-serif;background:#0f0f0f;color:#f5f5f5;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#1a1a1a;border-radius:16px;padding:32px;border:1px solid #333;">
    <h1 style="margin:0 0 8px;font-size:24px;">Facciamo<span style="color:#e85d04;">Ape?</span></h1>
    <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;">{title}</h2>
    <div style="color:#aaa;line-height:1.6;">{body_html}</div>
    {button}
    {link_fallback}
    {footer}
  </div>
</body></html>"""


def _html_to_plain(html: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()


def send_via_brevo(to: str, subject: str, html: str, text: str = "") -> bool:
    if not BREVO_API_KEY:
        logger.error("BREVO_API_KEY not configured")
        return False
    name, from_email = _sender_parts()
    plain = text or _html_to_plain(html)
    payload = {
        "sender": {"name": name, "email": from_email},
        "to": [{"email": to}],
        "subject": subject,
        "htmlContent": html,
        "textContent": plain,
    }
    try:
        r = requests.post(
            BREVO_API_URL,
            headers={"api-key": BREVO_API_KEY, "Content-Type": "application/json"},
            json=payload,
            timeout=30,
        )
        if r.status_code in (200, 201):
            logger.info("Brevo email sent to %s (from %s)", to, from_email)
            return True
        logger.error("Brevo API failed: %s %s", r.status_code, r.text)
    except Exception as e:
        logger.error("Brevo API error: %s", e)
    return False


def send_email(to: str, subject: str, html: str, text: str = "") -> bool:
    return send_via_brevo(to, subject, html, text)


def send_welcome_email(to: str, name: str) -> bool:
    explore_url = f"{frontend_url()}/explore"
    html = _email_layout(
        "Benvenuto!",
        f"<p>Ciao <strong>{name}</strong>,</p>"
        f"<p>Il tuo account è attivo. Completa il profilo e scopri chi ha voglia di un aperitivo stasera.</p>",
        "Apri Facciamo Ape",
        explore_url,
    )
    text = f"Ciao {name},\n\nBenvenuto su Facciamo Ape! Apri l'app: {explore_url}"
    return send_via_brevo(to, "Benvenuto su Facciamo Ape 🍊", html, text)


def send_password_reset_email(to: str, link: str, ttl_minutes: int) -> bool:
    html = _email_layout(
        "Reimposta la password",
        f"<p>Hai richiesto di reimpostare la password. Il link scade tra {ttl_minutes} minuti.</p>"
        f"<p>Se non sei stato tu, ignora questa email.</p>",
        "Reimposta password",
        link,
    )
    text = f"Reimposta la password (scade tra {ttl_minutes} minuti):\n\n{link}"
    return send_via_brevo(to, "Reimposta la password — Facciamo Ape", html, text)


def send_magic_link_email(to: str, link: str, ttl_minutes: int) -> bool:
    html = _email_layout(
        "Entra su Facciamo Ape",
        f"<p>Clicca per accedere. Il link scade tra {ttl_minutes} minuti.</p>",
        "Entra ora",
        link,
    )
    text = f"Entra su Facciamo Ape (scade tra {ttl_minutes} minuti):\n\n{link}"
    return send_via_brevo(to, "Il tuo link di accesso — Facciamo Ape", html, text)


def email_configured() -> bool:
    return bool(BREVO_API_KEY)
