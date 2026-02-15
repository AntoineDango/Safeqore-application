import os
import json
import base64
import firebase_admin
from firebase_admin import credentials

_initialized = False

def initialize_firebase():
    """
    Initialize Firebase Admin SDK once per process.
    Priority of credentials:
    1) GOOGLE_APPLICATION_CREDENTIALS = path to service account JSON file
    2) FIREBASE_CREDENTIALS_JSON or FIREBASE_SERVICE_ACCOUNT_JSON = raw JSON string of service account
    2b) FIREBASE_SERVICE_ACCOUNT_B64 = base64-encoded JSON string of service account
    3) Application Default Credentials (ADC) or default init
    """
    global _initialized
    if _initialized and firebase_admin._apps:
        return firebase_admin.get_app()

    try:
        if not firebase_admin._apps:
            cred = None

            sa_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
            raw = (
                os.getenv("FIREBASE_CREDENTIALS_JSON")
                or os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
            )
            b64 = os.getenv("FIREBASE_SERVICE_ACCOUNT_B64")

            if sa_path and os.path.isfile(sa_path):
                cred = credentials.Certificate(sa_path)
            elif raw:
                # Expecting a valid JSON string as produced by Firebase console
                try:
                    data = json.loads(raw)
                except Exception:
                    # Sometimes the JSON may contain accidental wrapping quotes; attempt to strip
                    raw_stripped = raw.strip().strip("'\"")
                    data = json.loads(raw_stripped)
                cred = credentials.Certificate(data)
            elif b64:
                # Support base64-encoded JSON secret to avoid escaping issues
                decoded = base64.b64decode(b64).decode("utf-8")
                data = json.loads(decoded)
                cred = credentials.Certificate(data)

            if cred is not None:
                firebase_admin.initialize_app(cred)
            else:
                # Try ADC, then fall back to default init
                try:
                    adc = credentials.ApplicationDefault()
                    firebase_admin.initialize_app(adc)
                except Exception:
                    firebase_admin.initialize_app()

        _initialized = True
        return firebase_admin.get_app()
    except Exception as e:
        raise RuntimeError(f"Failed to initialize Firebase Admin: {e}")
