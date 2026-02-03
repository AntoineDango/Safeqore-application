from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import firebase_admin
from firebase_admin import auth

from app.firebase_admin_init import initialize_firebase
# Schéma de sécurité Bearer
security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Vérifie le token Firebase et retourne les informations de l'utilisateur
    """
    token = credentials.credentials
    print(f"[Auth] Received token: {token[:50]}...")
    
    try:
        # Initialiser Firebase Admin si nécessaire
        try:
            print("[Auth] Initializing Firebase Admin...")
            initialize_firebase()
            print("[Auth] Firebase Admin initialized successfully")
        except Exception as init_error:
            print(f"[Auth] Firebase Admin init error: {init_error}")
            pass
        
        # Vérifier le token avec Firebase Admin
        print("[Auth] Verifying token...")
        decoded_token = auth.verify_id_token(token)
        print(f"[Auth] Token verified successfully for user: {decoded_token.get('uid')}")
        
        # Extraire les informations utilisateur
        user_id = decoded_token['uid']
        email = decoded_token.get('email')
        
        return {
            "uid": user_id,
            "email": email,
            "decoded_token": decoded_token
        }
        
    except auth.InvalidIdTokenError as e:
        print(f"[Auth] Invalid token error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth.ExpiredIdTokenError as e:
        print(f"[Auth] Expired token error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        print(f"[Auth] Authentication error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Erreur d'authentification: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional)
) -> dict | None:
    """
    Vérifie le token Firebase mais ne bloque pas si absent
    Utile pour les routes semi-protégées
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None