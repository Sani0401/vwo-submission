"""
Pydantic models for MongoDB collections
Defines the structure for Users, Documents, and AnalysisResults
"""

from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
from bson import ObjectId

class PyObjectId(ObjectId):
    """Custom ObjectId type for Pydantic v2"""
    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type, _handler):
        from pydantic_core import core_schema
        return core_schema.no_info_plain_validator_function(cls.validate)
    
    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str):
            if ObjectId.is_valid(v):
                return ObjectId(v)
        raise ValueError("Invalid ObjectId")
    
    @classmethod
    def __get_pydantic_json_schema__(cls, _field_schema, _handler):
        return {"type": "string"}

class UserRole(str, Enum):
    ADMIN = "Admin"
    VIEWER = "Viewer"

class AccountStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"

class DocumentStatus(str, Enum):
    UPLOADING = "uploading"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class ValidationStatus(str, Enum):
    PASSED = "passed"
    FAILED = "failed"

class LoginHistory(BaseModel):
    device: str
    ip: str
    location: str
    timestamp: datetime

class UserProfile(BaseModel):
    first_name: str
    last_name: str
    phone: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    bio: Optional[str] = None

class UserAccount(BaseModel):
    status: AccountStatus = AccountStatus.ACTIVE
    member_since: datetime
    last_login: Optional[datetime] = None
    login_streak: int = 0
    documents_uploaded_count: int = 0
    analyses_completed_count: int = 0
    storage_used_mb: float = 0.0

class UserSecurity(BaseModel):
    password_last_changed: datetime
    two_factor_enabled: bool = False
    login_history: List[LoginHistory] = []

class User(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str
    email: EmailStr
    password_hash: str
    role: UserRole = UserRole.VIEWER
    
    profile: UserProfile
    account: UserAccount
    security: UserSecurity
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.VIEWER
    profile: UserProfile

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    profile: Optional[UserProfile] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class DocumentMetadata(BaseModel):
    upload_date: datetime
    last_modified: datetime

class Document(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    file_name: str
    file_path: str
    file_size_mb: float
    file_format: str
    checksum: str
    category: Optional[str] = None
    tags: List[str] = []
    
    status: DocumentStatus = DocumentStatus.UPLOADING
    progress: int = 0
    processing_duration_sec: Optional[int] = None
    
    metadata: DocumentMetadata
    analysis_ids: List[PyObjectId] = []
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class DocumentCreate(BaseModel):
    file_name: str
    file_path: str
    file_size_mb: float
    file_format: str
    checksum: str
    category: Optional[str] = None
    tags: List[str] = []

class DocumentUpdate(BaseModel):
    status: Optional[DocumentStatus] = None
    progress: Optional[int] = None
    processing_duration_sec: Optional[int] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None

class AnalysisMetrics(BaseModel):
    revenue: Optional[str] = None
    operating_income: Optional[str] = None
    cash: Optional[str] = None
    # Add more metrics as needed

class AnalysisOutput(BaseModel):
    summary: str
    metrics: Dict[str, Any] = {}
    insights: List[str] = []
    key_findings: List[str] = []
    financial_highlights: List[str] = []
    risks: List[str] = []
    opportunities: List[str] = []
    extraction_quality_score: float = 0.0
    charts: List[str] = []

class AnalysisResult(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    document_id: PyObjectId
    user_id: PyObjectId
    analysis_type: str
    query: str
    
    output: AnalysisOutput
    confidence_score: float
    data_quality_score: float
    validation_status: ValidationStatus = ValidationStatus.PASSED
    error_logs: List[str] = []
    
    processing_time_sec: int
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class AnalysisResultCreate(BaseModel):
    document_id: PyObjectId
    analysis_type: str
    query: str
    output: AnalysisOutput
    confidence_score: float
    data_quality_score: float
    processing_time_sec: int

class AnalysisResultUpdate(BaseModel):
    validation_status: Optional[ValidationStatus] = None
    error_logs: Optional[List[str]] = None

# Response models
class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    profile: UserProfile
    account: UserAccount
    created_at: datetime
    updated_at: datetime

class DocumentResponse(BaseModel):
    id: str
    user_id: str
    file_name: str
    file_path: str
    file_size_mb: float
    file_format: str
    category: Optional[str]
    tags: List[str]
    status: DocumentStatus
    progress: int
    processing_duration_sec: Optional[int]
    analysis_ids: List[str]
    created_at: datetime
    updated_at: datetime

class AnalysisResultResponse(BaseModel):
    id: str
    document_id: str
    document_name: Optional[str] = None
    user_id: str
    analysis_type: str
    query: str
    output: AnalysisOutput
    confidence_score: float
    data_quality_score: float
    validation_status: ValidationStatus
    processing_time_sec: int
    created_at: datetime

# Statistics models
class UserStats(BaseModel):
    total_users: int
    active_users: int
    admin_users: int
    viewer_users: int

class DocumentStats(BaseModel):
    total_documents: int
    documents_by_status: Dict[str, int]
    documents_by_format: Dict[str, int]
    total_storage_mb: float

class AnalysisStats(BaseModel):
    total_analyses: int
    analyses_by_type: Dict[str, int]
    average_confidence_score: float
    average_processing_time: float

# Logging Models
class LogLevel(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    DEBUG = "debug"

class LogCategory(str, Enum):
    AUTHENTICATION = "authentication"
    DOCUMENT = "document"
    ANALYSIS = "analysis"
    USER_MANAGEMENT = "user_management"
    SYSTEM = "system"
    API = "api"
    EXPORT = "export"

class LogAction(str, Enum):
    # Authentication actions
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    USER_REGISTER = "user_register"
    TOKEN_REFRESH = "token_refresh"
    PASSWORD_CHANGE = "password_change"
    
    # Document actions
    DOCUMENT_UPLOAD = "document_upload"
    DOCUMENT_VIEW = "document_view"
    DOCUMENT_DELETE = "document_delete"
    DOCUMENT_UPDATE = "document_update"
    
    # Analysis actions
    ANALYSIS_START = "analysis_start"
    ANALYSIS_COMPLETE = "analysis_complete"
    ANALYSIS_FAIL = "analysis_fail"
    ANALYSIS_VIEW = "analysis_view"
    ANALYSIS_DELETE = "analysis_delete"
    
    # User management actions
    USER_CREATE = "user_create"
    USER_UPDATE = "user_update"
    USER_DELETE = "user_delete"
    USER_VIEW = "user_view"
    
    # System actions
    API_REQUEST = "api_request"
    ERROR_OCCURRED = "error_occurred"
    SYSTEM_STARTUP = "system_startup"
    SYSTEM_SHUTDOWN = "system_shutdown"
    
    # Export actions
    EXPORT = "export"

class LogEntry(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    level: LogLevel
    category: LogCategory
    action: LogAction
    user_id: Optional[PyObjectId] = None
    session_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    # Resource information
    resource_type: Optional[str] = None  # "document", "analysis", "user", etc.
    resource_id: Optional[PyObjectId] = None
    
    # Action details
    message: str
    details: Optional[Dict[str, Any]] = None
    
    # Request/Response information
    request_method: Optional[str] = None
    request_path: Optional[str] = None
    response_status: Optional[int] = None
    processing_time_ms: Optional[float] = None
    
    # Error information
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    stack_trace: Optional[str] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}

class LogEntryCreate(BaseModel):
    level: LogLevel
    category: LogCategory
    action: LogAction
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    message: str
    details: Optional[Dict[str, Any]] = None
    request_method: Optional[str] = None
    request_path: Optional[str] = None
    response_status: Optional[int] = None
    processing_time_ms: Optional[float] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    stack_trace: Optional[str] = None

class LogEntryResponse(BaseModel):
    id: str
    timestamp: datetime
    level: LogLevel
    category: LogCategory
    action: LogAction
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    message: str
    details: Optional[Dict[str, Any]] = None
    request_method: Optional[str] = None
    request_path: Optional[str] = None
    response_status: Optional[int] = None
    processing_time_ms: Optional[float] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    stack_trace: Optional[str] = None

class LogStats(BaseModel):
    total_logs: int
    logs_by_level: Dict[str, int]
    logs_by_category: Dict[str, int]
    logs_by_action: Dict[str, int]
    recent_errors: int
    average_processing_time: float
