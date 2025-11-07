package models

import (
	"database/sql/driver"
	"fmt"
	"time"

	"gorm.io/gorm"
)

// FlexibleTime handles both string and time.Time values from database
type FlexibleTime struct {
	time.Time
}

// Scan implements the Scanner interface for database/sql
func (ft *FlexibleTime) Scan(value interface{}) error {
	if value == nil {
		ft.Time = time.Time{}
		return nil
	}

	switch v := value.(type) {
	case time.Time:
		ft.Time = v
	case string:
		// Try to parse the string as a time
		if parsed, err := time.Parse("2006-01-02 15:04:05-07:00", v); err == nil {
			ft.Time = parsed
		} else if parsed, err := time.Parse("2006-01-02T15:04:05Z07:00", v); err == nil {
			ft.Time = parsed
		} else if parsed, err := time.Parse("2006-01-02", v); err == nil {
			ft.Time = parsed
		} else {
			return err
		}
	default:
		return fmt.Errorf("cannot scan %T into FlexibleTime", value)
	}
	return nil
}

// Value implements the driver Valuer interface
func (ft FlexibleTime) Value() (driver.Value, error) {
	if ft.Time.IsZero() {
		return nil, nil
	}
	return ft.Time, nil
}

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
	Logo     string `json:"logo" gorm:"default:''"`     // URL to uploaded logo file
	Settings string `json:"settings" gorm:"type:jsonb"` // JSON string for company settings
	IsActive bool   `json:"is_active" gorm:"default:true"`

	// Relationships
	Users           []User           `json:"users,omitempty" gorm:"foreignKey:OrganizationID"`
	Documents       []Document       `json:"documents,omitempty" gorm:"foreignKey:OrganizationID"`
	SalarySlips     []SalarySlip     `json:"salary_slips,omitempty" gorm:"foreignKey:OrganizationID"`
	Holidays        []Holiday        `json:"holidays,omitempty" gorm:"foreignKey:OrganizationID"`
	LeaveCategories []LeaveCategory  `json:"leave_categories,omitempty" gorm:"foreignKey:OrganizationID"`
	Reimbursements  []Reimbursement  `json:"reimbursements,omitempty" gorm:"foreignKey:OrganizationID"`
	Feedback        []Feedback       `json:"feedback,omitempty" gorm:"foreignKey:OrganizationID"`
	EmployeeGrowth  []EmployeeGrowth `json:"employee_growth,omitempty" gorm:"foreignKey:OrganizationID"`
	OffSites        []OffSite        `json:"off_sites,omitempty" gorm:"foreignKey:OrganizationID"`
}

// User represents a user in the system
type User struct {
	BaseModel
	OrganizationID  uint       `json:"organization_id" gorm:"not null;index"`
	Username        string     `json:"username" gorm:"not null;uniqueIndex:idx_username_org,where:deleted_at IS NULL"`
	Email           string     `json:"email" gorm:"not null;uniqueIndex:idx_email_org,where:deleted_at IS NULL"`
	PasswordHash    string     `json:"-" gorm:"not null"`
	Name            string     `json:"name" gorm:"not null"`
	Designation     string     `json:"designation"`
	Department      string     `json:"department" gorm:"not null"`
	Role            string     `json:"role" gorm:"not null;check:role IN ('Employee','HR','Admin','God')"`
	ManagerID       *uint      `json:"manager_id" gorm:"index"`
	EmployeeID      string     `json:"employee_id" gorm:"size:50"`           // Employee ID (e.g., EMP001) - unique per organization (enforced by idx_employee_id_org)
	CTC             string     `json:"ctc" gorm:"default:''"`                // Encrypted CTC value
	Phone           string     `json:"phone" gorm:"size:20"`                 // For WhatsApp notifications
	JoiningDate     *time.Time `json:"joining_date"`                         // Employee joining date for KRA calculations
	Birthday        *time.Time `json:"birthday"`                             // Employee birthday (date only)
	BirthdayVisible bool       `json:"birthday_visible" gorm:"default:true"` // Whether birthday is visible to others
	HikeCycleMonths int        `json:"hike_cycle_months" gorm:"default:12"`  // Hike cycle in months (e.g., 12 for annual)
	LastHikeDate    *time.Time `json:"last_hike_date"`                       // Last hike date
	NextHikeDate    *time.Time `json:"next_hike_date"`                       // Next hike date (calculated)
	IsActive        bool       `json:"is_active" gorm:"default:true"`
	LastLoginAt     *time.Time `json:"last_login_at"`

	// Relationships
	Organization     Organization      `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
	Manager          *User             `json:"manager,omitempty" gorm:"foreignKey:ManagerID"`
	Subordinates     []User            `json:"subordinates,omitempty" gorm:"foreignKey:ManagerID"`
	Leaves           []Leave           `json:"leaves,omitempty" gorm:"foreignKey:UserID"`
	LeaveAllocations []LeaveAllocation `json:"leave_allocations,omitempty" gorm:"foreignKey:UserID"`
	Documents        []Document        `json:"documents,omitempty" gorm:"foreignKey:UserID"`
	SalarySlips      []SalarySlip      `json:"salary_slips,omitempty" gorm:"foreignKey:UserID"`
	Reimbursements   []Reimbursement   `json:"reimbursements,omitempty" gorm:"foreignKey:UserID"`
	Feedback         []Feedback        `json:"feedback,omitempty" gorm:"foreignKey:UserID"`
	EmployeeGrowth   []EmployeeGrowth  `json:"employee_growth,omitempty" gorm:"foreignKey:UserID"`
	OffSites         []OffSite         `json:"off_sites,omitempty" gorm:"foreignKey:UserID"`
	KRAs             []KRA             `json:"kras,omitempty" gorm:"foreignKey:UserID"`
}

// LeaveCategory represents different types of leaves
type LeaveCategory struct {
	BaseModel
	OrganizationID   uint   `json:"organization_id" gorm:"not null;index"`
	Name             string `json:"name" gorm:"not null"`
	Description      string `json:"description"`
	DefaultDays      int    `json:"default_days" gorm:"default:0"`
	MaxDaysPerYear   int    `json:"max_days_per_year" gorm:"default:0"`
	RequiresApproval bool   `json:"requires_approval" gorm:"default:true"`
	IsActive         bool   `json:"is_active" gorm:"default:true"`

	// Relationships
	Organization     Organization      `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
	LeaveAllocations []LeaveAllocation `json:"leave_allocations,omitempty" gorm:"foreignKey:CategoryID"`
	Leaves           []Leave           `json:"leaves,omitempty" gorm:"foreignKey:CategoryID"`
}

// LeaveAllocation represents annual leave allocation for a user
type LeaveAllocation struct {
	BaseModel
	UserID         uint   `json:"user_id" gorm:"not null;index"`
	CategoryID     uint   `json:"category_id" gorm:"not null;index"`
	OrganizationID uint   `json:"organization_id" gorm:"not null;index"`
	CategoryName   string `json:"category_name" gorm:"not null"`
	TotalDays      int    `json:"total_days" gorm:"not null"`
	UsedDays       int    `json:"used_days" gorm:"default:0"`
	RemainingDays  int    `json:"remaining_days" gorm:"not null"`
	Year           int    `json:"year" gorm:"not null;index"`

	// Relationships
	User         User          `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Category     LeaveCategory `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
	Organization Organization  `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
}

// LOPTracking represents annual LOP tracking for a user
type LOPTracking struct {
	BaseModel
	UserID         uint `json:"user_id" gorm:"not null;index"`
	OrganizationID uint `json:"organization_id" gorm:"not null;index"`
	Year           int  `json:"year" gorm:"not null;index"`
	TotalLOPDays   int  `json:"total_lop_days" gorm:"default:0"`

	// Relationships
	User         User         `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Organization Organization `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
}

// Leave represents a leave request
type Leave struct {
	BaseModel
	UserID          uint       `json:"user_id" gorm:"not null;index"`
	CategoryID      uint       `json:"category_id" gorm:"not null;index"`
	OrganizationID  uint       `json:"organization_id" gorm:"not null;index"`
	Type            string     `json:"type" gorm:"not null"`
	Reason          string     `json:"reason"`
	FromDate        time.Time  `json:"from_date" gorm:"not null"`
	ToDate          time.Time  `json:"to_date" gorm:"not null"`
	Days            float64    `json:"days" gorm:"not null"`
	StartHalf       string     `json:"start_half" gorm:"default:'FULL';check:start_half IN ('FULL','AM','PM')"`
	EndHalf         string     `json:"end_half" gorm:"default:'FULL';check:end_half IN ('FULL','AM','PM')"`
	Status          string     `json:"status" gorm:"not null;default:'pending';check:status IN ('pending','approved','rejected','cancelled')"`
	ApprovedBy      *uint      `json:"approved_by" gorm:"index"`
	ApprovedAt      *time.Time `json:"approved_at"`
	RejectedBy      *uint      `json:"rejected_by" gorm:"index"`
	RejectedAt      *time.Time `json:"rejected_at"`
	RejectionReason *string    `json:"rejection_reason"`

	// LOP (Loss of Pay) tracking fields
	LOPDays             int   `json:"lop_days" gorm:"default:0"`
	SpilloverCategoryID *uint `json:"spillover_category_id" gorm:"index"`
	SpilloverDays       int   `json:"spillover_days" gorm:"default:0"`

	// Relationships
	User              User           `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Category          LeaveCategory  `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
	SpilloverCategory *LeaveCategory `json:"spillover_category,omitempty" gorm:"foreignKey:SpilloverCategoryID"`
	Organization      Organization   `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
	Approver          *User          `json:"approver,omitempty" gorm:"foreignKey:ApprovedBy"`
	Rejecter          *User          `json:"rejecter,omitempty" gorm:"foreignKey:RejectedBy"`
}

// Document represents uploaded documents
type Document struct {
	BaseModel
	UserID         uint   `json:"user_id" gorm:"not null;index"`
	OrganizationID uint   `json:"organization_id" gorm:"not null;index"`
	Title          string `json:"title" gorm:"not null"`
	Category       string `json:"category" gorm:"not null"`
	FileName       string `json:"file_name" gorm:"not null"`
	FilePath       string `json:"file_path" gorm:"not null"`
	FileSize       int64  `json:"file_size" gorm:"not null"`
	MimeType       string `json:"mime_type" gorm:"not null"`
	IsPublic       bool   `json:"is_public" gorm:"default:false"`
	DocumentScope  string `json:"document_scope" gorm:"default:'user_private'"` // public, hr_private, user_private
	FileUrl        string `json:"file_url" gorm:"-"`                            // Computed field, not stored in DB

	// Relationships
	User         User         `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Organization Organization `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
}

// EmployeePrivateDocument represents private documents uploaded from salary slips page
type EmployeePrivateDocument struct {
	BaseModel
	UserID         uint   `json:"user_id" gorm:"not null;index"`
	OrganizationID uint   `json:"organization_id" gorm:"not null;index"`
	Title          string `json:"title" gorm:"not null"`
	FileName       string `json:"file_name" gorm:"not null"`
	FilePath       string `json:"file_path" gorm:"not null"`
	FileSize       int64  `json:"file_size" gorm:"not null"`
	MimeType       string `json:"mime_type" gorm:"not null"`
	FileUrl        string `json:"file_url" gorm:"-"`

	// Relationships
	User         User         `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Organization Organization `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
}

func (EmployeePrivateDocument) TableName() string { return "employee_private_documents" }

// DocumentAcknowledgment represents user acknowledgments for documents
type DocumentAcknowledgment struct {
	BaseModel
	DocumentID     uint      `json:"document_id" gorm:"not null;index"`
	UserID         uint      `json:"user_id" gorm:"not null;index"`
	OrganizationID uint      `json:"organization_id" gorm:"not null;index"`
	AcknowledgedAt time.Time `json:"acknowledged_at" gorm:"not null"`

	// Relationships
	Document     Document     `json:"document,omitempty" gorm:"foreignKey:DocumentID"`
	User         User         `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Organization Organization `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
}

func (DocumentAcknowledgment) TableName() string { return "document_acknowledgments" }

// SalarySlip represents salary slip records
type SalarySlip struct {
	BaseModel
	UserID         uint    `json:"user_id" gorm:"not null;index"`
	OrganizationID uint    `json:"organization_id" gorm:"not null;index"`
	Month          int     `json:"month" gorm:"not null;check:month >= 1 AND month <= 12"`
	Year           int     `json:"year" gorm:"not null"`
	FileName       string  `json:"file_name" gorm:"not null"`
	FilePath       string  `json:"file_path" gorm:"not null"`
	FileSize       int64   `json:"file_size" gorm:"not null"`
	MimeType       string  `json:"mime_type" gorm:"not null"`
	LOPDays        float64 `json:"lop_days" gorm:"default:0"`   // Loss of Pay days
	LOPAmount      float64 `json:"lop_amount" gorm:"default:0"` // Calculated LOP deduction amount
	FileUrl        string  `json:"file_url" gorm:"-"`           // Computed field, not stored in DB

	// Relationships
	User         User         `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Organization Organization `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
}

// Holiday represents company holidays, events, and notices
type Holiday struct {
	BaseModel
	OrganizationID  uint       `json:"organization_id" gorm:"not null;index"`
	Name            string     `json:"name" gorm:"not null"`
	Date            *time.Time `json:"date"`       // Optional for notices, used for single-day events
	DateRange       *string    `json:"date_range"` // Used for multi-day events (e.g., "2024-01-01 to 2024-01-03")
	Type            string     `json:"type" gorm:"not null;check:type IN ('holiday','event','notice')"`
	Description     string     `json:"description"`
	IsCalendarEvent bool       `json:"is_calendar_event" gorm:"default:true"`
	Color           string     `json:"color" gorm:"default:'#ef4444'"`
	MediaUrl        *string    `json:"media_url"`       // URL to uploaded media file
	MediaType       *string    `json:"media_type"`      // Type of media: 'image' or 'video'
	MediaFileName   *string    `json:"media_file_name"` // Original filename

	// Relationships
	Organization Organization `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
}

// CompanySettings represents company-specific settings
type CompanySettings struct {
	BaseModel
	OrganizationID uint   `json:"organization_id" gorm:"not null;uniqueIndex"`
	Settings       string `json:"settings" gorm:"type:jsonb;not null"` // JSON string for payroll settings
	KRASettings    string `json:"kra_settings" gorm:"type:jsonb"`      // JSON string for KRA settings
	Currency       string `json:"currency" gorm:"default:'INR'"`       // Currency code (INR, USD, EUR, etc.)

	// Relationships
	Organization Organization `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
}

// OffSite represents off-site work tracking
type OffSite struct {
	BaseModel
	UserID         uint      `json:"user_id" gorm:"not null;index"`
	OrganizationID uint      `json:"organization_id" gorm:"not null;index"`
	Title          string    `json:"title" gorm:"not null"`
	Description    string    `json:"description"`
	Location       string    `json:"location"`
	StartDate      time.Time `json:"start_date" gorm:"not null"`
	EndDate        time.Time `json:"end_date" gorm:"not null"`
	Type           string    `json:"type" gorm:"not null;check:type IN ('training','meeting','conference','client_visit','other')"`
	Status         string    `json:"status" gorm:"not null;default:'planned';check:status IN ('planned','in_progress','completed','cancelled')"`

	// Relationships
	User         User         `json:"user,omitempty" gorm:"foreignKey:UserID"`
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

func (AuditLog) TableName() string {
	return "audit_logs"
}

func (ReimbursementBill) TableName() string {
	return "reimbursement_bills"
}

func (Reimbursement) TableName() string {
	return "reimbursements"
}

func (Feedback) TableName() string {
	return "feedback"
}

func (EmployeeGrowth) TableName() string {
	return "employee_growth"
}

func (KRA) TableName() string {
	return "kras"
}

// ReimbursementBill represents individual bills within a reimbursement request
type ReimbursementBill struct {
	BaseModel
	ReimbursementID uint   `json:"reimbursement_id" gorm:"not null;index"`
	FileName        string `json:"file_name" gorm:"not null"`
	FilePath        string `json:"file_path" gorm:"not null"`
	FileSize        int64  `json:"file_size" gorm:"not null"`
	MimeType        string `json:"mime_type" gorm:"not null"`
	FileUrl         string `json:"file_url" gorm:"-"` // Computed field, not stored in DB

	// Relationships
	Reimbursement Reimbursement `json:"reimbursement,omitempty" gorm:"foreignKey:ReimbursementID"`
}

// Reimbursement represents a reimbursement request
type Reimbursement struct {
	BaseModel
	UserID          uint       `json:"user_id" gorm:"not null;index"`
	OrganizationID  uint       `json:"organization_id" gorm:"not null;index"`
	Reason          string     `json:"reason" gorm:"not null"` // Reasoning for payment
	Description     string     `json:"description"`            // Detailed description of the expense
	Amount          float64    `json:"amount" gorm:"not null"` // Total amount
	Date            time.Time  `json:"date" gorm:"not null"`   // Date of expense
	Status          string     `json:"status" gorm:"not null;default:'pending';check:status IN ('pending','approved','rejected','returned')"`
	ApprovedBy      *uint      `json:"approved_by" gorm:"index"`
	ApprovedAt      *time.Time `json:"approved_at"`
	RejectedBy      *uint      `json:"rejected_by" gorm:"index"`
	RejectedAt      *time.Time `json:"rejected_at"`
	RejectionReason *string    `json:"rejection_reason"`
	ReturnedBy      *uint      `json:"returned_by" gorm:"index"`
	ReturnedAt      *time.Time `json:"returned_at"`
	ReturnReason    *string    `json:"return_reason"`

	// Relationships
	User         User                `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Organization Organization        `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
	Approver     *User               `json:"approver,omitempty" gorm:"foreignKey:ApprovedBy"`
	Rejecter     *User               `json:"rejecter,omitempty" gorm:"foreignKey:RejectedBy"`
	Returner     *User               `json:"returner,omitempty" gorm:"foreignKey:ReturnedBy"`
	Bills        []ReimbursementBill `json:"bills,omitempty" gorm:"foreignKey:ReimbursementID"`
}

// Feedback represents bug reports and feedback from users
type Feedback struct {
	BaseModel
	UserID         *uint      `json:"user_id" gorm:"index"` // Nullable to support anonymous feedback
	OrganizationID uint       `json:"organization_id" gorm:"not null;index"`
	IsAnonymous    bool       `json:"is_anonymous" gorm:"default:false"` // Flag for anonymous submissions
	Title          string     `json:"title" gorm:"not null"`
	Description    string     `json:"description" gorm:"not null"`
	Type           string     `json:"type" gorm:"not null;check:type IN ('bug','feature','improvement','other')"`
	Priority       string     `json:"priority" gorm:"not null;default:'medium';check:priority IN ('low','medium','high','critical')"`
	Status         string     `json:"status" gorm:"not null;default:'open';check:status IN ('open','in_progress','resolved','closed')"`
	AssignedTo     *uint      `json:"assigned_to" gorm:"index"`
	Resolution     *string    `json:"resolution"`
	ResolvedAt     *time.Time `json:"resolved_at"`
	ResolvedBy     *uint      `json:"resolved_by" gorm:"index"`

	// Relationships
	User         *User        `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Organization Organization `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
	Assignee     *User        `json:"assignee,omitempty" gorm:"foreignKey:AssignedTo"`
	Resolver     *User        `json:"resolver,omitempty" gorm:"foreignKey:ResolvedBy"`
}

// EmployeeGrowth represents employee growth and development tracking
type EmployeeGrowth struct {
	BaseModel
	UserID         uint      `json:"user_id" gorm:"not null;index"`
	OrganizationID uint      `json:"organization_id" gorm:"not null;index"`
	Title          string    `json:"title" gorm:"not null"`
	Description    string    `json:"description"`
	Type           string    `json:"type" gorm:"not null;check:type IN ('promotion','skill_development','certification','project_completion','achievement','milestone')"`
	Date           time.Time `json:"date" gorm:"not null"`
	AddedBy        uint      `json:"added_by" gorm:"not null;index"`

	// Relationships
	User         User         `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Organization Organization `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
	AddedByUser  User         `json:"added_by_user,omitempty" gorm:"foreignKey:AddedBy"`
}

// KRA represents Key Result Areas for employee performance evaluation
type KRA struct {
	BaseModel
	UserID          uint      `json:"user_id" gorm:"not null;index"`
	OrganizationID  uint      `json:"organization_id" gorm:"not null;index"`
	Year            int       `json:"year" gorm:"not null;index"`
	Title           string    `json:"title" gorm:"not null"`
	Description     string    `json:"description"`
	Weight          float64   `json:"weight" gorm:"not null;default:0"` // Weight percentage (0-100)
	TargetValue     string    `json:"target_value"`                     // Target value or description
	MeasurementUnit string    `json:"measurement_unit"`                 // Unit of measurement (e.g., %, count, rating)
	Status          string    `json:"status" gorm:"not null;default:'draft';check:status IN ('draft','active','completed','cancelled')"`
	SetBy           uint      `json:"set_by" gorm:"not null;index"` // User who set this KRA (manager/HR)
	SetAt           time.Time `json:"set_at" gorm:"not null"`

	// Evaluation fields (filled at year end)
	ActualValue         *string    `json:"actual_value"`                   // Deprecated: use employee_actual_value/manager_actual_value
	EmployeeActualValue *string    `json:"employee_actual_value"`          // Employee-entered actual value
	ManagerActualValue  *string    `json:"manager_actual_value"`           // Manager-entered actual value
	Rating              *float64   `json:"rating"`                         // Manager's rating (1-5 scale)
	Comments            *string    `json:"comments"`                       // Manager's evaluation comments
	EvaluatedBy         *uint      `json:"evaluated_by" gorm:"index"`      // User who evaluated (manager/HR)
	EvaluatedAt         *time.Time `json:"evaluated_at"`                   // When evaluation was completed
	EmployeeComments    *string    `json:"employee_comments"`              // Employee's self-assessment comments
	EmployeeRating      *float64   `json:"employee_rating"`                // Employee's self-rating (1-5 scale)
	EmployeeRatedAt     *time.Time `json:"employee_rated_at"`              // When employee self-rated
	EmployeeRatedBy     *uint      `json:"employee_rated_by" gorm:"index"` // Employee who self-rated

	// Visibility controls
	ManagerFeedbackVisible *bool `json:"manager_feedback_visible" gorm:"default:false"` // Whether manager feedback is visible to employee

	// Relationships
	User          User         `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Organization  Organization `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
	SetByUser     User         `json:"set_by_user,omitempty" gorm:"foreignKey:SetBy"`
	Evaluator     *User        `json:"evaluator,omitempty" gorm:"foreignKey:EvaluatedBy"`
	EmployeeRater *User        `json:"employee_rater,omitempty" gorm:"foreignKey:EmployeeRatedBy"`
}

// AuditLog represents audit trail logs for tracking changes
type AuditLog struct {
	BaseModel
	OrganizationID uint      `json:"organization_id" gorm:"not null;index"`
	Action         string    `json:"action" gorm:"not null"`                 // "CREATE", "UPDATE", "DELETE"
	EntityType     string    `json:"entity_type" gorm:"not null"`            // "USER", "DOCUMENT", "LEAVE", "SALARY_SLIP", etc.
	EntityID       string    `json:"entity_id" gorm:"not null"`              // ID of the affected entity
	ChangedBy      uint      `json:"changed_by" gorm:"not null;index"`       // User who made the change
	ChangeSummary  string    `json:"change_summary" gorm:"not null"`         // Brief description of change
	OldValues      *string   `json:"old_values,omitempty" gorm:"type:jsonb"` // JSON of old values (optional)
	NewValues      *string   `json:"new_values,omitempty" gorm:"type:jsonb"` // JSON of new values (optional)
	IPAddress      string    `json:"ip_address"`
	UserAgent      string    `json:"user_agent"`
	CreatedAt      time.Time `json:"created_at"`

	// Relationships
	Organization  Organization `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
	ChangedByUser *User        `json:"changed_by_user,omitempty" gorm:"foreignKey:ChangedBy"`
}

// BeforeCreate hooks for GORM - removed since we're using auto-increment integers

// BeforeCreate hooks removed - using auto-increment integers

// Update hooks
func (la *LeaveAllocation) BeforeUpdate(tx *gorm.DB) error {
	la.RemainingDays = la.TotalDays - la.UsedDays
	return nil
}

// PasswordResetToken represents a password reset token
type PasswordResetToken struct {
	BaseModel
	UserID    uint      `json:"user_id" gorm:"not null;index"`
	Token     string    `json:"token" gorm:"not null;uniqueIndex;size:255"`
	ExpiresAt time.Time `json:"expires_at" gorm:"not null"`
	Used      bool      `json:"used" gorm:"default:false"`

	// Relationships
	User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// OTPToken represents an OTP token for email-based login
type OTPToken struct {
	BaseModel
	UserID    uint      `json:"user_id" gorm:"not null;index"`
	Email     string    `json:"email" gorm:"not null;index"`
	OTP       string    `json:"otp" gorm:"not null;size:6"`
	ExpiresAt time.Time `json:"expires_at" gorm:"not null"`
	Used      bool      `json:"used" gorm:"default:false"`

	// Relationships
	User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// Designation represents a job designation/position
type Designation struct {
	BaseModel
	OrganizationID uint   `json:"organization_id" gorm:"not null;index"`
	Name           string `json:"name" gorm:"not null;size:255"`
	Description    string `json:"description" gorm:"type:text"`
	IsActive       bool   `json:"is_active" gorm:"default:true"`

	// Relationships
	Organization Organization `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
}

// Department represents a department within an organization
type Department struct {
	BaseModel
	OrganizationID uint   `json:"organization_id" gorm:"not null;index"`
	Name           string `json:"name" gorm:"not null;size:255"`
	Description    string `json:"description" gorm:"type:text"`
	IsActive       bool   `json:"is_active" gorm:"default:true"`

	// Relationships
	Organization Organization `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
}

func (Designation) TableName() string {
	return "designations"
}

func (Department) TableName() string {
	return "departments"
}
