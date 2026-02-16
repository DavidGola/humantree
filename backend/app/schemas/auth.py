from pydantic import BaseModel, ConfigDict


class JWTTokenSchema(BaseModel):
    """Schema representing a JWT token."""

    model_config = ConfigDict(from_attributes=True)
    username: str
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # Durée de validité du token en secondes
