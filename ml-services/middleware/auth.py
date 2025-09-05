"""
Authentication middleware for ML services using Auth0 JWT validation.
"""

from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from typing import Optional, Dict, Any
import httpx
import os
import logging
import time

logger = logging.getLogger(__name__)

# Auth0 configuration
AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")
AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE")
AUTH0_ALGORITHMS = ["RS256"]

security = HTTPBearer()

class AuthenticationError(Exception):
    """Custom authentication error"""
    pass

class Auth0Validator:
    """Auth0 JWT token validator"""
    
    def __init__(self):
        self.jwks_cache = {}
        self.jwks_cache_time = 0
        self.jwks_cache_ttl = 300  # 5 minutes
    
    async def get_jwks(self) -> Dict[str, Any]:
        """Get JWKS from Auth0 with caching"""
        current_time = time.time()
        
        # Check cache
        if (self.jwks_cache and 
            current_time - self.jwks_cache_time < self.jwks_cache_ttl):
            return self.jwks_cache
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
                )
                response.raise_for_status()
                
                self.jwks_cache = response.json()
                self.jwks_cache_time = current_time
                
                logger.info("✅ JWKS cache updated")
                return self.jwks_cache
                
        except Exception as e:
            logger.error(f"❌ Failed to fetch JWKS: {e}")
            raise AuthenticationError(f"Failed to fetch JWKS: {e}")
    
    async def get_signing_key(self, token: str) -> str:
        """Get signing key for token validation"""
        try:
            # Decode header without verification
            unverified_header = jwt.get_unverified_header(token)
            
            # Get JWKS
            jwks = await self.get_jwks()
            
            # Find the key
            for key in jwks.get("keys", []):
                if key.get("kid") == unverified_header.get("kid"):
                    return key
            
            raise AuthenticationError("Unable to find appropriate key")
            
        except JWTError as e:
            raise AuthenticationError(f"Invalid token header: {e}")
    
    async def validate_token(self, token: str) -> Dict[str, Any]:
        """Validate Auth0 JWT token"""
        try:
            # Get signing key
            signing_key = await self.get_signing_key(token)
            
            # Validate token
            payload = jwt.decode(
                token,
                signing_key,
                algorithms=AUTH0_ALGORITHMS,
                audience=AUTH0_AUDIENCE,
                issuer=f"https://{AUTH0_DOMAIN}/"
            )
            
            logger.info(f"✅ Token validated for user: {payload.get('sub')}")
            return payload
            
        except JWTError as e:
            logger.error(f"❌ Token validation failed: {e}")
            raise AuthenticationError(f"Token validation failed: {e}")

# Global validator instance
auth0_validator = Auth0Validator()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Optional[Dict[str, Any]]:
    """
    Dependency to get current authenticated user.
    Returns None if authentication is optional.
    """
    if not credentials:
        return None
    
    try:
        payload = await auth0_validator.validate_token(credentials.credentials)
        return {
            "user_id": payload.get("sub"),
            "email": payload.get("email"),
            "permissions": payload.get("permissions", []),
            "token": credentials.credentials
        }
    except AuthenticationError:
        return None

async def require_authentication(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    Dependency that requires authentication.
    Raises HTTPException if authentication fails.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        payload = await auth0_validator.validate_token(credentials.credentials)
        return {
            "user_id": payload.get("sub"),
            "email": payload.get("email"),
            "permissions": payload.get("permissions", []),
            "token": credentials.credentials
        }
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

def verify_permissions(required_permissions: list):
    """Dependency factory for permission-based access control"""
    def _verify_permissions(user: Dict[str, Any] = Depends(require_authentication)):
        user_permissions = user.get("permissions", [])
        
        for permission in required_permissions:
            if permission not in user_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions. Required: {required_permissions}"
                )
        
        return user
    
    return _verify_permissions

# Environment validation
if not AUTH0_DOMAIN or not AUTH0_AUDIENCE:
    logger.warning("⚠️ Auth0 environment variables not configured. Authentication will be disabled.")
    
    # Fallback dependencies for development
    async def get_current_user_fallback(
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ) -> Optional[Dict[str, Any]]:
        """Fallback for when Auth0 is not configured"""
        if credentials:
            return {
                "user_id": "dev_user_123",
                "email": "dev@example.com",
                "permissions": ["read:all", "write:all"],
                "token": credentials.credentials
            }
        return None
    
    async def require_authentication_fallback(
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ) -> Dict[str, Any]:
        """Fallback that allows development without Auth0"""
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required (development mode)",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return {
            "user_id": "dev_user_123",
            "email": "dev@example.com",
            "permissions": ["read:all", "write:all"],
            "token": credentials.credentials
        }
    
    # Replace dependencies in development
    get_current_user = get_current_user_fallback
    require_authentication = require_authentication_fallback
    
    logger.info("🔧 Using fallback authentication for development")
else:
    logger.info("✅ Auth0 authentication configured")
