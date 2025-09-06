# HR Portal API Specification

This document outlines all the API endpoints required for the HR Portal application. The backend should implement these endpoints with the specified request/response formats.

## Base URL
```
http://localhost:8000/api
```

## Multi-Tenancy Architecture

**CRITICAL**: This API implements organization-based multi-tenancy. All company-specific data must be isolated by `organizationId`.

### Organization Isolation Rules:
- **Users/Employees**: Scoped to organization
- **Documents**: Scoped to organization  
- **Payroll Settings**: Scoped to organization
- **Leave Categories**: Scoped to organization
- **Holidays**: Scoped to organization
- **Leave Allocations**: Inherit organization from user
- **Leave Applications**: Inherit organization from user
- **Salary Slips**: Inherit organization from user

### Authentication Flow:
1. User logs in with credentials
2. Backend validates credentials and returns user data + `organizationId`
3. Frontend stores `organizationId` in localStorage/sessionStorage
4. All subsequent API calls automatically include `organizationId` in headers
5. Backend filters all data by `organizationId` (invisible to frontend)

## Authentication
All endpoints (except login) require Bearer token authentication:
```
Authorization: Bearer <token>
X-Organization-ID: <organizationId>
```

**Note**: `X-Organization-ID` header is automatically added by frontend and used by backend for data isolation.

---

## 1. Authentication Endpoints

### POST /auth/login
**Description**: Authenticate user and get access token

**Request Body**:
```json
{
  "username": "string",
  "password": "string"
}
```

**Response**:
```json
{
  "data": {
      "user": {
        "id": "string",
        "email": "string",
        "name": "string",
        "role": "Employee" | "Manager" | "HR" | "Admin",
        "designation": "string",
        "department": "string",
        "managerId": "string",
        "ctc": "number",
        "organizationId": "string",
        "createdAt": "string",
        "updatedAt": "string"
      },
    "token": "string",
    "organizationId": "string"
  },
  "message": "string"
}
```

### POST /auth/logout
**Description**: Logout user and invalidate token

**Response**:
```json
{
  "data": null,
  "message": "Logged out successfully"
}
```

---

## 2. User Management Endpoints

### GET /users
**Description**: Get list of users with optional filtering (scoped to organization)

**Headers Required**:
```
X-Organization-ID: <organizationId>
```

**Query Parameters**:
- `q` (optional): Search query for name/email
- `role` (optional): Filter by role
- `department` (optional): Filter by department

**Response**:
```json
{
  "data": [
    {
      "id": "string",
      "email": "string",
      "name": "string",
      "role": "Employee" | "Manager" | "HR" | "Admin",
      "designation": "string",
      "department": "string",
      "managerId": "string",
      "ctc": "number",
      "organizationId": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
}
```

### GET /users/{user_id}
**Description**: Get specific user details (scoped to organization)

**Headers Required**:
```
X-Organization-ID: <organizationId>
```

**Response**:
```json
{
  "data": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "Employee" | "Manager" | "HR" | "Admin",
    "department": "string",
    "managerId": "string",
    "ctc": "number",
    "organizationId": "string",
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

### POST /users
**Description**: Create new user (scoped to organization)

**Headers Required**:
```
X-Organization-ID: <organizationId>
```

**Request Body**:
```json
{
  "username": "string",
  "password": "string",
  "designation": "string",
  "role": "Employee" | "Manager" | "HR" | "Admin",
  "department": "string",
  "manager_id": "number"
}
```

**Response**:
```json
{
  "data": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "Employee" | "Manager" | "HR" | "Admin",
    "department": "string",
    "managerId": "string",
    "ctc": "number",
    "organizationId": "string",
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

### PATCH /users/{user_id}
**Description**: Update user details

**Request Body**:
```json
{
  "username": "string",
  "designation": "string",
  "role": "Employee" | "Manager" | "HR" | "Admin",
  "department": "string",
  "manager_id": "number",
  "ctc": "number"
}
```

**Response**:
```json
{
  "data": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "Employee" | "Manager" | "HR" | "Admin",
    "department": "string",
    "managerId": "string",
    "ctc": "number",
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

### DELETE /users/{user_id}
**Description**: Delete user

**Response**:
```json
{
  "data": null,
  "message": "User deleted successfully"
}
```

### POST /users/change-password
**Description**: Change user's password (for current authenticated user)

**Request Body**:
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

**Response**:
```json
{
  "data": null,
  "message": "Password changed successfully"
}
```

---

## 3. Leave Categories Management

### GET /leave-categories
**Description**: Get all leave categories (scoped to organization)

**Headers Required**:
```
X-Organization-ID: <organizationId>
```

**Response**:
```json
{
  "data": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "defaultDays": "number",
      "isActive": "boolean",
      "organizationId": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
}
```

### POST /leave-categories
**Description**: Create new leave category (scoped to organization)

**Headers Required**:
```
X-Organization-ID: <organizationId>
```

**Request Body**:
```json
{
  "name": "string",
  "description": "string",
  "defaultDays": "number",
  "isActive": "boolean"
}
```

**Response**:
```json
{
  "data": {
    "id": "string",
    "name": "string",
    "description": "string",
    "defaultDays": "number",
    "isActive": "boolean",
    "organizationId": "string",
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

### PATCH /leave-categories/{category_id}
**Description**: Update leave category

**Request Body**:
```json
{
  "name": "string",
  "description": "string",
  "defaultDays": "number",
  "isActive": "boolean"
}
```

**Response**:
```json
{
  "data": {
    "id": "string",
    "name": "string",
    "description": "string",
    "defaultDays": "number",
    "isActive": "boolean",
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

### DELETE /leave-categories/{category_id}
**Description**: Delete leave category

**Response**:
```json
{
  "data": null,
  "message": "Leave category deleted successfully"
}
```

---

## 4. Leave Allocations Management

### GET /users/{user_id}/leave-allocations
**Description**: Get leave allocations for a user

**Query Parameters**:
- `year` (optional): Filter by year (default: current year)

**Response**:
```json
{
  "data": [
    {
      "id": "string",
      "userId": "string",
      "categoryId": "string",
      "categoryName": "string",
      "totalDays": "number",
      "usedDays": "number",
      "remainingDays": "number",
      "year": "number",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
}
```

### POST /users/{user_id}/leave-allocations
**Description**: Create leave allocation for user

**Request Body**:
```json
{
  "categoryId": "string",
  "categoryName": "string",
  "totalDays": "number",
  "usedDays": "number",
  "remainingDays": "number",
  "year": "number"
}
```

**Response**:
```json
{
  "data": {
    "id": "string",
    "userId": "string",
    "categoryId": "string",
    "categoryName": "string",
    "totalDays": "number",
    "usedDays": "number",
    "remainingDays": "number",
    "year": "number",
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

### PATCH /users/{user_id}/leave-allocations/{allocation_id}
**Description**: Update leave allocation

**Request Body**:
```json
{
  "totalDays": "number",
  "remainingDays": "number"
}
```

**Response**:
```json
{
  "data": {
    "id": "string",
    "userId": "string",
    "categoryId": "string",
    "categoryName": "string",
    "totalDays": "number",
    "usedDays": "number",
    "remainingDays": "number",
    "year": "number",
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

### DELETE /users/{user_id}/leave-allocations/{allocation_id}
**Description**: Delete leave allocation

**Response**:
```json
{
  "data": null,
  "message": "Leave allocation deleted successfully"
}
```

---

## 5. Leave Management (Legacy Support)

### GET /users/{user_id}/leave-balance
**Description**: Get leave balance (legacy format)

**Response**:
```json
{
  "data": [
    {
      "type": "string",
      "total": "number",
      "used": "number",
      "remaining": "number"
    }
  ]
}
```

### PATCH /users/{user_id}/leave-balance
**Description**: Update leave balance (legacy format)

**Request Body**:
```json
{
  "type": "string",
  "total": "number",
  "used": "number",
  "remaining": "number"
}
```

---

## 6. Leave Applications

### GET /leaves
**Description**: Get leave applications

**Query Parameters**:
- `userId` (optional): Filter by user ID
- `status` (optional): Filter by status
- `type` (optional): Filter by leave type

**Response**:
```json
{
  "data": [
    {
      "id": "string",
      "userId": "string",
      "type": "Sick" | "Casual" | "Professional",
      "status": "pending" | "approved" | "rejected" | "cancelled",
      "from": "string",
      "to": "string",
      "reason": "string",
      "createdAt": "string"
    }
  ]
}
```

### POST /leaves
**Description**: Apply for leave

**Request Body**:
```json
{
  "type": "Sick" | "Casual" | "Professional",
  "from_date": "string",
  "to_date": "string",
  "reason": "string"
}
```

**Response**:
```json
{
  "data": {
    "id": "string",
    "userId": "string",
    "type": "Sick" | "Casual" | "Professional",
    "status": "pending" | "approved" | "rejected" | "cancelled",
    "from": "string",
    "to": "string",
    "reason": "string",
    "createdAt": "string"
  }
}
```

### PATCH /leaves/{leave_id}
**Description**: Update leave application

**Request Body**:
```json
{
  "type": "Sick" | "Casual" | "Professional",
  "from": "string",
  "to": "string",
  "reason": "string"
}
```

### POST /leaves/{leave_id}/approve
**Description**: Approve leave application

**Response**:
```json
{
  "data": {
    "id": "string",
    "userId": "string",
    "type": "Sick" | "Casual" | "Professional",
    "status": "approved",
    "from": "string",
    "to": "string",
    "reason": "string",
    "createdAt": "string"
  }
}
```

### POST /leaves/{leave_id}/reject
**Description**: Reject leave application

**Request Body**:
```json
{
  "reason": "string"
}
```

---

## 7. Salary Slips Management

### GET /salary-slips
**Description**: Get salary slips

**Query Parameters**:
- `userId` (optional): Filter by user ID
- `year` (optional): Filter by year
- `month` (optional): Filter by month

**Response**:
```json
{
  "data": [
    {
      "id": "string",
      "userId": "string",
      "month": "number",
      "year": "number",
      "fileUrl": "string",
      "createdAt": "string"
    }
  ]
}
```

### POST /salary-slips
**Description**: Upload salary slip

**Request Body**: Multipart form data
- `file`: PDF file
- `userId`: string
- `month`: number
- `year`: number

**Response**:
```json
{
  "data": {
    "id": "string",
    "userId": "string",
    "month": "number",
    "year": "number",
    "fileUrl": "string",
    "createdAt": "string"
  }
}
```

### DELETE /salary-slips/{slip_id}
**Description**: Delete salary slip

**Response**:
```json
{
  "data": null,
  "message": "Salary slip deleted successfully"
}
```

---

## 8. Documents Management

### GET /documents
**Description**: Get documents

**Query Parameters**:
- `category` (optional): Filter by category
- `isPublic` (optional): Filter by public/private

**Response**:
```json
{
  "data": [
    {
      "id": "string",
      "title": "string",
      "category": "string",
      "isPublic": "boolean",
      "fileUrl": "string",
      "uploadedBy": "string",
      "createdAt": "string"
    }
  ]
}
```

### POST /documents
**Description**: Upload document

**Request Body**: Multipart form data
- `file`: File
- `title`: string
- `category`: string
- `isPublic`: boolean
- `userId`: string (optional)

**Response**:
```json
{
  "data": {
    "id": "string",
    "title": "string",
    "category": "string",
    "isPublic": "boolean",
    "fileUrl": "string",
    "uploadedBy": "string",
    "createdAt": "string"
  }
}
```

### GET /users/{user_id}/documents
**Description**: Get user-specific documents

**Response**:
```json
{
  "data": [
    {
      "id": "string",
      "title": "string",
      "category": "string",
      "isPublic": "boolean",
      "fileUrl": "string",
      "uploadedBy": "string",
      "createdAt": "string"
    }
  ]
}
```

---

## 9. Holidays Management

### GET /holidays
**Description**: Get holidays (scoped to organization)

**Headers Required**:
```
X-Organization-ID: <organizationId>
```

**Response**:
```json
{
  "data": [
    {
      "id": "string",
      "name": "string",
      "date": "string",
      "organizationId": "string",
      "createdAt": "string"
    }
  ]
}
```

### POST /holidays
**Description**: Create holiday (scoped to organization)

**Headers Required**:
```
X-Organization-ID: <organizationId>
```

**Request Body**:
```json
{
  "name": "string",
  "date": "string"
}
```

**Response**:
```json
{
  "data": {
    "id": "string",
    "name": "string",
    "date": "string",
    "organizationId": "string",
    "createdAt": "string"
  }
}
```

### PATCH /holidays/{holiday_id}
**Description**: Update holiday

**Request Body**:
```json
{
  "name": "string",
  "date": "string"
}
```

### DELETE /holidays/{holiday_id}
**Description**: Delete holiday

**Response**:
```json
{
  "data": null,
  "message": "Holiday deleted successfully"
}
```

---

## 10. Company Settings

### GET /companies/{company_id}/payroll-settings
**Description**: Get company payroll settings

**Response**:
```json
{
  "data": {
    "earnings": {
      "basic": { "mode": "PERCENT_OF_CTC", "value": 50 },
      "hra": { "mode": "PERCENT_OF_BASIC", "value": 40 },
      "medical": { "mode": "FIXED", "value": 1500 },
      "conveyance": { "mode": "FIXED", "value": 1600 },
      "lta": { "mode": "FIXED", "value": 2000 },
      "specialAllowance": { "mode": "REMAINDER", "value": null }
    },
    "deductions": {
      "employeePF": { "mode": "PERCENT_OF_BASIC", "value": 12, "capAt1800": true },
      "professionalTax": { "mode": "FIXED", "value": 200 },
      "esiEnabled": false,
      "esi": { "mode": "PERCENT_OF_BASIC", "value": 0.75 }
    }
  }
}
```

### PUT /companies/{company_id}/payroll-settings
**Description**: Update company payroll settings

**Request Body**:
```json
{
  "earnings": {
    "basic": { "mode": "PERCENT_OF_CTC", "value": 50 },
    "hra": { "mode": "PERCENT_OF_BASIC", "value": 40 },
    "medical": { "mode": "FIXED", "value": 1500 },
    "conveyance": { "mode": "FIXED", "value": 1600 },
    "lta": { "mode": "FIXED", "value": 2000 },
    "specialAllowance": { "mode": "REMAINDER", "value": null }
  },
  "deductions": {
    "employeePF": { "mode": "PERCENT_OF_BASIC", "value": 12, "capAt1800": true },
    "professionalTax": { "mode": "FIXED", "value": 200 },
    "esiEnabled": false,
    "esi": { "mode": "PERCENT_OF_BASIC", "value": 0.75 }
  }
}
```

---

## 11. Dashboard & Statistics

### GET /dashboard/stats
**Description**: Get dashboard statistics

**Response**:
```json
{
  "data": {
    "totalEmployees": "number",
    "pendingLeaves": "number",
    "approvedLeaves": "number",
    "totalDocuments": "number"
  }
}
```

### GET /team
**Description**: Get team members

**Response**:
```json
{
  "data": [
    {
      "id": "string",
      "email": "string",
      "name": "string",
      "role": "Employee" | "Manager" | "HR" | "Admin",
      "designation": "string",
      "department": "string",
      "ctc": "number",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
}
```

---

## Error Response Format

All endpoints should return errors in this format:

```json
{
  "error": {
    "message": "string",
    "code": "string"
  }
}
```

## Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Notes for Backend Developer

1. **Authentication**: Implement JWT-based authentication for all protected endpoints
2. **Validation**: Add proper request validation for all input fields
3. **Error Handling**: Return consistent error responses
4. **File Uploads**: Handle multipart form data for file uploads
5. **Database**: Use proper foreign key relationships for user-leave allocations
6. **Permissions**: Implement role-based access control (HR/Admin can manage users, Managers can approve leaves)
7. **Date Formats**: Use ISO 8601 format for all dates
8. **Pagination**: Consider adding pagination for list endpoints if needed
9. **Search**: Implement full-text search for user queries
10. **Caching**: Consider caching for frequently accessed data like company settings

## Backend Implementation Requirements

### Database Schema Design

**CRITICAL**: All tables must include `organizationId` for multi-tenancy:

```sql
-- Organizations table
CREATE TABLE organizations (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    settings JSON,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Users table (scoped to organization)
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('Employee', 'Manager', 'HR', 'Admin') NOT NULL,
    designation VARCHAR(255),
    department VARCHAR(255),
    managerId VARCHAR(255),
    ctc DECIMAL(15,2),
    organizationId VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organizationId) REFERENCES organizations(id),
    FOREIGN KEY (managerId) REFERENCES users(id),
    UNIQUE KEY unique_email_org (email, organizationId),
    UNIQUE KEY unique_username_org (username, organizationId)
);

-- Leave Categories (scoped to organization)
CREATE TABLE leave_categories (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    defaultDays INT NOT NULL DEFAULT 0,
    isActive BOOLEAN DEFAULT TRUE,
    organizationId VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organizationId) REFERENCES organizations(id),
    UNIQUE KEY unique_name_org (name, organizationId)
);

-- Leave Allocations (inherit organization from user)
CREATE TABLE leave_allocations (
    id VARCHAR(255) PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    categoryId VARCHAR(255) NOT NULL,
    categoryName VARCHAR(255) NOT NULL,
    totalDays INT NOT NULL DEFAULT 0,
    usedDays INT NOT NULL DEFAULT 0,
    remainingDays INT NOT NULL DEFAULT 0,
    year INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (categoryId) REFERENCES leave_categories(id),
    UNIQUE KEY unique_user_category_year (userId, categoryId, year)
);

-- Leave Applications (inherit organization from user)
CREATE TABLE leaves (
    id VARCHAR(255) PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    type ENUM('Sick', 'Casual', 'Professional') NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    reason TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
);

-- Salary Slips (inherit organization from user)
CREATE TABLE salary_slips (
    id VARCHAR(255) PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    UNIQUE KEY unique_user_month_year (userId, month, year)
);

-- Documents (scoped to organization)
CREATE TABLE documents (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    isPublic BOOLEAN DEFAULT FALSE,
    file_path VARCHAR(500) NOT NULL,
    uploadedBy VARCHAR(255),
    organizationId VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizationId) REFERENCES organizations(id),
    FOREIGN KEY (uploadedBy) REFERENCES users(id)
);

-- Holidays (scoped to organization)
CREATE TABLE holidays (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    organizationId VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizationId) REFERENCES organizations(id),
    UNIQUE KEY unique_date_org (date, organizationId)
);

-- Company Payroll Settings (scoped to organization)
CREATE TABLE company_payroll_settings (
    id VARCHAR(255) PRIMARY KEY,
    organizationId VARCHAR(255) NOT NULL UNIQUE,
    settings JSON NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organizationId) REFERENCES organizations(id)
);
```

### Backend Implementation Guidelines

#### 1. Authentication Middleware
```python
# Pseudo-code for authentication middleware
def authenticate_request(request):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    organization_id = request.headers.get('X-Organization-ID')
    
    # Validate JWT token
    user_data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
    
    # Verify user belongs to organization
    user = get_user_by_id(user_data['user_id'])
    if user.organizationId != organization_id:
        raise UnauthorizedError("User not authorized for this organization")
    
    return user_data, organization_id
```

#### 2. Data Filtering Middleware
```python
# Pseudo-code for automatic organization filtering
def filter_by_organization(query, organization_id):
    # Automatically add organizationId filter to all queries
    return query.filter(organizationId=organization_id)

# Apply to all endpoints:
# GET /users -> filter users by organizationId
# GET /leave-categories -> filter categories by organizationId  
# GET /holidays -> filter holidays by organizationId
# etc.
```

#### 3. User Creation Flow
```python
def create_user(user_data, organization_id):
    # Automatically assign organizationId
    user_data['organizationId'] = organization_id
    
    # Validate manager belongs to same organization
    if user_data.get('managerId'):
        manager = get_user_by_id(user_data['managerId'])
        if manager.organizationId != organization_id:
            raise ValidationError("Manager must belong to same organization")
    
    # Handle designation field (optional)
    if not user_data.get('designation'):
        user_data['designation'] = None
    
    return create_user_in_db(user_data)
```

#### 4. Leave Allocation Creation
```python
def create_leave_allocation(user_id, allocation_data, organization_id):
    # Verify user belongs to organization
    user = get_user_by_id(user_id)
    if user.organizationId != organization_id:
        raise UnauthorizedError("User not found in organization")
    
    # Verify category belongs to organization
    category = get_leave_category_by_id(allocation_data['categoryId'])
    if category.organizationId != organization_id:
        raise ValidationError("Leave category not found in organization")
    
    return create_allocation_in_db(allocation_data)
```

### Security Requirements

1. **Organization Isolation**: 
   - All queries MUST include organizationId filter
   - No cross-organization data access
   - Validate user-organization relationship on every request

2. **Data Validation**:
   - Validate all foreign key relationships within organization
   - Prevent users from accessing other organizations' data
   - Sanitize all input data

3. **Audit Logging**:
   - Log all data access with organizationId
   - Track user actions per organization
   - Monitor for cross-organization access attempts

### Frontend Integration Notes

The frontend will automatically:
1. Store `organizationId` from login response
2. Add `X-Organization-ID` header to all API calls
3. Handle organization-scoped data seamlessly
4. Never expose organizationId to end users

### Testing Requirements

1. **Multi-tenant Testing**:
   - Create multiple organizations
   - Verify complete data isolation
   - Test cross-organization access prevention
   - Validate organization-specific settings

2. **Data Integrity**:
   - Test foreign key constraints within organizations
   - Verify cascade deletes work correctly
   - Test data migration between organizations

This implementation ensures complete multi-tenancy with invisible organization isolation for all users.
