# HR Portal Backend API Documentation

## Overview

The HR Portal Backend API provides comprehensive HR management functionality including user management, leave management, document handling, payroll processing, and company settings management.

## Base URL

```
http://localhost:8080/api
```

## Authentication

The API uses JWT (JSON Web Token) authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Multi-tenancy

All company-specific data is isolated by organization ID. Include the organization ID in the request header:

```
X-Organization-ID: <organization-uuid>
```

## API Endpoints

### Authentication

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string",
  "organization_id": "uuid"
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "refresh_token": "refresh-token",
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "name": "string",
    "role": "Employee|Manager|HR|Admin",
    "department": "string",
    "designation": "string",
    "ctc": 500000,
    "is_active": true
  },
  "expires_at": "2024-01-01T00:00:00Z"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
X-Organization-ID: <org-id>
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "refresh-token"
}
```

### Users

#### List Users
```http
GET /api/users?page=1&limit=20&search=john&role=Employee&department=Engineering
Authorization: Bearer <token>
X-Organization-ID: <org-id>
```

#### Get User
```http
GET /api/users/{id}
Authorization: Bearer <token>
X-Organization-ID: <org-id>
```

#### Create User
```http
POST /api/users
Authorization: Bearer <token>
X-Organization-ID: <org-id>
Content-Type: application/json

{
  "username": "string",
  "email": "string",
  "password": "string",
  "name": "string",
  "designation": "string",
  "department": "string",
  "role": "Employee|Manager|HR|Admin",
  "manager_id": "uuid",
  "ctc": 500000
}
```

#### Update User
```http
PATCH /api/users/{id}
Authorization: Bearer <token>
X-Organization-ID: <org-id>
Content-Type: application/json

{
  "name": "string",
  "designation": "string",
  "department": "string",
  "role": "Employee|Manager|HR|Admin",
  "manager_id": "uuid",
  "ctc": 500000,
  "is_active": true
}
```

#### Delete User
```http
DELETE /api/users/{id}
Authorization: Bearer <token>
X-Organization-ID: <org-id>
```

#### Change Password
```http
POST /api/users/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "current_password": "string",
  "new_password": "string"
}
```

### Leaves

#### List Leaves
```http
GET /api/leaves?user_id=uuid&status=pending&from_date=2024-01-01&to_date=2024-12-31
Authorization: Bearer <token>
X-Organization-ID: <org-id>
```

#### Apply Leave
```http
POST /api/leaves
Authorization: Bearer <token>
X-Organization-ID: <org-id>
Content-Type: application/json

{
  "user_id": "uuid",
  "category_id": "uuid",
  "type": "string",
  "reason": "string",
  "from_date": "2024-01-01T00:00:00Z",
  "to_date": "2024-01-02T00:00:00Z"
}
```

#### Get Leave
```http
GET /api/leaves/{id}
Authorization: Bearer <token>
X-Organization-ID: <org-id>
```

#### Update Leave
```http
PATCH /api/leaves/{id}
Authorization: Bearer <token>
X-Organization-ID: <org-id>
Content-Type: application/json

{
  "reason": "string",
  "status": "pending|approved|rejected|cancelled"
}
```

#### Approve Leave
```http
POST /api/leaves/{id}/approve
Authorization: Bearer <token>
X-Organization-ID: <org-id>
```

#### Reject Leave
```http
POST /api/leaves/{id}/reject
Authorization: Bearer <token>
X-Organization-ID: <org-id>
Content-Type: application/json

{
  "reason": "string"
}
```

#### Get Leave Balance
```http
GET /api/leaves/balance/{user_id}
Authorization: Bearer <token>
X-Organization-ID: <org-id>
```

### Leave Categories

#### List Leave Categories
```http
GET /api/leave-categories
Authorization: Bearer <token>
X-Organization-ID: <org-id>
```

#### Create Leave Category
```http
POST /api/leave-categories
Authorization: Bearer <token>
X-Organization-ID: <org-id>
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "max_days_per_year": 12,
  "requires_approval": true
}
```

#### Update Leave Category
```http
PATCH /api/leave-categories/{id}
Authorization: Bearer <token>
X-Organization-ID: <org-id>
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "max_days_per_year": 12,
  "requires_approval": true,
  "is_active": true
}
```

#### Delete Leave Category
```http
DELETE /api/leave-categories/{id}
Authorization: Bearer <token>
X-Organization-ID: <org-id>
```

### Leave Allocations

#### Get Leave Allocations
```http
GET /api/leave-allocations/{user_id}?year=2024
Authorization: Bearer <token>
X-Organization-ID: <org-id>
```

#### Create Leave Allocation
```http
POST /api/leave-allocations
Authorization: Bearer <token>
X-Organization-ID: <org-id>
Content-Type: application/json

{
  "user_id": "uuid",
  "category_id": "uuid",
  "category_name": "string",
  "total_days": 12,
  "year": 2024
}
```

#### Update Leave Allocation
```http
PATCH /api/leave-allocations/{id}
Authorization: Bearer <token>
X-Organization-ID: <org-id>
Content-Type: application/json

{
  "total_days": 12,
  "used_days": 3
}
```

#### Delete Leave Allocation
```http
DELETE /api/leave-allocations/{id}
Authorization: Bearer <token>
X-Organization-ID: <org-id>
```

### Documents

#### List Documents
```http
GET /api/documents?user_id=uuid&category=contract&is_public=true
Authorization: Bearer <token>
X-Organization-ID: <org-id>
```

#### Upload Document
```http
POST /api/documents
Authorization: Bearer <token>
X-Organization-ID: <org-id>
Content-Type: multipart/form-data

file: <file>
title: "string"
category: "string"
is_public: true|false
```

#### Get Document
```http
GET /api/documents/{id}
Authorization: Bearer <token>
X-Organization-ID: <org-id>
```

#### Download Document
```http
GET /api/documents/{id}/download
Authorization: Bearer <token>
X-Organization-ID: <org-id>
```

#### Delete Document
```http
DELETE /api/documents/{id}
Authorization: Bearer <token>
X-Organization-ID: <org-id>
```

### Salary Slips

#### List Salary Slips
```http
GET /api/salary-slips?user_id=uuid&month=1&year=2024
Authorization: Bearer <token>
X-Organization-ID: <org-id>
```

#### Upload Salary Slip
```http
POST /api/salary-slips
Authorization: Bearer <token>
X-Organization-ID: <org-id>
Content-Type: multipart/form-data

file: <file>
user_id: "uuid"
month: 1
year: 2024
```

#### Get Salary Slip
```http
GET /api/salary-slips/{id}
Authorization: Bearer <token>
X-Organization-ID: <org-id>
```

#### Download Salary Slip
```http
GET /api/salary-slips/{id}/download
Authorization: Bearer <token>
X-Organization-ID: <org-id>
```

#### Delete Salary Slip
```http
DELETE /api/salary-slips/{id}
Authorization: Bearer <token>
X-Organization-ID: <org-id>
```

### Holidays & Events

#### List Holidays
```http
GET /api/holidays?type=holiday&is_calendar_event=true
Authorization: Bearer <token>
X-Organization-ID: <org-id>
```

#### Create Holiday/Event/Notice
```http
POST /api/holidays
Authorization: Bearer <token>
X-Organization-ID: <org-id>
Content-Type: application/json

{
  "name": "string",
  "date": "2024-01-01T00:00:00Z", // Optional for notices
  "type": "holiday|event|notice",
  "description": "string",
  "is_calendar_event": true,
  "color": "#ef4444"
}
```

#### Update Holiday/Event/Notice
```http
PATCH /api/holidays/{id}
Authorization: Bearer <token>
X-Organization-ID: <org-id>
Content-Type: application/json

{
  "name": "string",
  "date": "2024-01-01T00:00:00Z",
  "type": "holiday|event|notice",
  "description": "string",
  "is_calendar_event": true,
  "color": "#ef4444"
}
```

#### Delete Holiday/Event/Notice
```http
DELETE /api/holidays/{id}
Authorization: Bearer <token>
X-Organization-ID: <org-id>
```

### Company Settings

#### Get Company Settings
```http
GET /api/company/settings
Authorization: Bearer <token>
X-Organization-ID: <org-id>
```

#### Update Company Settings
```http
PATCH /api/company/settings
Authorization: Bearer <token>
X-Organization-ID: <org-id>
Content-Type: application/json

{
  "settings": "{\"payrollSettings\": {\"basicSalary\": {\"mode\": \"percentage\", \"value\": 40}, \"hra\": {\"mode\": \"percentage\", \"value\": 20}, \"da\": {\"mode\": \"percentage\", \"value\": 15}, \"pf\": {\"mode\": \"percentage\", \"value\": 12}, \"esi\": {\"mode\": \"percentage\", \"value\": 0.75}, \"tds\": {\"mode\": \"percentage\", \"value\": 10}}}"
}
```

### Dashboard

#### Get Dashboard Stats
```http
GET /api/dashboard/stats
Authorization: Bearer <token>
X-Organization-ID: <org-id>
```

**Response:**
```json
{
  "total_users": 50,
  "total_leaves": 120,
  "pending_leaves": 15,
  "total_documents": 200,
  "upcoming_holidays": [
    {
      "id": "uuid",
      "name": "New Year",
      "date": "2024-01-01T00:00:00Z",
      "type": "holiday",
      "color": "#ef4444"
    }
  ],
  "recent_leaves": [...],
  "recent_documents": [...],
  "leave_balances": [
    {
      "category_id": "uuid",
      "category_name": "Sick Leave",
      "total_days": 12,
      "used_days": 3,
      "remaining_days": 9,
      "year": 2024
    }
  ]
}
```

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `422 Unprocessable Entity` - Validation errors
- `500 Internal Server Error` - Server error

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Default**: 100 requests per minute per IP
- **Headers**: Rate limit information is included in response headers
- **Exceeded**: Returns `429 Too Many Requests` when limit exceeded

## File Upload Limits

- **Maximum file size**: 10MB
- **Allowed file types**: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG
- **Upload path**: Configurable via environment variables

## Pagination

List endpoints support pagination:

- `page` - Page number (starts from 1)
- `limit` - Items per page (max 100, default 20)

**Response format:**
```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 20,
  "total_pages": 8
}
```

## Filtering and Search

Most list endpoints support filtering:

- `search` - Text search across relevant fields
- `status` - Filter by status
- `role` - Filter by user role
- `department` - Filter by department
- `type` - Filter by type (for holidays, documents)
- `is_public` - Filter by public/private (for documents)
- `is_calendar_event` - Filter by calendar visibility (for holidays)

## Webhooks (Future Enhancement)

The API will support webhooks for real-time notifications:

- Leave status changes
- Document uploads
- User creation/updates
- Holiday announcements

## SDKs and Libraries

Official SDKs will be available for:

- JavaScript/TypeScript
- Python
- Go
- Java

## Support

For API support and questions:

- **Documentation**: `/swagger/index.html`
- **Health Check**: `/health`
- **Metrics**: `/metrics` (if enabled)
