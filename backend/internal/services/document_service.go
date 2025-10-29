package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
)

// documentService implements DocumentService interface
type documentService struct {
	repo                repositories.DocumentRepository
	auditService        AuditService
	notificationService NotificationService
}

func NewDocumentService(repo repositories.DocumentRepository, auditService AuditService, notificationService NotificationService) DocumentService {
	return &documentService{
		repo:                repo,
		auditService:        auditService,
		notificationService: notificationService,
	}
}

func (s *documentService) UploadDocument(req UploadDocumentRequest, httpReq *http.Request) (*models.Document, error) {
	// Convert string IDs to uint
	userID, err := strconv.ParseUint(req.UserID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	orgID, err := strconv.ParseUint(req.OrganizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	// Handle file upload
	if req.FileHeader == nil {
		return nil, fmt.Errorf("no file provided")
	}

	// Validate file type
	if !s.isValidFileType(req.FileHeader.Header.Get("Content-Type"), req.FileHeader.Filename) {
		return nil, fmt.Errorf("unsupported file type. Allowed types: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, JPEG, PNG")
	}

	// Generate unique filename - sanitize to remove invalid characters
	sanitizeFilename := func(name string) string {
		// Replace spaces and other problematic characters
		name = strings.ReplaceAll(name, " ", "_")
		name = strings.ReplaceAll(name, "/", "_")
		name = strings.ReplaceAll(name, "\\", "_")
		name = strings.ReplaceAll(name, ":", "_")
		name = strings.ReplaceAll(name, "*", "_")
		name = strings.ReplaceAll(name, "?", "_")
		name = strings.ReplaceAll(name, "\"", "_")
		name = strings.ReplaceAll(name, "<", "_")
		name = strings.ReplaceAll(name, ">", "_")
		name = strings.ReplaceAll(name, "|", "_")
		return name
	}
	filename := fmt.Sprintf("%d_%s_%s",
		time.Now().Unix(),
		sanitizeFilename(req.Title),
		sanitizeFilename(req.FileHeader.Filename))

	// Create upload directory if it doesn't exist
	uploadDir := "uploads/documents"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create upload directory: %w", err)
	}

	// Save file to disk
	filePath := uploadDir + "/" + filename
	file, err := os.Create(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	src, err := req.FileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	_, err = io.Copy(file, src)
	if err != nil {
		return nil, fmt.Errorf("failed to save file: %w", err)
	}

	// Get file info
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to get file info: %w", err)
	}

	// Determine document scope based on isPublic and category
	documentScope := "user_private" // Default to user_private for non-public
	if req.IsPublic {
		documentScope = "public"
	} else if strings.EqualFold(req.Category, "hr_private") {
		// Explicit HR private category
		documentScope = "hr_private"
	}

	document := &models.Document{
		UserID:         uint(userID),
		OrganizationID: uint(orgID),
		Title:          req.Title,
		Category:       req.Category,
		IsPublic:       req.IsPublic,
		DocumentScope:  documentScope,
		FileName:       req.FileHeader.Filename,
		FilePath:       filePath,
		FileSize:       fileInfo.Size(),
		MimeType:       req.FileHeader.Header.Get("Content-Type"),
	}

	err = s.repo.Create(document)
	if err != nil {
		return nil, fmt.Errorf("failed to create document: %w", err)
	}

	// Log audit entry for document upload
	orgIDStr := strconv.FormatUint(uint64(document.OrganizationID), 10)
	documentIDStr := strconv.FormatUint(uint64(document.ID), 10)

	// Get current user from request context
	changedBy := "19" // Default fallback
	if httpReq != nil {
		if userID := httpReq.Header.Get("X-User-ID"); userID != "" {
			changedBy = userID
		}
	}

	// Log the document upload
	changeSummary := fmt.Sprintf("Document '%s' uploaded for user", document.Title)
	if err := s.auditService.LogDocumentChange(orgIDStr, documentIDStr, changedBy, "CREATE", changeSummary, httpReq); err != nil {
		fmt.Printf("Failed to log audit: %v\n", err)
	}

	// Send notification to the user if it's a private document
	if !req.IsPublic && document.User.Name != "" {
		s.notificationService.SendDocumentUploadNotification(document, &document.User)
	}

	return document, nil
}

func (s *documentService) GetDocument(id string) (*models.Document, error) {
	return s.repo.GetByID(id)
}

func (s *documentService) ListDocuments(organizationID string, filters map[string]interface{}) ([]models.Document, error) {
	return s.repo.List(organizationID, filters)
}

func (s *documentService) DeleteDocument(id string, httpReq *http.Request) error {
	// Get document before deletion for audit logging and file deletion
	document, err := s.repo.GetByID(id)
	if err != nil {
		return fmt.Errorf("failed to get document: %w", err)
	}

	// Delete the actual file from disk
	if document.FilePath != "" {
		if err := os.Remove(document.FilePath); err != nil {
			// Log error but continue with database deletion
			fmt.Printf("Warning: Failed to delete file %s: %v\n", document.FilePath, err)
		}
	}

	err = s.repo.Delete(id)
	if err != nil {
		return fmt.Errorf("failed to delete document: %w", err)
	}

	// Log audit entry for document deletion
	orgIDStr := strconv.FormatUint(uint64(document.OrganizationID), 10)

	// Get current user from request context
	changedBy := "19" // Default fallback
	if httpReq != nil {
		if userID := httpReq.Header.Get("X-User-ID"); userID != "" {
			changedBy = userID
		}
	}

	// Log the document deletion
	changeSummary := fmt.Sprintf("Document '%s' deleted", document.Title)
	if err := s.auditService.LogDocumentChange(orgIDStr, id, changedBy, "DELETE", changeSummary, httpReq); err != nil {
		fmt.Printf("Failed to log audit: %v\n", err)
	}

	return nil
}

func (s *documentService) GetUserDocuments(userID string) ([]models.Document, error) {
	return s.repo.GetByUserID(userID)
}

func (s *documentService) DownloadDocument(id string) ([]byte, error) {
	// TODO: Implement document download logic
	return nil, fmt.Errorf("not implemented")
}

// salarySlipService implements SalarySlipService interface
type salarySlipService struct {
	repo                repositories.SalarySlipRepository
	auditService        AuditService
	notificationService NotificationService
}

func NewSalarySlipService(repo repositories.SalarySlipRepository, auditService AuditService, notificationService NotificationService) SalarySlipService {
	return &salarySlipService{
		repo:                repo,
		auditService:        auditService,
		notificationService: notificationService,
	}
}

func (s *salarySlipService) AddSalarySlip(req UploadSalarySlipRequest, httpReq *http.Request) (*models.SalarySlip, error) {
	// Convert string IDs to uint
	userID, err := strconv.ParseUint(req.UserID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	orgID, err := strconv.ParseUint(req.OrganizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	// Handle file upload
	if req.FileHeader == nil {
		return nil, fmt.Errorf("no file provided")
	}

	// Generate unique filename
	filename := fmt.Sprintf("%d_%04d_%02d_%s",
		time.Now().Unix(),
		req.Year,
		req.Month,
		req.FileHeader.Filename)

	// Create upload directory if it doesn't exist
	uploadDir := "uploads/salary_slips"
	if err = os.MkdirAll(uploadDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create upload directory: %w", err)
	}

	// Save file to disk
	filePath := uploadDir + "/" + filename
	file, err := os.Create(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	src, err := req.FileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	_, err = io.Copy(file, src)
	if err != nil {
		return nil, fmt.Errorf("failed to save file: %w", err)
	}

	// Get file info
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to get file info: %w", err)
	}

	salarySlip := &models.SalarySlip{
		UserID:         uint(userID),
		OrganizationID: uint(orgID),
		Month:          req.Month,
		Year:           req.Year,
		FileName:       req.FileHeader.Filename,
		FilePath:       filePath,
		FileSize:       fileInfo.Size(),
		MimeType:       req.FileHeader.Header.Get("Content-Type"),
		LOPDays:        req.LOPDays,
		LOPAmount:      req.LOPAmount,
	}

	err = s.repo.Create(salarySlip)
	if err != nil {
		return nil, fmt.Errorf("failed to create salary slip: %w", err)
	}

	// Log audit entry for salary slip upload
	orgIDStr := strconv.FormatUint(uint64(salarySlip.OrganizationID), 10)
	salarySlipIDStr := strconv.FormatUint(uint64(salarySlip.ID), 10)

	// Get current user from request context
	changedBy := "19" // Default fallback
	if httpReq != nil {
		if userID := httpReq.Header.Get("X-User-ID"); userID != "" {
			changedBy = userID
		}
	}

	// Log the salary slip upload
	changeSummary := fmt.Sprintf("Salary slip uploaded for %s (%d)", req.Month, req.Year)
	if err := s.auditService.LogSalarySlipChange(orgIDStr, salarySlipIDStr, changedBy, "CREATE", changeSummary, httpReq); err != nil {
		fmt.Printf("Failed to log audit: %v\n", err)
	}

	// Send notification to the user
	if salarySlip.User.Name != "" {
		s.notificationService.SendSalarySlipUploadNotification(salarySlip, &salarySlip.User)
	}

	return salarySlip, nil
}

func (s *salarySlipService) GetSalarySlip(id string) (*models.SalarySlip, error) {
	return s.repo.GetByID(id)
}

func (s *salarySlipService) ListSalarySlips(organizationID string, filters map[string]interface{}) ([]models.SalarySlip, error) {
	return s.repo.List(organizationID, filters)
}

func (s *salarySlipService) DeleteSalarySlip(id string) error {
	return s.repo.Delete(id)
}

func (s *salarySlipService) GetUserSalarySlips(userID string) ([]models.SalarySlip, error) {
	return s.repo.GetByUserID(userID)
}

func (s *salarySlipService) DownloadSalarySlip(id string) ([]byte, error) {
	// TODO: Implement salary slip download logic
	return nil, fmt.Errorf("not implemented")
}

// companySettingsService implements CompanySettingsService interface
type companySettingsService struct {
	repo repositories.CompanySettingsRepository
}

func NewCompanySettingsService(repo repositories.CompanySettingsRepository) CompanySettingsService {
	return &companySettingsService{
		repo: repo,
	}
}

func (s *companySettingsService) GetSettings(organizationID string) (*models.CompanySettings, error) {
	settings, err := s.repo.GetByOrganizationID(organizationID)
	if err != nil {
		// If settings don't exist, return default settings
		orgID, parseErr := strconv.ParseUint(organizationID, 10, 32)
		if parseErr != nil {
			return nil, fmt.Errorf("invalid organization ID: %w", parseErr)
		}

		// Return default settings
		return &models.CompanySettings{
			OrganizationID: uint(orgID),
			Settings:       `{"earnings":{"basic":{"mode":"PERCENT_OF_CTC","value":40},"hra":{"mode":"PERCENT_OF_BASIC","value":50},"medical":{"mode":"FIXED","value":1250},"conveyance":{"mode":"FIXED","value":1600},"lta":{"mode":"FIXED","value":8000},"specialAllowance":{"mode":"REMAINDER"}},"deductions":{"empPF":{"mode":"PERCENT_OF_BASIC","value":12},"professionalTax":{"mode":"FIXED","value":200},"esi":{"mode":"PERCENT_OF_CTC","value":0.75}},"employerPF":{"mode":"PERCENT_OF_BASIC","value":12},"lop":{"calculationMethod":"NET_PAY_BY_DAYS","defaultDaysInMonth":30}}`,
			Currency:       "INR",
		}, nil
	}

	return settings, nil
}

func (s *companySettingsService) UpdateSettings(organizationID string, req UpdateCompanySettingsRequest) (*models.CompanySettings, error) {
	// Parse the settings JSON to extract currency if provided
	var settingsMap map[string]interface{}
	if err := json.Unmarshal([]byte(req.Settings), &settingsMap); err != nil {
		return nil, fmt.Errorf("invalid settings JSON: %w", err)
	}

	// Extract currency from settings if provided
	currency := "INR" // Default currency
	if currencyVal, exists := settingsMap["currency"]; exists {
		if currencyStr, ok := currencyVal.(string); ok {
			currency = currencyStr
		}
		// Remove currency from settings map as it's stored separately
		delete(settingsMap, "currency")
		// Re-marshal the settings without currency
		settingsJSON, err := json.Marshal(settingsMap)
		if err != nil {
			return nil, fmt.Errorf("failed to re-marshal settings: %w", err)
		}
		req.Settings = string(settingsJSON)
	}

	// Get existing settings or create new ones
	settings, err := s.repo.GetByOrganizationID(organizationID)
	if err != nil {
		// If settings don't exist, create new ones
		orgID, parseErr := strconv.ParseUint(organizationID, 10, 32)
		if parseErr != nil {
			return nil, fmt.Errorf("invalid organization ID: %w", parseErr)
		}

		settings = &models.CompanySettings{
			OrganizationID: uint(orgID),
			Settings:       req.Settings,
			Currency:       currency,
		}

		if err := s.repo.Create(settings); err != nil {
			return nil, fmt.Errorf("failed to create company settings: %w", err)
		}
	} else {
		// Update existing settings
		settings.Settings = req.Settings
		settings.Currency = currency
		if err := s.repo.Update(settings); err != nil {
			return nil, fmt.Errorf("failed to update company settings: %w", err)
		}
	}

	return settings, nil
}

func (s *companySettingsService) CreateSettings(organizationID string, req UpdateCompanySettingsRequest) (*models.CompanySettings, error) {
	// TODO: Implement settings creation logic
	return nil, fmt.Errorf("not implemented")
}

// GetKRASettings retrieves KRA settings for an organization
func (s *companySettingsService) GetKRASettings(organizationID string) (*KRASettings, error) {
	settings, err := s.repo.GetByOrganizationID(organizationID)
	if err != nil {
		// Return default KRA settings if none exist
		return s.getDefaultKRASettings(), nil
	}

	if settings.KRASettings == "" {
		return s.getDefaultKRASettings(), nil
	}

	var kraSettings KRASettings
	if err := json.Unmarshal([]byte(settings.KRASettings), &kraSettings); err != nil {
		return nil, fmt.Errorf("failed to parse KRA settings: %w", err)
	}

	return &kraSettings, nil
}

// UpdateKRASettings updates KRA settings for an organization
func (s *companySettingsService) UpdateKRASettings(organizationID string, req UpdateKRASettingsRequest) (*models.CompanySettings, error) {
	// Validate the KRA settings JSON
	var kraSettings KRASettings
	if err := json.Unmarshal([]byte(req.KRASettings), &kraSettings); err != nil {
		return nil, fmt.Errorf("invalid KRA settings JSON: %w", err)
	}

	// Validate KRA settings
	if err := s.validateKRASettings(&kraSettings); err != nil {
		return nil, fmt.Errorf("invalid KRA settings: %w", err)
	}

	// Get existing settings or create new ones
	settings, err := s.repo.GetByOrganizationID(organizationID)
	if err != nil {
		// Create new settings
		orgID, parseErr := strconv.ParseUint(organizationID, 10, 32)
		if parseErr != nil {
			return nil, fmt.Errorf("invalid organization ID: %w", parseErr)
		}

		settings = &models.CompanySettings{
			OrganizationID: uint(orgID),
			Settings:       `{"earnings":{"basic":{"mode":"PERCENT_OF_CTC","value":40},"hra":{"mode":"PERCENT_OF_BASIC","value":50},"medical":{"mode":"FIXED","value":1250},"conveyance":{"mode":"FIXED","value":1600},"lta":{"mode":"FIXED","value":8000},"specialAllowance":{"mode":"REMAINDER"}},"deductions":{"empPF":{"mode":"PERCENT_OF_BASIC","value":12},"professionalTax":{"mode":"FIXED","value":200},"esi":{"mode":"PERCENT_OF_CTC","value":0.75}},"employerPF":{"mode":"PERCENT_OF_BASIC","value":12},"lop":{"calculationMethod":"NET_PAY_BY_DAYS","defaultDaysInMonth":30}}`,
			KRASettings:    req.KRASettings,
			Currency:       "INR",
		}

		if err := s.repo.Create(settings); err != nil {
			return nil, fmt.Errorf("failed to create settings: %w", err)
		}
	} else {
		// Update existing settings
		settings.KRASettings = req.KRASettings
		if err := s.repo.Update(settings); err != nil {
			return nil, fmt.Errorf("failed to update settings: %w", err)
		}
	}

	return settings, nil
}

// getDefaultKRASettings returns default KRA settings
func (s *companySettingsService) getDefaultKRASettings() *KRASettings {
	return &KRASettings{
		DefaultFields: []KRAField{
			{
				ID:          "title",
				Name:        "KRA Title",
				Type:        "text",
				Required:    true,
				Default:     "",
				Placeholder: "Enter KRA title",
				HelpText:    "A clear, concise title for the Key Result Area",
				Order:       1,
			},
			{
				ID:          "description",
				Name:        "Description",
				Type:        "textarea",
				Required:    false,
				Default:     "",
				Placeholder: "Describe the KRA in detail",
				HelpText:    "Detailed description of what this KRA entails",
				Order:       2,
			},
			{
				ID:          "weight",
				Name:        "Weight (%)",
				Type:        "percentage",
				Required:    true,
				Default:     "0",
				Placeholder: "0",
				HelpText:    "Percentage weight of this KRA in overall evaluation",
				Order:       3,
			},
			{
				ID:          "target_value",
				Name:        "Target Value",
				Type:        "text",
				Required:    true,
				Default:     "",
				Placeholder: "Enter target value",
				HelpText:    "The target value to be achieved",
				Order:       4,
			},
			{
				ID:          "measurement_unit",
				Name:        "Measurement Unit",
				Type:        "select",
				Required:    true,
				Default:     "%",
				Options:     []string{"%", "count", "rating", "hours", "days", "currency", "other"},
				Placeholder: "Select unit",
				HelpText:    "Unit of measurement for this KRA",
				Order:       5,
			},
		},
		MeasurementUnits: []string{"%", "count", "rating", "hours", "days", "currency", "other"},
		RatingScale: KRARatingScale{
			Min:  1,
			Max:  5,
			Step: 0.1,
			Labels: map[string]string{
				"1": "Poor",
				"2": "Below Average",
				"3": "Average",
				"4": "Good",
				"5": "Excellent",
			},
			Description: "5-point rating scale for KRA evaluation",
		},
		WeightDistribution: KRAWeightConfig{
			MaxTotalWeight:      100,
			MinIndividualWeight: 1,
			MaxIndividualWeight: 50,
			AllowOverflow:       false,
			AutoDistribute:      false,
		},
		EvaluationCriteria: []KRACriteria{
			{
				ID:          "performance",
				Name:        "Performance",
				Description: "How well the employee performed against the KRA",
				Weight:      70,
				Required:    true,
				Type:        "performance",
			},
			{
				ID:          "behavior",
				Name:        "Behavior",
				Description: "Employee behavior and attitude while working on the KRA",
				Weight:      20,
				Required:    false,
				Type:        "behavior",
			},
			{
				ID:          "skill",
				Name:        "Skill Development",
				Description: "Skills demonstrated or developed while working on the KRA",
				Weight:      10,
				Required:    false,
				Type:        "skill",
			},
		},
		NotificationSettings: KRANotifications{
			ReminderDaysBeforeDue: []int{30, 15, 7, 1},
			NotifyOnCreation:      true,
			NotifyOnEvaluation:    true,
			NotifyOnCompletion:    true,
			EmailTemplates: map[string]string{
				"creation":   "A new KRA has been assigned to you",
				"evaluation": "Your KRA has been evaluated",
				"completion": "Your KRA has been completed",
				"reminder":   "Reminder: Your KRA evaluation is due soon",
			},
		},
	}
}

// validateKRASettings validates KRA settings
func (s *companySettingsService) validateKRASettings(settings *KRASettings) error {
	// Validate default fields
	if len(settings.DefaultFields) == 0 {
		return fmt.Errorf("at least one default field is required")
	}

	// Check for required fields
	hasTitle := false
	hasWeight := false
	hasTarget := false
	hasUnit := false

	for _, field := range settings.DefaultFields {
		if field.ID == "title" {
			hasTitle = true
		}
		if field.ID == "weight" {
			hasWeight = true
		}
		if field.ID == "target_value" {
			hasTarget = true
		}
		if field.ID == "measurement_unit" {
			hasUnit = true
		}
	}

	if !hasTitle {
		return fmt.Errorf("title field is required")
	}
	if !hasWeight {
		return fmt.Errorf("weight field is required")
	}
	if !hasTarget {
		return fmt.Errorf("target_value field is required")
	}
	if !hasUnit {
		return fmt.Errorf("measurement_unit field is required")
	}

	// Validate rating scale
	if settings.RatingScale.Min >= settings.RatingScale.Max {
		return fmt.Errorf("rating scale min must be less than max")
	}
	if settings.RatingScale.Step <= 0 {
		return fmt.Errorf("rating scale step must be positive")
	}

	// Validate weight distribution
	if settings.WeightDistribution.MaxTotalWeight <= 0 {
		return fmt.Errorf("max total weight must be positive")
	}
	if settings.WeightDistribution.MinIndividualWeight < 0 {
		return fmt.Errorf("min individual weight cannot be negative")
	}
	if settings.WeightDistribution.MaxIndividualWeight <= settings.WeightDistribution.MinIndividualWeight {
		return fmt.Errorf("max individual weight must be greater than min individual weight")
	}

	return nil
}

// dashboardService implements DashboardService interface
type dashboardService struct {
	repos *repositories.Repositories
}

func NewDashboardService(repos *repositories.Repositories) DashboardService {
	return &dashboardService{
		repos: repos,
	}
}

func (s *dashboardService) GetStats(organizationID, userID, userRole string) (*DashboardStatsResponse, error) {
	fmt.Printf("DEBUG: GetStats called for org %s, user %s, role %s\n", organizationID, userID, userRole)

	// Get total users count for the organization
	var totalUsers int64
	if err := s.repos.User.CountByOrganization(organizationID, &totalUsers); err != nil {
		fmt.Printf("DEBUG: Error getting user count: %v\n", err)
		return nil, fmt.Errorf("failed to get total users count: %w", err)
	}

	// Get total leaves count for the organization
	var totalLeaves int64
	if err := s.repos.Leave.CountByOrganization(organizationID, &totalLeaves); err != nil {
		return nil, fmt.Errorf("failed to get total leaves count: %w", err)
	}

	// Get pending leaves count for the organization
	var pendingLeaves int64
	if err := s.repos.Leave.CountPendingByOrganization(organizationID, &pendingLeaves); err != nil {
		return nil, fmt.Errorf("failed to get pending leaves count: %w", err)
	}

	// Get approved leaves count for the organization (this month only)
	var approvedLeaves int64
	if err := s.repos.Leave.CountApprovedByOrganization(organizationID, &approvedLeaves); err != nil {
		return nil, fmt.Errorf("failed to get approved leaves count for this month: %w", err)
	}

	// Get total documents count for the organization
	var totalDocuments int64
	if err := s.repos.Document.CountByOrganization(organizationID, &totalDocuments); err != nil {
		return nil, fmt.Errorf("failed to get total documents count: %w", err)
	}

	// Get upcoming holidays for the organization
	holidays, err := s.repos.Holiday.List(organizationID, map[string]interface{}{})
	if err != nil {
		return nil, fmt.Errorf("failed to get holidays: %w", err)
	}

	// Filter upcoming holidays (all future holidays and holidays without specific dates)
	upcomingHolidays := []models.Holiday{}
	now := time.Now()

	for _, holiday := range holidays {
		// Include holidays that are:
		// 1. In the future (have a date and it's after now)
		// 2. Have a date range (multi-day events)
		// 3. Have no specific date (ongoing notices or general holidays)
		shouldInclude := false

		if holiday.Date != nil && holiday.Date.After(now) {
			// Future single-day holiday
			shouldInclude = true
		} else if holiday.DateRange != nil && *holiday.DateRange != "" {
			// Multi-day holiday - check if any part is in the future
			// For now, include all date range holidays
			shouldInclude = true
		} else if holiday.Date == nil && holiday.DateRange == nil {
			// Holiday without specific date (like "Christmas Vacation")
			shouldInclude = true
		}

		if shouldInclude {
			upcomingHolidays = append(upcomingHolidays, holiday)
		}
	}

	// Get recent leaves - role-based access
	var recentLeaves []models.Leave
	if userRole == "HR" || userRole == "Admin" || userRole == "God" {
		// Admin/HR/God can see all leaves in the organization
		recentLeaves, err = s.repos.Leave.List(organizationID, map[string]interface{}{})
		if err != nil {
			return nil, fmt.Errorf("failed to get all leaves: %w", err)
		}
	} else {
		// Regular employees can only see their own leaves
		recentLeaves, err = s.repos.Leave.List(organizationID, map[string]interface{}{
			"user_id": userID,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to get recent leaves: %w", err)
		}
	}

	// Sort by created_at desc and limit to 10
	if len(recentLeaves) > 10 {
		recentLeaves = recentLeaves[:10]
	}

	// Get recent documents using the same logic as Documents page
	filters := make(map[string]interface{})

	// Role-based access control (same as Documents page):
	// - HR/Admin/God can see documents for any user in their organization
	// - Employees can see their own documents + public documents + HR private documents
	if userRole == "HR" || userRole == "Admin" || userRole == "God" {
		// HR/Admin/God can access documents for any user
		// If no requestedUserID specified, show all documents in organization
	} else {
		// Regular employees can see their own documents + public documents + HR private documents
		filters["user_id_or_public"] = userID
	}

	recentDocuments, err := s.repos.Document.List(organizationID, filters)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent documents: %w", err)
	}

	// Sort by created_at desc and limit to 3
	if len(recentDocuments) > 3 {
		recentDocuments = recentDocuments[:3]
	}

	// Get recent salary slips for the current user only
	recentSalarySlips, err := s.repos.SalarySlip.List(organizationID, map[string]interface{}{
		"user_id": userID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get recent salary slips: %w", err)
	}

	// Sort by created_at desc and limit to 3
	if len(recentSalarySlips) > 3 {
		recentSalarySlips = recentSalarySlips[:3]
	}

	// Get leave balances for the current user
	leaveBalances, err := s.getLeaveBalances(organizationID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get leave balances: %w", err)
	}

	// Get recent off-site entries for the current user
	recentOffSites, err := s.repos.OffSite.List(organizationID, map[string]interface{}{
		"user_id": userID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get recent off-sites: %w", err)
	}

	// Sort by created_at desc and limit to 5
	if len(recentOffSites) > 5 {
		recentOffSites = recentOffSites[:5]
	}

	// Get user birthdays for the organization
	userBirthdays, err := s.getUserBirthdays(organizationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user birthdays: %w", err)
	}

	return &DashboardStatsResponse{
		TotalUsers:        totalUsers,
		TotalLeaves:       totalLeaves,
		PendingLeaves:     pendingLeaves,
		ApprovedLeaves:    approvedLeaves,
		TotalDocuments:    totalDocuments,
		UpcomingHolidays:  upcomingHolidays,
		RecentLeaves:      recentLeaves,
		RecentDocuments:   recentDocuments,
		RecentSalarySlips: recentSalarySlips,
		LeaveBalances:     leaveBalances,
		RecentOffSites:    recentOffSites,
		UserBirthdays:     userBirthdays,
	}, nil
}

// getLeaveBalances calculates leave balances for a user
func (s *dashboardService) getLeaveBalances(organizationID, userID string) ([]LeaveBalanceResponse, error) {
	// Get leave allocations for the user
	allocations, err := s.repos.LeaveAllocation.List(organizationID, map[string]interface{}{
		"user_id": userID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get leave allocations: %w", err)
	}

	fmt.Printf("DEBUG: Found %d leave allocations for user %s\n", len(allocations), userID)

	// Get approved leaves for the user
	leaves, err := s.repos.Leave.List(organizationID, map[string]interface{}{
		"user_id": userID,
		"status":  "approved",
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get approved leaves: %w", err)
	}

	// Calculate balances
	var balances []LeaveBalanceResponse
	for _, allocation := range allocations {
		// Calculate used days for this category
		usedDays := 0
		for _, leave := range leaves {
			if leave.CategoryID == allocation.CategoryID {
				usedDays += int(leave.Days)
			}
		}

		// Calculate remaining days
		remainingDays := allocation.TotalDays - usedDays
		if remainingDays < 0 {
			remainingDays = 0
		}

		balances = append(balances, LeaveBalanceResponse{
			CategoryID:    strconv.FormatUint(uint64(allocation.CategoryID), 10),
			CategoryName:  allocation.CategoryName,
			TotalDays:     allocation.TotalDays,
			UsedDays:      usedDays,
			RemainingDays: remainingDays,
			Year:          allocation.Year,
		})
	}

	return balances, nil
}

// getUserBirthdays fetches users with birthdays for the organization
func (s *dashboardService) getUserBirthdays(organizationID string) ([]UserBirthdayResponse, error) {
	// Get all users in the organization with birthdays
	users, err := s.repos.User.List(organizationID, map[string]interface{}{})
	if err != nil {
		fmt.Printf("DEBUG: Error getting users for org %s: %v\n", organizationID, err)
		return nil, fmt.Errorf("failed to get users: %w", err)
	}

	fmt.Printf("DEBUG: Found %d users in organization %s\n", len(users), organizationID)

	var birthdays []UserBirthdayResponse
	now := time.Now()

	for _, user := range users {
		if user.Birthday != nil && user.BirthdayVisible {
			// Calculate this year's birthday date
			birthdayThisYear := time.Date(
				now.Year(),
				user.Birthday.Month(),
				user.Birthday.Day(),
				0, 0, 0, 0,
				user.Birthday.Location(),
			)

			// If birthday has already passed this year, get next year's birthday
			if birthdayThisYear.Before(now) {
				birthdayThisYear = birthdayThisYear.AddDate(1, 0, 0)
			}

            // Include all visible birthdays; frontend will decide how many years to render
            birthdays = append(birthdays, UserBirthdayResponse{
                ID:              strconv.FormatUint(uint64(user.ID), 10),
                Name:            user.Name,
                Birthday:        user.Birthday.Format("2006-01-02"),
                BirthdayVisible: user.BirthdayVisible,
            })
		}
	}

	// Sort by upcoming birthday date
	sort.Slice(birthdays, func(i, j int) bool {
		birthdayI, _ := time.Parse("2006-01-02", birthdays[i].Birthday)
		birthdayJ, _ := time.Parse("2006-01-02", birthdays[j].Birthday)

		birthdayThisYearI := time.Date(now.Year(), birthdayI.Month(), birthdayI.Day(), 0, 0, 0, 0, birthdayI.Location())
		if birthdayThisYearI.Before(now) {
			birthdayThisYearI = birthdayThisYearI.AddDate(1, 0, 0)
		}

		birthdayThisYearJ := time.Date(now.Year(), birthdayJ.Month(), birthdayJ.Day(), 0, 0, 0, 0, birthdayJ.Location())
		if birthdayThisYearJ.Before(now) {
			birthdayThisYearJ = birthdayThisYearJ.AddDate(1, 0, 0)
		}

		return birthdayThisYearI.Before(birthdayThisYearJ)
	})

    // Limit to reasonable number to avoid payload bloat
    if len(birthdays) > 100 {
        birthdays = birthdays[:100]
    }

	return birthdays, nil
}

// isValidFileType checks if the file type is allowed
func (s *documentService) isValidFileType(contentType, filename string) bool {
	// Allowed MIME types
	allowedMimeTypes := map[string]bool{
		"application/pdf":    true,
		"application/msword": true,
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
		"application/vnd.ms-excel": true,
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":         true,
		"application/vnd.ms-powerpoint":                                             true,
		"application/vnd.openxmlformats-officedocument.presentationml.presentation": true,
		"image/jpeg": true,
		"image/jpg":  true,
		"image/png":  true,
	}

	// Check MIME type
	if allowedMimeTypes[contentType] {
		return true
	}

	// Check file extension as fallback
	ext := strings.ToLower(strings.TrimPrefix(strings.ToLower(filename), "."))
	allowedExtensions := map[string]bool{
		"pdf":  true,
		"doc":  true,
		"docx": true,
		"xls":  true,
		"xlsx": true,
		"ppt":  true,
		"pptx": true,
		"jpg":  true,
		"jpeg": true,
		"png":  true,
	}

	return allowedExtensions[ext]
}
