import base64
import hashlib
import os

from cryptography.fernet import Fernet

SECRET_KEY = os.getenv("SECRET_KEY", "")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY is not set in the environment variables")

# Derive a Fernet-compatible key from SECRET_KEY
_derived_key = base64.urlsafe_b64encode(
    hashlib.sha256(SECRET_KEY.encode()).digest()
)
_fernet = Fernet(_derived_key)


def encrypt(plain_text: str) -> str:
    """Encrypt a plain text string and return the encrypted token as a string."""
    return _fernet.encrypt(plain_text.encode()).decode()


def decrypt(encrypted_text: str) -> str:
    """Decrypt an encrypted token string and return the plain text."""
    return _fernet.decrypt(encrypted_text.encode()).decode()
