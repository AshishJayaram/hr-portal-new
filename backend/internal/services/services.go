package services

import (
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
}

// New creates a new instance of Services
func New(repos *repositories.Repositories, cfg *config.Config) *Services {
	return &Services{
		User:            NewUserService(repos.User, repos.Organization),
		Auth:            NewAuthService(repos.User, repos.Organization, cfg.JWT),
		Leave:           NewLeaveService(repos.Leave, repos.User, repos.LeaveCategory),
		LeaveCategory:   NewLeaveCategoryService(repos.LeaveCategory),
		LeaveAllocation: NewLeaveAllocationService(repos.LeaveAllocation, repos.LeaveCategory),
		Document:        NewDocumentService(repos.Document),
		SalarySlip:      NewSalarySlipService(repos.SalarySlip),
		Holiday:         NewHolidayService(repos.Holiday),
		CompanySettings: NewCompanySettingsService(repos.CompanySettings),
		Dashboard:       NewDashboardService(repos),
		Organization:    NewOrganizationService(repos.Organization),
	}
}

// UserService interface for user business logic
type UserService interface {
	CreateUser(req CreateUserRequest) (*models.User, error)
	GetUser(id string) (*models.User, error)
	ListUsers(organizationID string, filters map[string]interface{}) ([]models.User, error)
	UpdateUser(id string, req UpdateUserRequest) (*models.User, error)
	DeleteUser(id string) error
	ChangePassword(userID, currentPassword, newPassword string) error
	IsSubordinate(organizationID, managerID, subordinateID string) (bool, error)
	GetSubordinates(organizationID, managerID string) ([]models.User, error)
	Count(count *int64) error
	ListAll() ([]models.User, error)
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

// LeaveService interface for leave business logic
type LeaveService interface {
	ApplyLeave(req ApplyLeaveRequest) (*models.Leave, error)
	GetLeave(id string) (*models.Leave, error)
	ListLeaves(organizationID string, filters map[string]interface{}) ([]models.Leave, error)
	UpdateLeave(id string, req UpdateLeaveRequest) (*models.Leave, error)
	ApproveLeave(id, approverID string) (*models.Leave, error)
	RejectLeave(id, rejecterID, reason string) (*models.Leave, error)
	GetLeaveBalance(userID string) ([]LeaveBalanceResponse, error)
	CancelLeave(id, userID string) (*models.Leave, error)
}

// LeaveCategoryService interface for leave category business logic
type LeaveCategoryService interface {
	CreateCategory(req CreateLeaveCategoryRequest) (*models.LeaveCategory, error)
	GetCategory(id string) (*models.LeaveCategory, error)
	ListCategories(organizationID string) ([]models.LeaveCategory, error)
	UpdateCategory(id string, req UpdateLeaveCategoryRequest) (*models.LeaveCategory, error)
	DeleteCategory(id string) error
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

// DocumentService interface for document business logic
type DocumentService interface {
	UploadDocument(req UploadDocumentRequest) (*models.Document, error)
	GetDocument(id string) (*models.Document, error)
	ListDocuments(organizationID string, filters map[string]interface{}) ([]models.Document, error)
	DeleteDocument(id string) error
	GetUserDocuments(userID string) ([]models.Document, error)
}

// SalarySlipService interface for salary slip business logic
type SalarySlipService interface {
	UploadSalarySlip(req UploadSalarySlipRequest) (*models.SalarySlip, error)
	GetSalarySlip(id string) (*models.SalarySlip, error)
	ListSalarySlips(organizationID string, filters map[string]interface{}) ([]models.SalarySlip, error)
	DeleteSalarySlip(id string) error
	GetUserSalarySlips(userID string) ([]models.SalarySlip, error)
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
	Username       string `json:"username" validate:"required"`
	Password       string `json:"password" validate:"required"`
	OrganizationID string `json:"organization_id" validate:"required"`
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
}

type UpdateLeaveRequest struct {
	Reason *string `json:"reason"`
	Status *string `json:"status"`
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
	OrganizationID   string `json:"organization_id" validate:"required"`
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
	UserID         string `json:"user_id" validate:"required"`
	OrganizationID string `json:"organization_id" validate:"required"`
	Title          string `json:"title" validate:"required"`
	Category       string `json:"category" validate:"required"`
	IsPublic       bool   `json:"is_public"`
}

type UploadSalarySlipRequest struct {
	UserID         string `json:"user_id" validate:"required"`
	OrganizationID string `json:"organization_id" validate:"required"`
	Month          int    `json:"month" validate:"required,min=1,max=12"`
	Year           int    `json:"year" validate:"required"`
}

type CreateHolidayRequest struct {
	OrganizationID  string     `json:"organization_id" validate:"required"`
	Name            string     `json:"name" validate:"required"`
	Date            *time.Time `json:"date"`
	Type            string     `json:"type" validate:"required,oneof=holiday event notice"`
	Description     string     `json:"description"`
	IsCalendarEvent bool       `json:"is_calendar_event"`
	Color           string     `json:"color"`
}

type UpdateHolidayRequest struct {
	Name            *string    `json:"name"`
	Date            *time.Time `json:"date"`
	Type            *string    `json:"type"`
	Description     *string    `json:"description"`
	IsCalendarEvent *bool      `json:"is_calendar_event"`
	Color           *string    `json:"color"`
}

type UpdateCompanySettingsRequest struct {
	Settings string `json:"settings" validate:"required"`
}

type DashboardStatsResponse struct {
	TotalUsers       int64                  `json:"total_users"`
	TotalLeaves      int64                  `json:"total_leaves"`
	PendingLeaves    int64                  `json:"pending_leaves"`
	TotalDocuments   int64                  `json:"total_documents"`
	UpcomingHolidays []models.Holiday       `json:"upcoming_holidays"`
	RecentLeaves     []models.Leave         `json:"recent_leaves"`
	RecentDocuments  []models.Document      `json:"recent_documents"`
	LeaveBalances    []LeaveBalanceResponse `json:"leave_balances"`
}
