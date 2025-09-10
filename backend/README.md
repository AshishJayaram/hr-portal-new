# HR Portal Backend

A production-ready Go backend for the HR Portal application built with Gin, PostgreSQL, and Redis.

## Features

- **Multi-tenant Architecture**: Organization-based data isolation
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Employee, Manager, HR, Admin roles
- **Leave Management**: Complete leave request and approval workflow
- **Document Management**: File upload and management
- **Payroll System**: Salary slip generation and management
- **Company Settings**: Configurable payroll and leave settings
- **Event Management**: Holidays, events, and notices
- **Caching**: Redis-based caching for performance
- **Monitoring**: Prometheus metrics and structured logging
- **API Documentation**: Swagger/OpenAPI documentation
- **Testing**: Comprehensive unit and integration tests

## Architecture

```
backend/
├── cmd/
│   └── server/
│       └── main.go              # Application entry point
├── internal/
│   ├── config/                 # Configuration management
│   ├── database/               # Database connection and migrations
│   ├── middleware/              # HTTP middleware
│   ├── models/                  # Data models
│   ├── handlers/                # HTTP handlers
│   ├── services/                # Business logic
│   ├── repositories/            # Data access layer
│   ├── utils/                   # Utility functions
│   └── validators/              # Request validation
├── migrations/                  # Database migrations
├── docs/                        # API documentation
├── tests/                       # Test files
├── docker/                      # Docker configuration
├── scripts/                     # Build and deployment scripts
├── .env.example                 # Environment variables template
├── docker-compose.yml           # Local development setup
├── Dockerfile                   # Production Docker image
├── Makefile                     # Build automation
└── README.md                    # This file
```

## Quick Start

### Prerequisites

- Go 1.21+
- PostgreSQL 14+
- Redis 6+
- Docker (optional)

### Local Development

1. **Clone and setup**:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your database credentials
   ```

2. **Install dependencies**:
   ```bash
   go mod tidy
   ```

3. **Start services**:
   ```bash
   # Using Docker Compose
   docker-compose up -d postgres redis
   
   # Or start PostgreSQL and Redis manually
   ```

4. **Run migrations**:
   ```bash
   make migrate-up
   ```

5. **Start the server**:
   ```bash
   make run
   ```

The API will be available at `http://localhost:8080`

### API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8080/swagger/index.html`
- API Docs: `http://localhost:8080/docs/`

## Environment Variables

```bash
# Server Configuration
PORT=8080
GIN_MODE=debug

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=hr_portal
DB_PASSWORD=password
DB_NAME=hr_portal
DB_SSLMODE=disable

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE_HOURS=24

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760  # 10MB

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token
- `POST /api/users/change-password` - Change password

### Users
- `GET /api/users` - List users
- `GET /api/users/{id}` - Get user details
- `POST /api/users` - Create user
- `PATCH /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user

### Leaves
- `GET /api/leaves` - List leave requests
- `POST /api/leaves` - Apply for leave
- `PATCH /api/leaves/{id}` - Update leave request
- `POST /api/leaves/{id}/approve` - Approve leave
- `POST /api/leaves/{id}/reject` - Reject leave
- `GET /api/leaves/balance/{user_id}` - Get leave balance

### Documents
- `GET /api/documents` - List documents
- `POST /api/documents` - Upload document
- `DELETE /api/documents/{id}` - Delete document
- `GET /api/documents/{id}/download` - Download document

### Salary Slips
- `GET /api/salary-slips` - List salary slips
- `POST /api/salary-slips` - Upload salary slip
- `DELETE /api/salary-slips/{id}` - Delete salary slip
- `GET /api/salary-slips/{id}/download` - Download salary slip

### Company Settings
- `GET /api/company/settings` - Get company settings
- `PATCH /api/company/settings` - Update company settings
- `GET /api/leave-categories` - List leave categories
- `POST /api/leave-categories` - Create leave category
- `PATCH /api/leave-categories/{id}` - Update leave category
- `DELETE /api/leave-categories/{id}` - Delete leave category

### Holidays & Events
- `GET /api/holidays` - List holidays/events
- `POST /api/holidays` - Create holiday/event
- `PATCH /api/holidays/{id}` - Update holiday/event
- `DELETE /api/holidays/{id}` - Delete holiday/event

## Database Schema

### Core Tables
- `organizations` - Company/organization data
- `users` - User accounts and profiles
- `leave_categories` - Leave types (Sick, Casual, etc.)
- `leave_allocations` - Annual leave allocations per user
- `leaves` - Leave requests and approvals
- `documents` - File uploads and metadata
- `salary_slips` - Salary slip records
- `holidays` - Company holidays and events
- `company_settings` - Payroll and system settings

### Multi-tenancy
All company-specific data includes an `organization_id` field for data isolation.

## Testing

```bash
# Run all tests
make test

# Run tests with coverage
make test-coverage

# Run specific test package
go test ./internal/handlers/...

# Run integration tests
make test-integration
```

## Deployment

### Docker

```bash
# Build image
make docker-build

# Run container
make docker-run
```

### Production

1. **Set production environment variables**
2. **Run database migrations**
3. **Deploy using Docker or binary**

```bash
# Build for production
make build

# Run migrations
make migrate-up

# Start server
./bin/hr-portal-backend
```

## Monitoring

The application includes:
- **Prometheus metrics** at `/metrics`
- **Structured logging** with request IDs
- **Health checks** at `/health`
- **Database connection monitoring**

## Security Features

- **JWT Authentication** with secure token handling
- **Password hashing** using bcrypt
- **CORS protection** with configurable origins
- **Request validation** and sanitization
- **Rate limiting** (configurable)
- **SQL injection protection** via GORM
- **File upload security** with type validation

## Performance Optimizations

- **Database connection pooling**
- **Redis caching** for frequently accessed data
- **Query optimization** with proper indexing
- **Pagination** for large datasets
- **Background job processing** for heavy operations
- **Compression** for API responses

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
