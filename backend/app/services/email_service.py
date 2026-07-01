"""
Minimal email sending service.
In EMAIL_DEV_MODE (default), emails are just printed to the console/logs —
this keeps the whole stack at $0 with zero external signup required.
Flip EMAIL_DEV_MODE=False and fill in SMTP_* settings (e.g. free Brevo/Mailtrap
tier) to send real emails without changing any calling code.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import settings


def _send(to_email: str, subject: str, html_body: str) -> None:
    if settings.EMAIL_DEV_MODE or not settings.SMTP_HOST:
        print("\n" + "=" * 60)
        print(f"[DEV EMAIL] To: {to_email}")
        print(f"[DEV EMAIL] Subject: {subject}")
        print(f"[DEV EMAIL] Body:\n{html_body}")
        print("=" * 60 + "\n")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.EMAIL_FROM, [to_email], msg.as_string())


def send_verification_email(to_email: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    _send(
        to_email,
        "Verify your email",
        f"<p>Welcome! Click below to verify your email:</p><p><a href='{link}'>{link}</a></p>",
    )


def send_password_reset_email(to_email: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    _send(
        to_email,
        "Reset your password",
        f"<p>Click below to reset your password (expires in {settings.PASSWORD_RESET_EXPIRE_MINUTES} min):</p>"
        f"<p><a href='{link}'>{link}</a></p>",
    )
