from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt_sha256", "bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash a password using bcrypt (SHA-256 prehash for long passwords)"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    try:
        ok = pwd_context.verify(plain_password, hashed_password)
        if ok:
            return True
        if len(plain_password) > 72 and hashed_password.startswith(("$2a$", "$2b$", "$2y$")):
            return pwd_context.verify(plain_password[:72], hashed_password)
        return False
    except ValueError:
        if len(plain_password) > 72 and hashed_password.startswith(("$2a$", "$2b$", "$2y$")):
            try:
                return pwd_context.verify(plain_password[:72], hashed_password)
            except ValueError:
                return False
        return False
