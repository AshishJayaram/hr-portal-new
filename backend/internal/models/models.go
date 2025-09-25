package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// BaseModel contains common fields for all models
type BaseModel struct {
	ID        uint           `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"deleted_at,omitempty" gorm:"index"`
}

// Organization represents a company/organization
type Organization struct {
	BaseModel
	Name     string `json:"name" gorm:"not null"`
	Domain   string `json:"domain" gorm:"unique"`
	Settings string `json:"settings" gorm:"type:jsonb"` // JSON string for company settings
	IsActive bool   `json:"is_active" gorm:"default:true"`

	// Relationships
	Users           []User          `json:"users,omitempty" gorm:"foreignKey:OrganizationID"`
	Documents       []Document      `json:"documents,omitempty" gorm:"foreignKey:OrganizationID"`
	SalarySlips     []SalarySlip    `json:"salary_slips,omitempty" gorm:"foreignKey:OrganizationID"`
	Holidays        []Holiday       `json:"holidays,omitempty" gorm:"foreignKey:OrganizationID"`
	LeaveCategories []LeaveCategory `json:"leave_categories,omitempty" gorm:"foreignKey:OrganizationID"`
}

// User represents a user in the system
type User struct {
	BaseModel
	OrganizationID uint       `json:"organization_id" gorm:"not null;index"`
	Username       string     `json:"username" gorm:"not null;uniqueIndex:idx_username_org,where:deleted_at IS NULL"`
	Email          string     `json:"email" gorm:"not null;uniqueIndex:idx_email_org,where:deleted_at IS NULL"`
	PasswordHash   string     `json:"-" gorm:"not null"`
	Name           string     `json:"name" gorm:"not null"`
	Designation    string     `json:"designation"`
	Department     string     `json:"department" gorm:"not null"`
	Role           string     `json:"role" gorm:"not null;check:role IN ('Employee','Manager','HR','Admin','God')"`
	ManagerID      *uint      `json:"manager_id" gorm:"index"`
	CTC            float64    `json:"ctc" gorm:"default:0"`
	IsActive       bool       `json:"is_active" gorm:"default:true"`
	LastLoginAt    *time.Time `json:"last_login_at"`

	// Relationships
	Organization     Organization      `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
	Manager          *User             `json:"manager,omitempty" gorm:"foreignKey:ManagerID"`
	Subordinates     []User            `json:"subordinates,omitempty" gorm:"foreignKey:ManagerID"`
	Leaves           []Leave           `json:"leaves,omitempty" gorm:"foreignKey:UserID"`
	LeaveAllocations []LeaveAllocation `json:"leave_allocations,omitempty" gorm:"foreignKey:UserID"`
	Documents        []Document        `json:"documents,omitempty" gorm:"foreignKey:UserID"`
	SalarySlips      []SalarySlip      `json:"salary_slips,omitempty" gorm:"foreignKey:UserID"`
}

// LeaveCategory represents different types of leaves
type LeaveCategory struct {
	BaseModel
	OrganizationID   uuid.UUID `json:"organization_id" gorm:"type:uuid;not null;index"`
	Name             string    `json:"name" gorm:"not null"`
	Description      string    `json:"description"`
	MaxDaysPerYear   int       `json:"max_days_per_year" gorm:"default:0"`
	RequiresApproval bool      `json:"requires_approval" gorm:"default:true"`
	IsActive         bool      `json:"is_active" gorm:"default:true"`

	// Relationships
	Organization     Organization      `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
	LeaveAllocations []LeaveAllocation `json:"leave_allocations,omitempty" gorm:"foreignKey:CategoryID"`
	Leaves           []Leave           `json:"leaves,omitempty" gorm:"foreignKey:CategoryID"`
}

// LeaveAllocation represents annual leave allocation for a user
type LeaveAllocation struct {
	BaseModel
	UserID         uuid.UUID `json:"user_id" gorm:"type:uuid;not null;index"`
	CategoryID     uuid.UUID `json:"category_id" gorm:"type:uuid;not null;index"`
	OrganizationID uuid.UUID `json:"organization_id" gorm:"type:uuid;not null;index"`
	CategoryName   string    `json:"category_name" gorm:"not null"`
	TotalDays      int       `json:"total_days" gorm:"not null"`
	UsedDays       int       `json:"used_days" gorm:"default:0"`
	RemainingDays  int       `json:"remaining_days" gorm:"not null"`
	Year           int       `json:"year" gorm:"not null;index"`

	// Relationships
	User         User          `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Category     LeaveCategory `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
	Organization Organization  `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
}

// Leave represents a leave request
type Leave struct {
	BaseModel
	UserID          uuid.UUID  `json:"user_id" gorm:"type:uuid;not null;index"`
	CategoryID      uuid.UUID  `json:"category_id" gorm:"type:uuid;not null;index"`
	OrganizationID  uuid.UUID  `json:"organization_id" gorm:"type:uuid;not null;index"`
	Type            string     `json:"type" gorm:"not null"`
	Reason          string     `json:"reason"`
	FromDate        time.Time  `json:"from_date" gorm:"not null"`
	ToDate          time.Time  `json:"to_date" gorm:"not null"`
	Days            float64    `json:"days" gorm:"not null"`
	Status          string     `json:"status" gorm:"not null;default:'pending';check:status IN ('pending','approved','rejected','cancelled')"`
	ApprovedBy      *uuid.UUID `json:"approved_by" gorm:"type:uuid;index"`
	ApprovedAt      *time.Time `json:"approved_at"`
	RejectedBy      *uuid.UUID `json:"rejected_by" gorm:"type:uuid;index"`
	RejectedAt      *time.Time `json:"rejected_at"`
	RejectionReason *string    `json:"rejection_reason"`

	// Relationships
	User         User          `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Category     LeaveCategory `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
	Organization Organization  `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
	Approver     *User         `json:"approver,omitempty" gorm:"foreignKey:ApprovedBy"`
	Rejecter     *User         `json:"rejecter,omitempty" gorm:"foreignKey:RejectedBy"`
}

// Document represents uploaded documents
type Document struct {
	BaseModel
	UserID         uuid.UUID `json:"user_id" gorm:"type:uuid;not null;index"`
	OrganizationID uuid.UUID `json:"organization_id" gorm:"type:uuid;not null;index"`
	Title          string    `json:"title" gorm:"not null"`
	Category       string    `json:"category" gorm:"not null"`
	FileName       string    `json:"file_name" gorm:"not null"`
	FilePath       string    `json:"file_path" gorm:"not null"`
	FileSize       int64     `json:"file_size" gorm:"not null"`
	MimeType       string    `json:"mime_type" gorm:"not null"`
	IsPublic       bool      `json:"is_public" gorm:"default:false"`

	// Relationships
	User         User         `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Organization Organization `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
}

// SalarySlip represents salary slip records
type SalarySlip struct {
	BaseModel
	UserID         uuid.UUID `json:"user_id" gorm:"type:uuid;not null;index"`
	OrganizationID uuid.UUID `json:"organization_id" gorm:"type:uuid;not null;index"`
	Month          int       `json:"month" gorm:"not null;check:month >= 1 AND month <= 12"`
	Year           int       `json:"year" gorm:"not null"`
	FileName       string    `json:"file_name" gorm:"not null"`
	FilePath       string    `json:"file_path" gorm:"not null"`
	FileSize       int64     `json:"file_size" gorm:"not null"`
	MimeType       string    `json:"mime_type" gorm:"not null"`

	// Relationships
	User         User         `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Organization Organization `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
}

// Holiday represents company holidays, events, and notices
type Holiday struct {
	BaseModel
	OrganizationID  uuid.UUID  `json:"organization_id" gorm:"type:uuid;not null;index"`
	Name            string     `json:"name" gorm:"not null"`
	Date            *time.Time `json:"date"` // Optional for notices
	Type            string     `json:"type" gorm:"not null;check:type IN ('holiday','event','notice')"`
	Description     string     `json:"description"`
	IsCalendarEvent bool       `json:"is_calendar_event" gorm:"default:true"`
	Color           string     `json:"color" gorm:"default:'#ef4444'"`

	// Relationships
	Organization Organization `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
}

// CompanySettings represents company-specific settings
type CompanySettings struct {
	BaseModel
	OrganizationID uuid.UUID `json:"organization_id" gorm:"type:uuid;not null;uniqueIndex"`
	Settings       string    `json:"settings" gorm:"type:jsonb;not null"` // JSON string for payroll settings

	// Relationships
	Organization Organization `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
}

// TableName methods for custom table names
func (Organization) TableName() string {
	return "organizations"
}

func (User) TableName() string {
	return "users"
}

func (LeaveCategory) TableName() string {
	return "leave_categories"
}

func (LeaveAllocation) TableName() string {
	return "leave_allocations"
}

func (Leave) TableName() string {
	return "leaves"
}

func (Document) TableName() string {
	return "documents"
}

func (SalarySlip) TableName() string {
	return "salary_slips"
}

func (Holiday) TableName() string {
	return "holidays"
}

func (CompanySettings) TableName() string {
	return "company_settings"
}

// BeforeCreate hooks for GORM - removed since we're using auto-increment integers

// BeforeCreate hooks removed - using auto-increment integers

// Update hooks
func (la *LeaveAllocation) BeforeUpdate(tx *gorm.DB) error {
	la.RemainingDays = la.TotalDays - la.UsedDays
	return nil
}
