package repositories

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"hr-portal-backend/internal/models"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// Repositories holds all repository interfaces
type Repositories struct {
	User                    UserRepository
	Organization            OrganizationRepository
	Leave                   LeaveRepository
	LeaveCategory           LeaveCategoryRepository
	LeaveAllocation         LeaveAllocationRepository
	Document                DocumentRepository
	SalarySlip              SalarySlipRepository
	Holiday                 HolidayRepository
	CompanySettings         CompanySettingsRepository
	AuditLog                AuditLogRepository
	OffSite                 OffSiteRepository
	Reimbursement           *ReimbursementRepository
	Feedback                *FeedbackRepository
	EmployeeGrowth          *EmployeeGrowthRepository
	DocumentAcknowledgment  DocumentAcknowledgmentRepository
	EmployeePrivateDocument EmployeePrivateDocumentRepository
}

// New creates a new instance of Repositories
func New(db *gorm.DB, rdb *redis.Client) *Repositories {
	return &Repositories{
		User:                    &userRepository{BaseRepository: NewBaseRepository(db, rdb)},
		Organization:            &organizationRepository{BaseRepository: NewBaseRepository(db, rdb)},
		Leave:                   &leaveRepository{BaseRepository: NewBaseRepository(db, rdb)},
		LeaveCategory:           &leaveCategoryRepository{BaseRepository: NewBaseRepository(db, rdb)},
		LeaveAllocation:         &leaveAllocationRepository{BaseRepository: NewBaseRepository(db, rdb)},
		Document:                &documentRepository{BaseRepository: NewBaseRepository(db, rdb)},
		SalarySlip:              &salarySlipRepository{BaseRepository: NewBaseRepository(db, rdb)},
		Holiday:                 &holidayRepository{BaseRepository: NewBaseRepository(db, rdb)},
		CompanySettings:         &companySettingsRepository{BaseRepository: NewBaseRepository(db, rdb)},
		AuditLog:                &auditLogRepository{BaseRepository: NewBaseRepository(db, rdb)},
		OffSite:                 NewOffSiteRepository(db),
		Reimbursement:           NewReimbursementRepository(db),
		Feedback:                NewFeedbackRepository(db),
		EmployeeGrowth:          NewEmployeeGrowthRepository(db),
		DocumentAcknowledgment:  NewDocumentAcknowledgmentRepository(db),
		EmployeePrivateDocument: NewEmployeePrivateDocumentRepository(db, rdb),
	}
}

// BaseRepository provides common database operations
type BaseRepository struct {
	db  *gorm.DB
	rdb *redis.Client
}

// NewBaseRepository creates a new base repository
func NewBaseRepository(db *gorm.DB, rdb *redis.Client) *BaseRepository {
	return &BaseRepository{
		db:  db,
		rdb: rdb,
	}
}

// UserRepository interface for user operations
type UserRepository interface {
	Create(user *models.User) error
	GetByID(id string) (*models.User, error)
	GetByEmail(email, organizationID string) (*models.User, error)
	GetByUsername(username, organizationID string) (*models.User, error)
	GetByUsernameAcrossOrgs(username string) (*models.User, error)
	List(organizationID string, filters map[string]interface{}) ([]models.User, error)
	Update(user *models.User) error
	Delete(id string) error
	IsSubordinate(organizationID, managerID, subordinateID string) (bool, error)
	GetSubordinates(organizationID, managerID string) ([]models.User, error)
	UpdateLastLogin(id string) error
	Count(count *int64) error
	CountByOrganization(organizationID string, count *int64) error
	ListAll() ([]models.User, error)
	GetAdminByOrganizationID(organizationID string) (*models.User, error)
	// ReassignManagerAtomic updates a user's manager and optionally transfers their direct reports to the new manager in a single DB transaction
	ReassignManagerAtomic(userID string, newManagerID *uint, transferReports bool) error
}

// OrganizationRepository interface for organization operations
type OrganizationRepository interface {
	Create(org *models.Organization) error
	GetByID(id string) (*models.Organization, error)
	GetByDomain(domain string) (*models.Organization, error)
	List() ([]models.Organization, error)
	Update(org *models.Organization) error
	Delete(id string) error
	Count(count *int64) error
	CountActive(count *int64) error
	ListAll() ([]models.Organization, error)
}

// LeaveRepository interface for leave operations
type LeaveRepository interface {
	Create(leave *models.Leave) error
	GetByID(id string) (*models.Leave, error)
	List(organizationID string, filters map[string]interface{}) ([]models.Leave, error)
	ListPaginated(organizationID string, filters map[string]interface{}, page, perPage int) ([]models.Leave, int64, error)
	Update(leave *models.Leave) error
	Delete(id string) error
	GetByUserID(userID string, filters map[string]interface{}) ([]models.Leave, error)
	GetUserLeaves(userID string, year int) ([]models.Leave, error)
	GetTeamLeaves(managerID string, organizationID string, filters map[string]interface{}) ([]models.Leave, error)
	GetTeamLeavesPaginated(managerID string, organizationID string, filters map[string]interface{}, page, perPage int) ([]models.Leave, int64, error)
	GetPendingApprovals(managerID string) ([]models.Leave, error)
	Approve(id, approverID string) error
	Reject(id, rejecterID, reason string) error
	FindOverlappingLeaves(userID string, fromDate, toDate time.Time) ([]models.Leave, error)
	Count(count *int64) error
	CountByOrganization(organizationID string, count *int64) error
	CountPendingByOrganization(organizationID string, count *int64) error
	CountApprovedByOrganization(organizationID string, count *int64) error
}

// LeaveCategoryRepository interface for leave category operations
type LeaveCategoryRepository interface {
	Create(category *models.LeaveCategory) error
	GetByID(id string) (*models.LeaveCategory, error)
	List(organizationID string) ([]models.LeaveCategory, error)
	Update(category *models.LeaveCategory) error
	Delete(id string) error
}

// LeaveAllocationRepository interface for leave allocation operations
type LeaveAllocationRepository interface {
	Create(allocation *models.LeaveAllocation) error
	GetByID(id string) (*models.LeaveAllocation, error)
	GetByUserID(userID string, year int) ([]models.LeaveAllocation, error)
	List(organizationID string, filters map[string]interface{}) ([]models.LeaveAllocation, error)
	Update(allocation *models.LeaveAllocation) error
	Delete(id string) error
	UpdateUsedDays(userID, categoryID string, year int, days int) error
}

// DocumentRepository interface for document operations
type DocumentRepository interface {
	Create(document *models.Document) error
	GetByID(id string) (*models.Document, error)
	List(organizationID string, filters map[string]interface{}) ([]models.Document, error)
	Update(document *models.Document) error
	Delete(id string) error
	GetByUserID(userID string) ([]models.Document, error)
	Count(count *int64) error
	CountByOrganization(organizationID string, count *int64) error
}

// SalarySlipRepository interface for salary slip operations
type SalarySlipRepository interface {
	Create(salarySlip *models.SalarySlip) error
	GetByID(id string) (*models.SalarySlip, error)
	List(organizationID string, filters map[string]interface{}) ([]models.SalarySlip, error)
	Update(salarySlip *models.SalarySlip) error
	Delete(id string) error
	GetByUserID(userID string) ([]models.SalarySlip, error)
}

// HolidayRepository interface for holiday operations
type HolidayRepository interface {
	Create(holiday *models.Holiday) error
	GetByID(id string) (*models.Holiday, error)
	List(organizationID string, filters map[string]interface{}) ([]models.Holiday, error)
	GetAvailableYears(organizationID string) ([]int, error)
	Update(holiday *models.Holiday) error
	Delete(id string) error
}

// CompanySettingsRepository interface for company settings operations
type CompanySettingsRepository interface {
	Create(settings *models.CompanySettings) error
	GetByOrganizationID(organizationID string) (*models.CompanySettings, error)
	Update(settings *models.CompanySettings) error
	Delete(organizationID string) error
}

// AuditLogRepository interface for audit trail operations
type AuditLogRepository interface {
	Create(auditLog *models.AuditLog) error
	List(organizationID string, filters map[string]interface{}) ([]models.AuditLog, error)
	Count(organizationID string, filters map[string]interface{}) (int64, error)
	GetByEntity(entityType, entityID string) ([]models.AuditLog, error)
	GetByUser(userID string) ([]models.AuditLog, error)
	Delete(organizationID string, olderThan time.Time) error
	DeleteByEntity(entityType, entityID string) error
}

// Common query helpers
func (r *BaseRepository) buildQuery(query *gorm.DB, filters map[string]interface{}) *gorm.DB {
	for key, value := range filters {
		switch key {
		case "page":
			page := value.(int)
			if page > 0 {
				offset := (page - 1) * 20 // Default page size
				query = query.Offset(offset)
			}
		case "limit":
			limit := value.(int)
			if limit > 0 && limit <= 100 {
				query = query.Limit(limit)
			}
		case "search":
			search := value.(string)
			if search != "" {
				query = query.Where("name LIKE ? OR email LIKE ?", "%"+search+"%", "%"+search+"%")
			}
		case "role":
			role := value.(string)
			if role != "" {
				query = query.Where("role = ?", role)
			}
		case "department":
			department := value.(string)
			if department != "" {
				query = query.Where("department = ?", department)
			}
		case "status":
			status := value.(string)
			if status != "" {
				query = query.Where("status = ?", status)
			}
		case "user_id":
			userID := value.(string)
			if userID != "" {
				// Convert string userID to uint for proper comparison
				if userIDUint, err := strconv.ParseUint(userID, 10, 32); err == nil {
					query = query.Where("user_id = ?", uint(userIDUint))
				}
			}
		case "from_date":
			fromDate := value.(time.Time)
			query = query.Where("from_date >= ?", fromDate)
		case "to_date":
			toDate := value.(time.Time)
			query = query.Where("to_date <= ?", toDate)
		case "year":
			if yearStr, ok := value.(string); ok {
				// For holidays table, filter by year from date field using SQLite strftime
				if len(yearStr) == 4 {
					query = query.Where("strftime('%Y', date) = ?", yearStr)
				}
			} else if year, ok := value.(int); ok {
				if year > 0 {
					query = query.Where("year = ?", year)
				}
			}
		case "month":
			month := value.(int)
			if month > 0 && month <= 12 {
				query = query.Where("month = ?", month)
			}
		case "is_public":
			isPublic := value.(bool)
			query = query.Where("is_public = ?", isPublic)
		case "type":
			docType := value.(string)
			if docType != "" {
				query = query.Where("type = ?", docType)
			}
		case "is_calendar_event":
			isCalendarEvent := value.(bool)
			query = query.Where("is_calendar_event = ?", isCalendarEvent)
		}
	}
	return query
}

// Cache helpers
func (r *BaseRepository) getCacheKey(prefix, id string) string {
	return fmt.Sprintf("%s:%s", prefix, id)
}

func (r *BaseRepository) invalidateCache(pattern string) error {
	if r.rdb == nil {
		return nil
	}

	ctx := context.Background()
	keys, err := r.rdb.Keys(ctx, pattern).Result()
	if err != nil {
		return err
	}

	if len(keys) > 0 {
		return r.rdb.Del(ctx, keys...).Err()
	}

	return nil
}
