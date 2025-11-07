package services

import (
	"fmt"
	"mime/multipart"
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"hr-portal-backend/internal/config"
	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
	"hr-portal-backend/internal/utils"
)

// Services holds all service interfaces
type Services struct {
	User                    UserService
	Auth                    AuthService
	Leave                   LeaveService
	LeaveCategory           LeaveCategoryService
	LeaveAllocation         LeaveAllocationService
	LOP                     LOPService
	Document                DocumentService
	SalarySlip              SalarySlipService
	Holiday                 HolidayService
	CompanySettings         CompanySettingsService
	Dashboard               DashboardService
	Organization            OrganizationService
	Audit                   AuditService
	Notification            NotificationService
	OffSite                 OffSiteService
	Reimbursement           *ReimbursementService
	Feedback                *FeedbackService
	EmployeeGrowth          *EmployeeGrowthService
	DocumentAcknowledgment  DocumentAcknowledgmentService
	EmployeePrivateDocument EmployeePrivateDocumentService
	PayslipPDF              PayslipPDFService
	KRA                     KRAService
	Designation             DesignationService
	Department              DepartmentService
}

// New creates a new instance of Services
func New(repos *repositories.Repositories, cfg *config.Config, db *gorm.DB, rdb *redis.Client) *Services {
	// Create audit service first since other services depend on it
	auditService := NewAuditService(repos.AuditLog, repos.User)

	return &Services{
		User:                    NewUserService(repos.User, repos.Organization, repos.LeaveAllocation, repos.LeaveCategory, auditService, NewNotificationService()),
		Auth:                    NewAuthService(repos.User, repos.Organization, repos.OTP, repos.PasswordReset, cfg.JWT, NewNotificationService()),
		Leave:                   NewLeaveService(repos.Leave, repos.User, repos.LeaveCategory, repos.LeaveAllocation, repos.Holiday, auditService, NewNotificationService()),
		LeaveCategory:           NewLeaveCategoryService(repos.LeaveCategory),
		LeaveAllocation:         NewLeaveAllocationService(repos.LeaveAllocation, repos.LeaveCategory, repos.User),
		LOP:                     NewLOPService(repos),
		Document:                NewDocumentService(repos.Document, auditService, NewNotificationService()),
		SalarySlip:              NewSalarySlipService(repos.SalarySlip, auditService, NewNotificationService()),
		Holiday:                 NewHolidayService(repos.Holiday, auditService),
		CompanySettings:         NewCompanySettingsService(repos.CompanySettings),
		Dashboard:               NewDashboardService(repos),
		Organization:            NewOrganizationService(repos.Organization),
		Audit:                   auditService,
		Notification:            NewNotificationService(),
		OffSite:                 NewOffSiteService(repos.OffSite, repos.User, auditService),
		Reimbursement:           NewReimbursementService(repos.Reimbursement, repos.User, NewNotificationService()),
		Feedback:                NewFeedbackService(repos.Feedback),
		EmployeeGrowth:          NewEmployeeGrowthService(repos.EmployeeGrowth),
		DocumentAcknowledgment:  NewDocumentAcknowledgmentService(repos.DocumentAcknowledgment),
		EmployeePrivateDocument: NewEmployeePrivateDocumentService(repos.EmployeePrivateDocument),
		PayslipPDF:              NewPayslipPDFService("./uploads"),
		KRA:                     NewKRAService(repos.KRA, repos.User, auditService, NewNotificationService()),
		Designation:             NewDesignationService(repos.Designation),
		Department:              NewDepartmentService(repos.Department),
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
	SendOTP(email string) error
	VerifyOTP(email, otp string) (*LoginResponse, error)
	ForgotPassword(email string) error
	ResetPasswordWithOTP(email, otp, newPassword string) error
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
	ListAllWithUserCount() ([]map[string]interface{}, error)
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
	GetTeamLeavesRecursive(managerID string, organizationID string, filters map[string]interface{}) ([]models.Leave, error)
	GetTeamLeavesRecursivePaginated(managerID string, organizationID string, filters map[string]interface{}, page, perPage int) (*PaginatedResponse, error)
	UpdateLeave(id string, req UpdateLeaveRequest) (*models.Leave, error)
	ApproveLeave(id, approverID string) (*models.Leave, error)
	RejectLeave(id, rejecterID, reason string) (*models.Leave, error)
	EditLeave(req EditLeaveRequest, userID, organizationID string, httpReq *http.Request) (*models.Leave, error)
	GetLeaveBalance(userID string) ([]LeaveBalanceResponse, error)
	GetTeamLeaveBalances(managerID, organizationID string) (map[string][]LeaveBalanceResponse, error)
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
	AddSalarySlip(req UploadSalarySlipRequest, httpReq *http.Request) (*models.SalarySlip, error)
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
	GetUpcomingHolidaysAndEvents(organizationID string, limit int) ([]models.Holiday, error)
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
	GetKRASettings(organizationID string) (*KRASettings, error)
	UpdateKRASettings(organizationID string, req UpdateKRASettingsRequest) (*models.CompanySettings, error)
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
	LogOffSiteChange(organizationID, offSiteID, changedBy string, action string, changeSummary string, req *http.Request) error
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
	OrganizationID  string  `json:"organization_id" validate:"required"`
	Username        string  `json:"username" validate:"required,min=3,max=50"`
	Email           string  `json:"email" validate:"required,email"`
	Password        string  `json:"password" validate:"required,min=8"`
	Name            string  `json:"name" validate:"required,min=2,max=100"`
	Designation     string  `json:"designation"`
	Department      string  `json:"department" validate:"required"`
	Role            string  `json:"role" validate:"required,oneof=Employee Manager HR Admin"`
	ManagerID       string  `json:"manager_id"`
	EmployeeID      string  `json:"employee_id"`
	CTC             float64 `json:"ctc"`
	JoiningDate     *string `json:"joining_date"`
	Birthday        *string `json:"birthday"`
	HikeCycleMonths *int    `json:"hike_cycle_months"` // Hike cycle in months (e.g., 12 for annual)
	LastHikeDate    *string `json:"last_hike_date"`    // Last hike date
}

type UpdateUserRequest struct {
	Username        *string  `json:"username"`
	Email           *string  `json:"email"`
	Name            *string  `json:"name"`
	Designation     *string  `json:"designation"`
	Department      *string  `json:"department"`
	Role            *string  `json:"role"`
	ManagerID       *string  `json:"manager_id"`
	TransferReports *bool    `json:"transfer_reports"`
	EmployeeID      *string  `json:"employee_id"`
	CTC             *float64 `json:"ctc"`
	IsActive        *bool    `json:"is_active"`
	JoiningDate     *string  `json:"joining_date"`
	Birthday        *string  `json:"birthday"`
	HikeCycleMonths *int     `json:"hike_cycle_months"` // Hike cycle in months (e.g., 12 for annual)
	LastHikeDate    *string  `json:"last_hike_date"`    // Last hike date
}

type LoginRequest struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
}

type LoginResponse struct {
	Token        string        `json:"token"`
	RefreshToken string        `json:"refresh_token"`
	User         *UserResponse `json:"user"`
	ExpiresAt    time.Time     `json:"expires_at"`
}

// UserResponse represents a user response with decrypted CTC
type UserResponse struct {
	ID              uint       `json:"id"`
	OrganizationID  uint       `json:"organization_id"`
	Username        string     `json:"username"`
	Email           string     `json:"email"`
	Name            string     `json:"name"`
	Designation     string     `json:"designation"`
	Department      string     `json:"department"`
	Role            string     `json:"role"`
	ManagerID       *uint      `json:"manager_id"`
	EmployeeID      string     `json:"employee_id"`
	CTC             float64    `json:"ctc"` // Decrypted CTC value
	Phone           string     `json:"phone"`
	JoiningDate     *time.Time `json:"joining_date"`
	HikeCycleMonths int        `json:"hike_cycle_months"`
	LastHikeDate    *time.Time `json:"last_hike_date"`
	NextHikeDate    *time.Time `json:"next_hike_date"`
	IsActive        bool       `json:"is_active"`
	LastLoginAt     *time.Time `json:"last_login_at"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`

	// Relationships
	Organization *OrganizationResponse `json:"organization,omitempty"`
	Manager      *UserResponse         `json:"manager,omitempty"`
	Subordinates []UserResponse        `json:"subordinates,omitempty"`
}

// OrganizationResponse represents an organization response
type OrganizationResponse struct {
	ID        uint      `json:"id"`
	Name      string    `json:"name"`
	Domain    string    `json:"domain"`
	LogoURL   string    `json:"logo_url"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ConvertUserToResponse converts a models.User to UserResponse with decrypted CTC
func ConvertUserToResponse(user *models.User) (*UserResponse, error) {
	response := &UserResponse{
		ID:              user.ID,
		OrganizationID:  user.OrganizationID,
		Username:        user.Username,
		Email:           user.Email,
		Name:            user.Name,
		Designation:     user.Designation,
		Department:      user.Department,
		Role:            user.Role,
		ManagerID:       user.ManagerID,
		EmployeeID:      user.EmployeeID,
		Phone:           user.Phone,
		JoiningDate:     user.JoiningDate,
		HikeCycleMonths: user.HikeCycleMonths,
		LastHikeDate:    user.LastHikeDate,
		NextHikeDate:    user.NextHikeDate,
		IsActive:        user.IsActive,
		LastLoginAt:     user.LastLoginAt,
		CreatedAt:       user.CreatedAt,
		UpdatedAt:       user.UpdatedAt,
	}

	// Decrypt CTC if it exists
	if user.CTC != "" {
		decryptedCTC, err := utils.DecryptFloat64(user.CTC)
		if err != nil {
			// If decryption fails, set CTC to 0
			response.CTC = 0
		} else {
			response.CTC = decryptedCTC
		}
	} else {
		response.CTC = 0
	}

	// Convert organization if it exists
	if user.Organization.ID != 0 {
		response.Organization = &OrganizationResponse{
			ID:        user.Organization.ID,
			Name:      user.Organization.Name,
			Domain:    user.Organization.Domain,
			LogoURL:   user.Organization.Logo,
			CreatedAt: user.Organization.CreatedAt,
			UpdatedAt: user.Organization.UpdatedAt,
		}
	}

	// Convert manager if it exists
	if user.Manager != nil {
		// Ensure manager has Employee ID (generate if missing, but don't update DB)
		if user.Manager.EmployeeID == "" {
			user.Manager.EmployeeID = fmt.Sprintf("EMP%06d", user.Manager.ID)
		}
		managerResponse, err := ConvertUserToResponse(user.Manager)
		if err != nil {
			// If manager conversion fails, skip manager
			response.Manager = nil
		} else {
			response.Manager = managerResponse
		}
	}

	// Convert subordinates if they exist
	if len(user.Subordinates) > 0 {
		response.Subordinates = make([]UserResponse, 0, len(user.Subordinates))
		for _, subordinate := range user.Subordinates {
			// Ensure subordinate has Employee ID (generate if missing, but don't update DB)
			if subordinate.EmployeeID == "" {
				subordinate.EmployeeID = fmt.Sprintf("EMP%06d", subordinate.ID)
			}
			subResponse, err := ConvertUserToResponse(&subordinate)
			if err != nil {
				// Skip this subordinate if conversion fails
				continue
			}
			response.Subordinates = append(response.Subordinates, *subResponse)
		}
	}

	return response, nil
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
	DefaultDays      int    `json:"default_days"`
	MaxDaysPerYear   int    `json:"max_days_per_year"`
	RequiresApproval bool   `json:"requires_approval"`
}

type UpdateLeaveCategoryRequest struct {
	Name             *string `json:"name"`
	Description      *string `json:"description"`
	DefaultDays      *int    `json:"default_days"`
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
	LOPDays        float64               `json:"lop_days"`   // Loss of Pay days
	LOPAmount      float64               `json:"lop_amount"` // Calculated LOP deduction amount
	FileHeader     *multipart.FileHeader `json:"-"`          // File header from form upload
}

type CreateHolidayRequest struct {
	OrganizationID  string `json:"organization_id" validate:"required"`
	Name            string `json:"name" validate:"required"`
	Date            string `json:"date"`       // Accept string date in YYYY-MM-DD format
	DateRange       string `json:"date_range"` // Accept string date range (e.g., "2024-01-01 to 2024-01-03")
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

// KRA Settings Types
type KRASettings struct {
	DefaultFields        []KRAField       `json:"default_fields"`
	MeasurementUnits     []string         `json:"measurement_units"`
	RatingScale          KRARatingScale   `json:"rating_scale"`
	WeightDistribution   KRAWeightConfig  `json:"weight_distribution"`
	EvaluationCriteria   []KRACriteria    `json:"evaluation_criteria"`
	NotificationSettings KRANotifications `json:"notification_settings"`
}

type KRAField struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Type        string   `json:"type"` // text, number, percentage, select, textarea
	Required    bool     `json:"required"`
	Default     string   `json:"default"`
	Options     []string `json:"options,omitempty"` // For select type
	Placeholder string   `json:"placeholder"`
	HelpText    string   `json:"help_text"`
	Order       int      `json:"order"`
}

type KRARatingScale struct {
	Min         float64           `json:"min"`
	Max         float64           `json:"max"`
	Step        float64           `json:"step"`
	Labels      map[string]string `json:"labels"` // e.g., {"1": "Poor", "5": "Excellent"}
	Description string            `json:"description"`
}

type KRAWeightConfig struct {
	MaxTotalWeight      float64 `json:"max_total_weight"`
	MinIndividualWeight float64 `json:"min_individual_weight"`
	MaxIndividualWeight float64 `json:"max_individual_weight"`
	AllowOverflow       bool    `json:"allow_overflow"`
	AutoDistribute      bool    `json:"auto_distribute"`
}

type KRACriteria struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Weight      float64 `json:"weight"`
	Required    bool    `json:"required"`
	Type        string  `json:"type"` // performance, behavior, skill, goal
}

type KRANotifications struct {
	ReminderDaysBeforeDue []int             `json:"reminder_days_before_due"`
	NotifyOnCreation      bool              `json:"notify_on_creation"`
	NotifyOnEvaluation    bool              `json:"notify_on_evaluation"`
	NotifyOnCompletion    bool              `json:"notify_on_completion"`
	EmailTemplates        map[string]string `json:"email_templates"`
}

type UpdateKRASettingsRequest struct {
	KRASettings string `json:"kra_settings" validate:"required"`
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
	RecentOffSites    []models.OffSite       `json:"recent_off_sites"`
	UserBirthdays     []UserBirthdayResponse `json:"user_birthdays"`
	HikeReminders     []HikeReminderResponse `json:"hike_reminders"`
}

// UserBirthdayResponse represents a user birthday for dashboard display
type UserBirthdayResponse struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	Birthday        string `json:"birthday"`
	BirthdayVisible bool   `json:"birthday_visible"`
}

// HikeReminderResponse represents a hike reminder for dashboard display
type HikeReminderResponse struct {
	UserID          string `json:"user_id"`
	UserName        string `json:"user_name"`
	EmployeeID      string `json:"employee_id"`
	NextHikeDate    string `json:"next_hike_date"`
	HikeCycleMonths int    `json:"hike_cycle_months"`
	ManagerID       *uint  `json:"manager_id"`
	ManagerName     string `json:"manager_name,omitempty"`
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
