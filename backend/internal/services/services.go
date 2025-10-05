package services

import (
	"mime/multipart"
	"net/http"
	"time"

	"hr-portal-backend/internal/config"
	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
	"hr-portal-backend/internal/utils"
)

// Services holds all service interfaces
type Services struct {
	User            UserService
	Auth            AuthService
	Leave           LeaveService
	LeaveCategory   LeaveCategoryService
	LeaveAllocation LeaveAllocationService
	Document        DocumentService
	SalarySlip      SalarySlipService
	Holiday         HolidayService
	CompanySettings CompanySettingsService
	Dashboard       DashboardService
	Organization    OrganizationService
	Audit           AuditService
}

// New creates a new instance of Services
func New(repos *repositories.Repositories, cfg *config.Config) *Services {
	// Create audit service first since other services depend on it
	auditService := NewAuditService(repos.AuditLog, repos.User)

	return &Services{
		User:            NewUserService(repos.User, repos.Organization, auditService),
		Auth:            NewAuthService(repos.User, repos.Organization, cfg.JWT),
		Leave:           NewLeaveService(repos.Leave, repos.User, repos.LeaveCategory, repos.LeaveAllocation, repos.Holiday, auditService),
		LeaveCategory:   NewLeaveCategoryService(repos.LeaveCategory),
		LeaveAllocation: NewLeaveAllocationService(repos.LeaveAllocation, repos.LeaveCategory),
		Document:        NewDocumentService(repos.Document, auditService),
		SalarySlip:      NewSalarySlipService(repos.SalarySlip, auditService),
		Holiday:         NewHolidayService(repos.Holiday, auditService),
		CompanySettings: NewCompanySettingsService(repos.CompanySettings),
		Dashboard:       NewDashboardService(repos),
		Organization:    NewOrganizationService(repos.Organization),
		Audit:           auditService,
	}
}

// UserService interface for user business logic
type UserService interface {
	CreateUser(req CreateUserRequest, httpReq *http.Request) (*models.User, error)
	GetUser(id string) (*models.User, error)
	ListUsers(organizationID string, filters map[string]interface{}) ([]models.User, error)
	UpdateUser(id string, req UpdateUserRequest, httpReq *http.Request) (*models.User, error)
	DeleteUser(id string, httpReq *http.Request) error
	ChangePassword(userID, currentPassword, newPassword string) error
	IsSubordinate(organizationID, managerID, subordinateID string) (bool, error)
	GetSubordinates(organizationID, managerID string) ([]models.User, error)
	Count(count *int64) error
	ListAll() ([]models.User, error)
	GetAdminByOrganizationID(organizationID string) (*models.User, error)
}

// AuthService interface for authentication business logic
type AuthService interface {
	Login(req LoginRequest) (*LoginResponse, error)
	Logout(userID string) error
	RefreshToken(refreshToken string) (*LoginResponse, error)
	ValidateToken(token string) (*utils.JWTClaims, error)
	GetUserByID(userID string) (*models.User, error)
}

// OrganizationService interface for organization business logic
type OrganizationService interface {
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

// PaginatedResponse represents a paginated response
type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	PerPage    int         `json:"per_page"`
	TotalPages int         `json:"total_pages"`
}

// LeaveService interface for leave business logic
type LeaveService interface {
	ApplyLeave(req ApplyLeaveRequest, httpReq *http.Request) (*models.Leave, error)
	GetLeave(id string) (*models.Leave, error)
	ListLeaves(organizationID string, filters map[string]interface{}) ([]models.Leave, error)
	ListLeavesPaginated(organizationID string, filters map[string]interface{}, page, perPage int) (*PaginatedResponse, error)
	GetTeamLeaves(managerID string, organizationID string, filters map[string]interface{}) ([]models.Leave, error)
	GetTeamLeavesPaginated(managerID string, organizationID string, filters map[string]interface{}, page, perPage int) (*PaginatedResponse, error)
	UpdateLeave(id string, req UpdateLeaveRequest) (*models.Leave, error)
	ApproveLeave(id, approverID string) (*models.Leave, error)
	RejectLeave(id, rejecterID, reason string) (*models.Leave, error)
	EditLeave(req EditLeaveRequest, userID, organizationID string, httpReq *http.Request) (*models.Leave, error)
	GetLeaveBalance(userID string) ([]LeaveBalanceResponse, error)
	CancelLeave(id, userID string) (*models.Leave, error)
}

// LeaveCategoryService interface for leave category business logic
type LeaveCategoryService interface {
	CreateCategory(organizationID string, req CreateLeaveCategoryRequest) (*models.LeaveCategory, error)
	GetCategory(id string) (*models.LeaveCategory, error)
	ListCategories(organizationID string) ([]models.LeaveCategory, error)
	UpdateCategory(id string, req UpdateLeaveCategoryRequest) (*models.LeaveCategory, error)
	DeleteCategory(id string) error
}

// DocumentService interface for document business logic
type DocumentService interface {
	UploadDocument(req UploadDocumentRequest, httpReq *http.Request) (*models.Document, error)
	GetDocument(id string) (*models.Document, error)
	ListDocuments(organizationID string, filters map[string]interface{}) ([]models.Document, error)
	DeleteDocument(id string, httpReq *http.Request) error
	GetUserDocuments(userID string) ([]models.Document, error)
	DownloadDocument(id string) ([]byte, error)
}

// SalarySlipService interface for salary slip business logic
type SalarySlipService interface {
	UploadSalarySlip(req UploadSalarySlipRequest, httpReq *http.Request) (*models.SalarySlip, error)
	GetSalarySlip(id string) (*models.SalarySlip, error)
	ListSalarySlips(organizationID string, filters map[string]interface{}) ([]models.SalarySlip, error)
	DeleteSalarySlip(id string) error
	GetUserSalarySlips(userID string) ([]models.SalarySlip, error)
	DownloadSalarySlip(id string) ([]byte, error)
}

// HolidayService interface for holiday business logic
type HolidayService interface {
	CreateHoliday(req CreateHolidayRequest, httpReq *http.Request) (*models.Holiday, error)
	GetHoliday(id string) (*models.Holiday, error)
	ListHolidays(organizationID string, filters map[string]interface{}) ([]models.Holiday, error)
	GetAvailableYears(organizationID string) ([]int, error)
	UpdateHoliday(id string, req UpdateHolidayRequest) (*models.Holiday, error)
	DeleteHoliday(id string) error
}

// LeaveAllocationService interface for leave allocation business logic
type LeaveAllocationService interface {
	CreateAllocation(req CreateLeaveAllocationRequest) (*models.LeaveAllocation, error)
	GetAllocation(id string) (*models.LeaveAllocation, error)
	GetUserAllocations(userID string, year int) ([]models.LeaveAllocation, error)
	ListAllocations(organizationID string, filters map[string]interface{}) ([]models.LeaveAllocation, error)
	UpdateAllocation(id string, req UpdateLeaveAllocationRequest) (*models.LeaveAllocation, error)
	DeleteAllocation(id string) error
}

// CompanySettingsService interface for company settings business logic
type CompanySettingsService interface {
	GetSettings(organizationID string) (*models.CompanySettings, error)
	UpdateSettings(organizationID string, req UpdateCompanySettingsRequest) (*models.CompanySettings, error)
	CreateSettings(organizationID string, req UpdateCompanySettingsRequest) (*models.CompanySettings, error)
}

// DashboardService interface for dashboard business logic
type DashboardService interface {
	GetStats(organizationID, userID, userRole string) (*DashboardStatsResponse, error)
}

// AuditService interface for audit trail business logic
type AuditService interface {
	LogAction(req AuditActionRequest, httpReq *http.Request) error
	LogUserChange(organizationID, userID, changedBy string, action string, oldUser, newUser *models.User, req *http.Request) error
	LogDocumentChange(organizationID, documentID, changedBy string, action string, changeSummary string, req *http.Request) error
	LogLeaveChange(organizationID, leaveID, changedBy string, action string, changeSummary string, req *http.Request) error
	LogSalarySlipChange(organizationID, salarySlipID, changedBy string, action string, changeSummary string, req *http.Request) error
	GetAuditLogs(organizationID string, filters map[string]interface{}) ([]models.AuditLog, error)
	CountAuditLogs(organizationID string, filters map[string]interface{}) (int64, error)
	GetEntityAuditLogs(entityType, entityID string) ([]models.AuditLog, error)
	GetUserAuditLogs(userID string) ([]models.AuditLog, error)
	DeleteOldLogs(organizationID string, olderThan time.Time) error
	DeleteEntityLogs(entityType, entityID string) error
	AddDummyLogs(organizationID string) error
}

// Request/Response DTOs

type CreateUserRequest struct {
	OrganizationID string  `json:"organization_id" validate:"required"`
	Username       string  `json:"username" validate:"required,min=3,max=50"`
	Email          string  `json:"email" validate:"required,email"`
	Password       string  `json:"password" validate:"required,min=8"`
	Name           string  `json:"name" validate:"required,min=2,max=100"`
	Designation    string  `json:"designation"`
	Department     string  `json:"department" validate:"required"`
	Role           string  `json:"role" validate:"required,oneof=Employee Manager HR Admin"`
	ManagerID      string  `json:"manager_id"`
	CTC            float64 `json:"ctc"`
}

type UpdateUserRequest struct {
	Username    *string  `json:"username"`
	Email       *string  `json:"email"`
	Name        *string  `json:"name"`
	Designation *string  `json:"designation"`
	Department  *string  `json:"department"`
	Role        *string  `json:"role"`
	ManagerID   *string  `json:"manager_id"`
	CTC         *float64 `json:"ctc"`
	IsActive    *bool    `json:"is_active"`
}

type LoginRequest struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
}

type LoginResponse struct {
	Token        string       `json:"token"`
	RefreshToken string       `json:"refresh_token"`
	User         *models.User `json:"user"`
	ExpiresAt    time.Time    `json:"expires_at"`
}

type ApplyLeaveRequest struct {
	UserID         string    `json:"user_id" validate:"required"`
	OrganizationID string    `json:"organization_id" validate:"required"`
	CategoryID     string    `json:"category_id" validate:"required"`
	Type           string    `json:"type" validate:"required"`
	Reason         string    `json:"reason"`
	FromDate       time.Time `json:"from_date" validate:"required"`
	ToDate         time.Time `json:"to_date" validate:"required"`
	StartHalf      string    `json:"start_half" validate:"omitempty,oneof=FULL AM PM"`
	EndHalf        string    `json:"end_half" validate:"omitempty,oneof=FULL AM PM"`
}

type UpdateLeaveRequest struct {
	Type      *string    `json:"type"`
	Reason    *string    `json:"reason"`
	FromDate  *time.Time `json:"from_date"`
	ToDate    *time.Time `json:"to_date"`
	StartHalf *string    `json:"start_half" validate:"omitempty,oneof=FULL AM PM"`
	EndHalf   *string    `json:"end_half" validate:"omitempty,oneof=FULL AM PM"`
	Status    *string    `json:"status"`
}

type EditLeaveRequest struct {
	LeaveID        string    `json:"leave_id"`
	OrganizationID string    `json:"organization_id" validate:"required"`
	CategoryID     string    `json:"category_id" validate:"required"`
	Type           string    `json:"type" validate:"required"`
	Reason         string    `json:"reason"`
	FromDate       time.Time `json:"from_date" validate:"required"`
	ToDate         time.Time `json:"to_date" validate:"required"`
	StartHalf      string    `json:"start_half" validate:"omitempty,oneof=FULL AM PM"`
	EndHalf        string    `json:"end_half" validate:"omitempty,oneof=FULL AM PM"`
}

type LeaveBalanceResponse struct {
	CategoryID    string `json:"category_id"`
	CategoryName  string `json:"category_name"`
	TotalDays     int    `json:"total_days"`
	UsedDays      int    `json:"used_days"`
	RemainingDays int    `json:"remaining_days"`
	Year          int    `json:"year"`
}

type CreateLeaveCategoryRequest struct {
	Name             string `json:"name" validate:"required,min=2,max=50"`
	Description      string `json:"description"`
	MaxDaysPerYear   int    `json:"max_days_per_year"`
	RequiresApproval bool   `json:"requires_approval"`
}

type UpdateLeaveCategoryRequest struct {
	Name             *string `json:"name"`
	Description      *string `json:"description"`
	MaxDaysPerYear   *int    `json:"max_days_per_year"`
	RequiresApproval *bool   `json:"requires_approval"`
	IsActive         *bool   `json:"is_active"`
}

type CreateLeaveAllocationRequest struct {
	UserID         string `json:"user_id" validate:"required"`
	OrganizationID string `json:"organization_id" validate:"required"`
	CategoryID     string `json:"category_id" validate:"required"`
	CategoryName   string `json:"category_name" validate:"required"`
	TotalDays      int    `json:"total_days" validate:"required,min=0"`
	Year           int    `json:"year" validate:"required"`
}

type UpdateLeaveAllocationRequest struct {
	TotalDays *int `json:"total_days"`
	UsedDays  *int `json:"used_days"`
}

type UploadDocumentRequest struct {
	UserID         string                `json:"user_id" validate:"required"`
	OrganizationID string                `json:"organization_id" validate:"required"`
	Title          string                `json:"title" validate:"required"`
	Category       string                `json:"category" validate:"required"`
	IsPublic       bool                  `json:"is_public"`
	FileHeader     *multipart.FileHeader `json:"-"` // File header from form upload
}

type UploadSalarySlipRequest struct {
	UserID         string                `json:"user_id" validate:"required"`
	OrganizationID string                `json:"organization_id" validate:"required"`
	Month          int                   `json:"month" validate:"required,min=1,max=12"`
	Year           int                   `json:"year" validate:"required"`
	FileHeader     *multipart.FileHeader `json:"-"` // File header from form upload
}

type CreateHolidayRequest struct {
	OrganizationID  string `json:"organization_id" validate:"required"`
	Name            string `json:"name" validate:"required"`
	Date            string `json:"date"` // Accept string date in YYYY-MM-DD format
	Type            string `json:"type" validate:"required,oneof=holiday event notice"`
	Description     string `json:"description"`
	IsCalendarEvent bool   `json:"is_calendar_event"`
	Color           string `json:"color"`
}

type UpdateHolidayRequest struct {
	Name            *string `json:"name"`
	Date            *string `json:"date"` // Accept string date in YYYY-MM-DD format
	Type            *string `json:"type"`
	Description     *string `json:"description"`
	IsCalendarEvent *bool   `json:"is_calendar_event"`
	Color           *string `json:"color"`
}

type UpdateCompanySettingsRequest struct {
	Settings string `json:"settings" validate:"required"`
}

type DashboardStatsResponse struct {
	TotalUsers        int64                  `json:"total_users"`
	TotalLeaves       int64                  `json:"total_leaves"`
	PendingLeaves     int64                  `json:"pending_leaves"`
	ApprovedLeaves    int64                  `json:"approved_leaves"`
	TotalDocuments    int64                  `json:"total_documents"`
	UpcomingHolidays  []models.Holiday       `json:"upcoming_holidays"`
	RecentLeaves      []models.Leave         `json:"recent_leaves"`
	RecentDocuments   []models.Document      `json:"recent_documents"`
	RecentSalarySlips []models.SalarySlip    `json:"recent_salary_slips"`
	LeaveBalances     []LeaveBalanceResponse `json:"leave_balances"`
}

// AuditActionRequest represents the request to create an audit log
type AuditActionRequest struct {
	OrganizationID string      `json:"organization_id"`
	Action         string      `json:"action"` // "CREATE", "UPDATE", "DELETE"
	EntityType     string      `json:"entity_type"`
	EntityID       string      `json:"entity_id"`
	ChangedBy      string      `json:"changed_by"`
	ChangeSummary  string      `json:"change_summary"`
	OldValues      interface{} `json:"old_values,omitempty"`
	NewValues      interface{} `json:"new_values,omitempty"`
}

// AuditService interface for audit business logic
