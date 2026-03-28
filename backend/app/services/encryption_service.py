import base64
import hashlib

from cryptography.fernet import Fernet

from app.vault import get_secret

ENCRYPTION_KEY = get_secret("humantree/encryption", "ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    raise ValueError("ENCRYPTION_KEY is not set in the environment variables")

# Derive a Fernet-compatible key from ENCRYPTION_KEY
_derived_key = base64.urlsafe_b64encode(hashlib.sha256(ENCRYPTION_KEY.encode()).digest())
_fernet = Fernet(_derived_key)


def encrypt(plain_text: str) -> str:
    """Encrypt a plain text string and return the encrypted token as a string."""
    return _fernet.encrypt(plain_text.encode()).decode()


def decrypt(encrypted_text: str) -> str:
    """Decrypt an encrypted token string and return the plain text."""
    return _fernet.decrypt(encrypted_text.encode()).decode()
