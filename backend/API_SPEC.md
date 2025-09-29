# Financial Document Analyzer API Specification

## Overview

The Financial Document Analyzer API is a comprehensive REST API built with FastAPI that provides financial document analysis, user management, and authentication services. The API uses MongoDB for data storage and CrewAI for intelligent document analysis.

## Base URL

```
http://localhost:8000
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## API Endpoints

### 🔐 Authentication Endpoints

#### 1. Register User
**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "role": "Viewer",
  "profile": {
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1-555-0123",
    "location": "New York, USA",
    "website": "https://johndoe.com",
    "bio": "Financial Analyst"
  }
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "64f1c2d123456789abcdef01",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Viewer"
  }
}
```

**cURL Example:**
```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword123",
    "role": "Viewer",
    "profile": {
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+1-555-0123",
      "location": "New York, USA",
      "bio": "Financial Analyst"
    }
  }'
```

#### 2. Login User
**POST** `/auth/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "64f1c2d123456789abcdef01",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Viewer"
  }
}
```

**cURL Example:**
```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

#### 3. Get Current User Info
**GET** `/auth/me`

Get information about the currently authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "64f1c2d123456789abcdef01",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "Viewer",
  "profile": {
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1-555-0123",
    "location": "New York, USA",
    "website": "https://johndoe.com",
    "bio": "Financial Analyst"
  },
  "account": {
    "status": "active",
    "member_since": "2023-08-01T10:00:00Z",
    "last_login": "2025-01-22T18:45:00Z",
    "login_streak": 7,
    "documents_uploaded_count": 24,
    "analyses_completed_count": 58,
    "storage_used_mb": 220.5
  },
  "created_at": "2023-08-01T10:00:00Z",
  "updated_at": "2025-01-22T18:00:00Z"
}
```

**cURL Example:**
```bash
TOKEN="your_jwt_token_here"
curl -X GET "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer $TOKEN"
```

### 👥 User Management Endpoints

#### 4. Get All Users (Admin Only)
**GET** `/users`

Retrieve all users in the system. Requires admin privileges.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
[
  {
    "id": "64f1c2d123456789abcdef01",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Viewer",
    "profile": { ... },
    "account": { ... },
    "created_at": "2023-08-01T10:00:00Z",
    "updated_at": "2025-01-22T18:00:00Z"
  }
]
```

**cURL Example:**
```bash
TOKEN="admin_jwt_token_here"
curl -X GET "http://localhost:8000/users" \
  -H "Authorization: Bearer $TOKEN"
```

#### 5. Get User by ID
**GET** `/users/{user_id}`

Get specific user information by ID.

**Headers:**
```
Authorization: Bearer <token>
```

**cURL Example:**
```bash
TOKEN="your_jwt_token_here"
USER_ID="64f1c2d123456789abcdef01"
curl -X GET "http://localhost:8000/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN"
```

#### 6. Update User
**PUT** `/users/{user_id}`

Update user information.

**Request Body:**
```json
{
  "name": "John Smith",
  "profile": {
    "first_name": "John",
    "last_name": "Smith",
    "phone": "+1-555-0124",
    "location": "San Francisco, USA"
  }
}
```

**cURL Example:**
```bash
TOKEN="your_jwt_token_here"
USER_ID="64f1c2d123456789abcdef01"
curl -X PUT "http://localhost:8000/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "profile": {
      "first_name": "John",
      "last_name": "Smith",
      "phone": "+1-555-0124",
      "location": "San Francisco, USA"
    }
  }'
```

#### 7. Delete User (Admin Only)
**DELETE** `/users/{user_id}`

Delete a user account. Requires admin privileges.

**cURL Example:**
```bash
TOKEN="admin_jwt_token_here"
USER_ID="64f1c2d123456789abcdef01"
curl -X DELETE "http://localhost:8000/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### 📄 Document Management Endpoints

#### 8. Get User Documents
**GET** `/users/{user_id}/documents`

Get all documents uploaded by a specific user.

**Response:**
```json
[
  {
    "id": "64f1c2d123456789abcdef02",
    "user_id": "64f1c2d123456789abcdef01",
    "file_name": "TSLA-Q2-2025.pdf",
    "file_path": "data/TSLA-Q2-2025.pdf",
    "file_size_mb": 5.2,
    "file_format": "pdf",
    "checksum": "sha256:abc123...",
    "category": "Earnings Report",
    "tags": ["Tesla", "Q2 2025", "Financial"],
    "status": "completed",
    "progress": 100,
    "processing_duration_sec": 42,
    "created_at": "2025-01-23T10:30:00Z",
    "updated_at": "2025-01-23T10:32:00Z"
  }
]
```

**cURL Example:**
```bash
TOKEN="your_jwt_token_here"
USER_ID="64f1c2d123456789abcdef01"
curl -X GET "http://localhost:8000/users/$USER_ID/documents" \
  -H "Authorization: Bearer $TOKEN"
```

#### 9. Delete Document
**DELETE** `/documents/{document_id}`

Delete a document and all its associated analyses. Users can only delete their own documents unless they are admin.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "message": "Document deleted successfully",
  "document_id": "64f1c2d123456789abcdef02",
  "deleted_analyses_count": 3,
  "file_deleted": true,
  "file_path": "/path/to/deleted/document.pdf"
}
```

**cURL Example:**
```bash
TOKEN="your_jwt_token_here"
DOCUMENT_ID="64f1c2d123456789abcdef02"
curl -X DELETE "http://localhost:8000/documents/$DOCUMENT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

#### 10. Get Analyses by Document ID
**GET** `/documents/{document_id}/analyses`

Get all analyses performed on a specific document.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `skip` (optional): Number of analyses to skip (default: 0)
- `limit` (optional): Maximum number of analyses to return (default: 50)

**Response:**
```json
[
  {
    "id": "64f1c2d123456789abcdef03",
    "document_id": "64f1c2d123456789abcdef02",
    "user_id": "64f1c2d123456789abcdef01",
    "analysis_type": "Financial Document Analysis",
    "query": "Analyze this financial document for investment insights",
    "output": {
      "summary": "Tesla's Q2 2025 performance analysis...",
      "metrics": {
        "revenue": "$22.5B",
        "operating_income": "$0.9B",
        "cash": "$36.8B"
      },
      "insights": ["Insight 1", "Insight 2"],
      "key_findings": ["Finding 1", "Finding 2"],
      "financial_highlights": ["Highlight 1", "Highlight 2"],
      "risks": ["Risk 1", "Risk 2"],
      "opportunities": ["Opportunity 1", "Opportunity 2"],
      "extraction_quality_score": 0.85
    },
    "confidence_score": 0.92,
    "data_quality_score": 0.90,
    "validation_status": "passed",
    "processing_time_sec": 15,
    "created_at": "2025-01-23T11:00:00Z"
  }
]
```

**cURL Example:**
```bash
TOKEN="your_jwt_token_here"
DOCUMENT_ID="64f1c2d123456789abcdef02"
curl -X GET "http://localhost:8000/documents/$DOCUMENT_ID/analyses?skip=0&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

#### 11. Get User Analyses
**GET** `/users/{user_id}/analyses`

Get all analysis results for a specific user.

**Response:**
```json
[
  {
    "id": "64f1c2d123456789abcdef03",
    "document_id": "64f1c2d123456789abcdef02",
    "user_id": "64f1c2d123456789abcdef01",
    "analysis_type": "Financial Document Analysis",
    "query": "Analyze this financial document for investment insights",
    "output": {
      "summary": "Tesla's Q2 2025 performance analysis...",
      "metrics": {
        "revenue": "$22.5B",
        "operating_income": "$0.9B",
        "cash": "$36.8B"
      },
      "insights": ["Insight 1", "Insight 2"],
      "key_findings": ["Finding 1", "Finding 2"],
      "financial_highlights": ["Highlight 1", "Highlight 2"],
      "risks": ["Risk 1", "Risk 2"],
      "opportunities": ["Opportunity 1", "Opportunity 2"],
      "extraction_quality_score": 0.85
    },
    "confidence_score": 0.92,
    "data_quality_score": 0.90,
    "validation_status": "passed",
    "processing_time_sec": 15,
    "created_at": "2025-01-23T11:00:00Z"
  }
]
```

**cURL Example:**
```bash
TOKEN="your_jwt_token_here"
USER_ID="64f1c2d123456789abcdef01"
curl -X GET "http://localhost:8000/users/$USER_ID/analyses" \
  -H "Authorization: Bearer $TOKEN"
```

### 📊 Analysis Endpoints

#### 11. Analyze Financial Document (Main API)
**POST** `/analyze`

Upload and analyze a financial document using AI agents.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: The financial document file (PDF, DOCX, XLS, XLSX, TXT)
- `query`: Analysis query (optional, defaults to "Analyze this financial document for investment insights")

**Response:**
```json
{
  "status": "success",
  "query": "Analyze this financial document for investment insights",
  "file_processed": "TSLA-Q2-2025.pdf",
  "file_path": "/path/to/document.pdf",
  "document_id": "64f1c2d123456789abcdef02",
  "analysis_id": "64f1c2d123456789abcdef03",
  "processing_time_sec": 15,
  "user_id": "64f1c2d123456789abcdef01",
  "analysis": {
    "summary": "Tesla's Q2 2025 performance analysis...",
    "metrics": {
      "revenue": "$22.5B",
      "operating_income": "$0.9B",
      "cash": "$36.8B",
      "revenue_change": "12%",
      "income_change": "42%"
    },
    "insights": [
      "EV demand slowdown impacted revenue",
      "Energy business showing strong growth",
      "Liquidity position remains strong"
    ],
    "key_findings": [
      "Q2 2025 was a pivotal moment for Tesla",
      "Robotaxi service launched in Austin",
      "Energy storage deployments reached record highs"
    ],
    "financial_highlights": [
      "Total revenues decreased by 12% YoY to $22.5B",
      "Operating income decreased by 42% YoY to $0.9B",
      "Cash, cash equivalents, and investments were $36.8B"
    ],
    "risks": [
      "Lower vehicle deliveries",
      "Regulatory credit revenue decline",
      "Macroeconomic uncertainties"
    ],
    "opportunities": [
      "AI and robotics expansion",
      "Energy business growth",
      "Autonomous vehicle development"
    ],
    "extraction_quality_score": 0.85,
    "confidence_score": 0.92,
    "data_quality_score": 0.90
  }
}
```

**cURL Example:**
```bash
TOKEN="your_jwt_token_here"
curl -X POST "http://localhost:8000/analyze" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/your/financial_document.pdf" \
  -F "query=Analyze this financial document for investment insights"
```

#### 11. Get Structured Analysis by ID
**GET** `/analyses/{analysis_id}/structured`

Retrieve structured analysis data by analysis ID.

**Response:**
```json
{
  "status": "success",
  "analysis_id": "64f1c2d123456789abcdef03",
  "document_id": "64f1c2d123456789abcdef02",
  "user_id": "64f1c2d123456789abcdef01",
  "analysis_type": "Financial Document Analysis",
  "query": "Analyze this financial document for investment insights",
  "created_at": "2025-01-23T11:00:00Z",
  "processing_time_sec": 15,
  "confidence_score": 0.92,
  "data_quality_score": 0.90,
  "validation_status": "passed",
  "analysis": {
    "summary": "Tesla's Q2 2025 performance analysis...",
    "metrics": { ... },
    "insights": [ ... ],
    "key_findings": [ ... ],
    "financial_highlights": [ ... ],
    "risks": [ ... ],
    "opportunities": [ ... ],
    "extraction_quality_score": 0.85,
    "charts": []
  }
}
```

**cURL Example:**
```bash
TOKEN="your_jwt_token_here"
ANALYSIS_ID="64f1c2d123456789abcdef03"
curl -X GET "http://localhost:8000/analyses/$ANALYSIS_ID/structured" \
  -H "Authorization: Bearer $TOKEN"
```

#### 12. Get Analysis History (Legacy)
**GET** `/analysis/history`

Get analysis history using the legacy format.

**cURL Example:**
```bash
TOKEN="your_jwt_token_here"
curl -X GET "http://localhost:8000/analysis/history" \
  -H "Authorization: Bearer $TOKEN"
```

### 📈 Statistics Endpoints

#### 13. Get User Statistics
**GET** `/stats/users`

Get user-related statistics.

**Response:**
```json
{
  "total_users": 150,
  "active_users": 120,
  "admin_users": 5,
  "viewer_users": 145,
  "new_users_this_month": 25,
  "average_documents_per_user": 3.2,
  "average_analyses_per_user": 8.5
}
```

**cURL Example:**
```bash
TOKEN="your_jwt_token_here"
curl -X GET "http://localhost:8000/stats/users" \
  -H "Authorization: Bearer $TOKEN"
```

#### 14. Get Document Statistics
**GET** `/stats/documents`

Get document-related statistics.

**Response:**
```json
{
  "total_documents": 480,
  "documents_by_format": {
    "pdf": 320,
    "docx": 80,
    "xlsx": 60,
    "txt": 20
  },
  "documents_by_status": {
    "completed": 450,
    "processing": 20,
    "failed": 10
  },
  "total_storage_mb": 2500.5,
  "average_file_size_mb": 5.2
}
```

**cURL Example:**
```bash
TOKEN="your_jwt_token_here"
curl -X GET "http://localhost:8000/stats/documents" \
  -H "Authorization: Bearer $TOKEN"
```

#### 15. Get Analysis Statistics
**GET** `/stats/analyses`

Get analysis-related statistics.

**Response:**
```json
{
  "total_analyses": 1200,
  "analyses_by_type": {
    "Financial Document Analysis": 800,
    "Risk Assessment": 200,
    "Investment Analysis": 150,
    "Trend Analysis": 50
  },
  "average_processing_time_sec": 12.5,
  "average_confidence_score": 0.87,
  "average_data_quality_score": 0.89,
  "analyses_this_month": 150
}
```

**cURL Example:**
```bash
TOKEN="your_jwt_token_here"
curl -X GET "http://localhost:8000/stats/analyses" \
  -H "Authorization: Bearer $TOKEN"
```

### 🏥 Health & System Endpoints

#### 16. Health Check
**GET** `/health`

Check the health status of the API and database connection.

**Response:**
```json
{
  "status": "healthy",
  "mongodb": "connected",
  "database_stats": {
    "database_name": "financial_analyzer",
    "collections": 4,
    "documents": 5,
    "data_size": 63547,
    "storage_size": 176128,
    "indexes": 9,
    "index_size": 360448
  }
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:8000/health"
```

#### 17. Root Endpoint
**GET** `/`

Get basic API information.

**Response:**
```json
{
  "message": "Financial Document Analyzer API",
  "version": "1.0.0",
  "status": "running"
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:8000/"
```

## Data Models

### User Roles
- `ADMIN`: Full access to all features and user management
- `VIEWER`: Standard user with document analysis capabilities

### Document Status
- `UPLOADING`: Document is being uploaded
- `PROCESSING`: Document is being analyzed
- `COMPLETED`: Analysis completed successfully
- `FAILED`: Analysis failed

### Analysis Types
- `Financial Document Analysis`: General financial document analysis
- `Risk Assessment`: Risk-focused analysis
- `Investment Analysis`: Investment-focused analysis
- `Trend Analysis`: Trend and pattern analysis

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid request data"
}
```

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "detail": "Not enough permissions"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

## CORS Configuration

The API supports CORS for the following origins:
- `http://localhost:3000` (React default)
- `http://localhost:5173` (Vite default)
- `http://localhost:8080` (Vue default)
- `http://localhost:3001`
- `http://localhost:4200` (Angular default)
- `http://127.0.0.1:3000`
- `http://127.0.0.1:5173`
- `http://127.0.0.1:8080`

## File Upload Limits

- **Maximum file size**: 16MB (FastAPI default)
- **Supported formats**: PDF, DOCX, XLS, XLSX, TXT
- **Content-Type**: `multipart/form-data`

## Rate Limiting

Currently no rate limiting is implemented. Consider implementing rate limiting for production use.

## Complete Workflow Example

Here's a complete workflow from registration to analysis:

```bash
# 1. Register a new user
REGISTER_RESPONSE=$(curl -s -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "testpass123",
    "role": "Viewer",
    "profile": {
      "first_name": "Test",
      "last_name": "User",
      "phone": "+1-555-0123",
      "location": "Test City, USA",
      "bio": "Test User for API testing"
    }
  }')

echo "Registration Response: $REGISTER_RESPONSE"

# 2. Login to get token
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }')

echo "Login Response: $LOGIN_RESPONSE"

# Extract token (you'll need to parse JSON in real usage)
TOKEN="your_token_here"

# 3. Check health
curl -X GET "http://localhost:8000/health"

# 4. Get current user info
curl -X GET "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer $TOKEN"

# 5. Analyze a document
curl -X POST "http://localhost:8000/analyze" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@data/financial_document.txt" \
  -F "query=Analyze this financial document for investment insights"

# 6. Get statistics
curl -X GET "http://localhost:8000/stats/users" \
  -H "Authorization: Bearer $TOKEN"
```

## Notes

- All timestamps are in ISO 8601 format (UTC)
- JWT tokens expire after 24 hours
- File uploads are processed asynchronously
- MongoDB is used for data persistence
- CrewAI agents handle document analysis
- SSL/TLS is supported for secure connections
- The API includes comprehensive error handling and logging

## Support

For API support and questions, please refer to the main README.md file or contact the development team.
