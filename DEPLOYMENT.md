# HR Portal Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- Git installed

## Quick Start

1. Clone the repository:
```bash
git clone <repository-url>
cd hr-portal-new
```

2. Start all services:
```bash
docker-compose up -d
```

3. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## Services

### Backend (Go)
- **Port**: 8080
- **Health Check**: http://localhost:8080/health
- **API Documentation**: http://localhost:8080/swagger/index.html

### Frontend (Next.js)
- **Port**: 3000
- **Framework**: Next.js 15.5.2
- **Build**: Static export with Nginx

### Mobile (Flutter)
- Directory: `flutter_app/` (renamed from `hr_portal_flutter/`)
- Platforms: iOS, Android, Web

### Database (PostgreSQL)
- **Port**: 5432
- **Database**: hr_portal
- **User**: hr_portal
- **Password**: password

### Cache (Redis)
- **Port**: 6379
- **Purpose**: Session storage and caching

## Environment Variables

### Backend
- `DB_HOST`: Database host (default: postgres)
- `DB_PORT`: Database port (default: 5432)
- `DB_USER`: Database user (default: hr_portal)
- `DB_PASSWORD`: Database password (default: password)
- `DB_NAME`: Database name (default: hr_portal)
- `REDIS_HOST`: Redis host (default: redis)
- `REDIS_PORT`: Redis port (default: 6379)

## File Uploads

Uploaded files are stored in `./backend/uploads` and are persisted across container restarts.

## Database Migrations

The backend automatically runs database migrations on startup using GORM AutoMigrate.

## Scaling

To scale the backend service:
```bash
docker-compose up -d --scale backend=3
```

## Monitoring

### Health Checks
- Backend: `curl http://localhost:8080/health`
- Frontend: `curl http://localhost:3000`

### Logs
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000, 8080, 5432, and 6379 are available
2. **Permission issues**: Ensure Docker has proper permissions
3. **Database connection**: Wait for PostgreSQL to fully start before backend

### Reset Everything
```bash
docker-compose down -v
docker-compose up -d
```

### Update Application
```bash
git pull
docker-compose build --no-cache
docker-compose up -d
```

## Splitting into three repositories (microservices)

To split the monorepo into three standalone repositories while preserving history, use the helper script:

```bash
scripts/split_repos.sh <backend_repo_url> <frontend_repo_url> <flutter_repo_url>
```

This will create split branches using `git subtree split` and push them as `main` to the provided remotes:

- `backend/`  → split-backend → backend_repo_url
- `frontend/` → split-frontend → frontend_repo_url
- `flutter_app/` → split-flutter → flutter_repo_url

## Production Considerations

1. **Security**:
   - Change default passwords
   - Use environment variables for secrets
   - Enable HTTPS with reverse proxy

2. **Performance**:
   - Use external PostgreSQL and Redis instances
   - Configure proper resource limits
   - Enable database connection pooling

3. **Monitoring**:
   - Set up application monitoring
   - Configure log aggregation
   - Monitor resource usage

4. **Backup**:
   - Regular database backups
   - File upload backups
   - Configuration backups
