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
    
    try:
        # Initialiser Firebase Admin si nécessaire
        try:
            initialize_firebase()
        except Exception:
            pass
        # Vérifier le token avec Firebase Admin
        decoded_token = auth.verify_id_token(token)
        
        # Extraire les informations utilisateur
        user_id = decoded_token['uid']
        email = decoded_token.get('email')
        
        return {
            "uid": user_id,
            "email": email,
            "decoded_token": decoded_token
        }
        
    except auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
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