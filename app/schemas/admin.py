from pydantic import BaseModel


class AdminVerifyRequest(BaseModel):
    secret_key: str


class AdminVerifyResponse(BaseModel):
    valid: bool


class SeedTestDataResponse(BaseModel):
    message: str
    counts: dict[str, int]
