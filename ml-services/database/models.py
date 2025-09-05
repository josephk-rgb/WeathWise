"""Data models for WeathWise ML Services."""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId

class PyObjectId(ObjectId):
    """Custom ObjectId for Pydantic models."""
    
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")

class MLPrediction(BaseModel):
    """Model for storing ML prediction results."""
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
        protected_namespaces=()
    )
    
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: Optional[str] = None
    prediction_type: str  # 'portfolio', 'market', 'risk', 'chat'
    input_data: Dict[str, Any]
    prediction_result: Dict[str, Any]
    confidence_score: Optional[float] = None
    model_version: Optional[str] = None
    processing_time_ms: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None

class ConversationHistory(BaseModel):
    """Model for storing chat conversation history."""
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: Optional[str] = None
    session_id: str
    message_type: str  # 'user', 'assistant'
    content: str
    metadata: Optional[Dict[str, Any]] = {}
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class UserPreferences(BaseModel):
    """Model for storing user ML preferences."""
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    risk_tolerance: Optional[str] = None  # 'conservative', 'moderate', 'aggressive'
    investment_goals: Optional[List[str]] = []
    preferred_sectors: Optional[List[str]] = []
    ml_settings: Optional[Dict[str, Any]] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PortfolioAnalysisResult(BaseModel):
    """Model for portfolio analysis results."""
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    portfolio_data: Dict[str, Any]
    analysis_results: Dict[str, Any]
    recommendations: List[Dict[str, Any]]
    risk_metrics: Dict[str, float]
    diversification_score: Optional[float] = None
    performance_prediction: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MarketPredictionResult(BaseModel):
    """Model for market prediction results."""
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    symbol: str
    timeframe: str  # '1D', '1W', '1M', '3M', '1Y'
    prediction_data: Dict[str, Any]
    confidence_intervals: Dict[str, float]
    market_sentiment: Optional[str] = None
    technical_indicators: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    valid_until: datetime

class RiskAssessmentResult(BaseModel):
    """Model for risk assessment results."""
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    assessment_type: str  # 'portfolio', 'investment', 'profile'
    input_data: Dict[str, Any]
    risk_score: float
    risk_level: str  # 'low', 'medium', 'high'
    risk_factors: List[Dict[str, Any]]
    recommendations: List[str]
    stress_test_results: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
