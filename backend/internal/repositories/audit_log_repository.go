package repositories

import (
	"fmt"
	"strconv"
	"time"

	"hr-portal-backend/internal/models"

	"gorm.io/gorm"
)

// auditLogRepository implements AuditLogRepository interface
type auditLogRepository struct {
	*BaseRepository
}

func (r *auditLogRepository) Create(auditLog *models.AuditLog) error {
	if auditLog.CreatedAt.IsZero() {
		auditLog.CreatedAt = time.Now()
	}
	if err := r.db.Create(auditLog).Error; err != nil {
		return fmt.Errorf("failed to create audit log: %w", err)
	}
	return nil
}

func (r *auditLogRepository) List(organizationID string, filters map[string]interface{}) ([]models.AuditLog, error) {
	var auditLogs []models.AuditLog

	// Convert string organizationID to uint
	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	query := r.db.Preload("ChangedByUser").Preload("Organization").Where("organization_id = ?", uint(orgIDUint))
	query = r.buildAuditLogQuery(query, filters)

	if err := query.Order("created_at DESC").Find(&auditLogs).Error; err != nil {
		return nil, fmt.Errorf("failed to list audit logs: %w", err)
	}
	return auditLogs, nil
}

func (r *auditLogRepository) Count(organizationID string, filters map[string]interface{}) (int64, error) {
	var count int64

	// Convert string organizationID to uint
	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return 0, fmt.Errorf("invalid organization ID: %w", err)
	}

	query := r.db.Model(&models.AuditLog{}).Where("organization_id = ?", uint(orgIDUint))
	// Build query filters excluding pagination
	countFilters := make(map[string]interface{})
	for key, value := range filters {
		if key != "limit" && key != "offset" {
			countFilters[key] = value
		}
	}
	query = r.buildAuditLogQuery(query, countFilters)

	err = query.Count(&count).Error
	if err != nil {
		return 0, fmt.Errorf("failed to count audit logs: %w", err)
	}

	return count, nil
}

func (r *auditLogRepository) GetByEntity(entityType, entityID string) ([]models.AuditLog, error) {
	var auditLogs []models.AuditLog
	if err := r.db.Preload("ChangedByUser").Preload("Organization").
		Where("entity_type = ? AND entity_id = ?", entityType, entityID).
		Order("created_at DESC").Find(&auditLogs).Error; err != nil {
		return nil, fmt.Errorf("failed to get audit logs by entity: %w", err)
	}
	return auditLogs, nil
}

func (r *auditLogRepository) GetByUser(userID string) ([]models.AuditLog, error) {
	var auditLogs []models.AuditLog

	// Convert string userID to uint
	userIDUint, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	// Get all audit logs related to this user:
	// 1. Logs where the user was the entity (USER entity type with this user's ID)
	// 2. Logs where the user made changes (changed_by = userID)
	// 3. Logs for user-related entities like leaves, salary slips, etc. where entity_id = userID
	if err := r.db.Preload("ChangedByUser").Preload("Organization").
		Where("(entity_type = 'USER' AND entity_id = ?) OR changed_by = ? OR (entity_type IN ('LEAVE', 'SALARY_SLIP', 'DOCUMENT') AND entity_id = ?)",
			userID, uint(userIDUint), userID).
		Order("created_at DESC").Find(&auditLogs).Error; err != nil {
		return nil, fmt.Errorf("failed to get audit logs by user: %w", err)
	}
	return auditLogs, nil
}

func (r *auditLogRepository) Delete(organizationID string, olderThan time.Time) error {
	// Convert string organizationID to uint
	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return fmt.Errorf("invalid organization ID: %w", err)
	}

	if err := r.db.Where("organization_id = ? AND created_at < ?", uint(orgIDUint), olderThan).
		Delete(&models.AuditLog{}).Error; err != nil {
		return fmt.Errorf("failed to delete old audit logs: %w", err)
	}
	return nil
}

func (r *auditLogRepository) DeleteByEntity(entityType, entityID string) error {
	if err := r.db.Where("entity_type = ? AND entity_id = ?", entityType, entityID).
		Delete(&models.AuditLog{}).Error; err != nil {
		return fmt.Errorf("failed to delete audit logs for entity %s:%s: %w", entityType, entityID, err)
	}
	return nil
}

// buildAuditLogQuery builds query with filters specific to audit logs
func (r *auditLogRepository) buildAuditLogQuery(query *gorm.DB, filters map[string]interface{}) *gorm.DB {
	for key, value := range filters {
		switch key {
		case "action":
			action := value.(string)
			if action != "" {
				query = query.Where("action = ?", action)
			}
		case "entity_type":
			entityType := value.(string)
			if entityType != "" {
				query = query.Where("entity_type = ?", entityType)
			}
		case "changed_by":
			changedBy := value.(string)
			if changedBy != "" {
				if changedByUint, err := strconv.ParseUint(changedBy, 10, 32); err == nil {
					query = query.Where("changed_by = ?", uint(changedByUint))
				}
			}
		case "entity_id":
			entityID := value.(string)
			if entityID != "" {
				query = query.Where("entity_id = ?", entityID)
			}
		case "from_date":
			fromDate := value.(time.Time)
			query = query.Where("created_at >= ?", fromDate)
		case "to_date":
			toDate := value.(time.Time)
			query = query.Where("created_at <= ?", toDate)
		case "limit":
			limit := value.(int)
			if limit > 0 && limit <= 1000 {
				query = query.Limit(limit)
			}
		case "offset":
			offset := value.(int)
			if offset >= 0 {
				query = query.Offset(offset)
			}
		}
	}
	return query
}
