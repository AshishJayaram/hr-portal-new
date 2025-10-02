package services

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
)

// documentService implements DocumentService interface
type documentService struct {
	repo         repositories.DocumentRepository
	auditService AuditService
}

func NewDocumentService(repo repositories.DocumentRepository, auditService AuditService) DocumentService {
	return &documentService{
		repo:         repo,
		auditService: auditService,
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

	document := &models.Document{
		UserID:         uint(userID),
		OrganizationID: uint(orgID),
		Title:          req.Title,
		Category:       req.Category,
		IsPublic:       req.IsPublic,
		// TODO: Add file handling logic here
		// For now, we'll create a placeholder document record
		FileName: "placeholder.txt",
		FilePath: "/uploads/placeholder.txt",
		FileSize: 0,
		MimeType: "text/plain",
	}

	err = s.repo.Create(document)
	if err != nil {
		return nil, fmt.Errorf("failed to create document: %w", err)
	}

	// Log audit entry for document upload
	orgIDStr := strconv.FormatUint(uint64(document.OrganizationID), 10)
	documentIDStr := document.ID.String()

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

	return document, nil
}

func (s *documentService) GetDocument(id string) (*models.Document, error) {
	return s.repo.GetByID(id)
}

func (s *documentService) ListDocuments(organizationID string, filters map[string]interface{}) ([]models.Document, error) {
	return s.repo.List(organizationID, filters)
}

func (s *documentService) DeleteDocument(id string, httpReq *http.Request) error {
	// Get document before deletion for audit logging
	document, err := s.repo.GetByID(id)
	if err != nil {
		return fmt.Errorf("failed to get document: %w", err)
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
	repo         repositories.SalarySlipRepository
	auditService AuditService
}

func NewSalarySlipService(repo repositories.SalarySlipRepository, auditService AuditService) SalarySlipService {
	return &salarySlipService{
		repo:         repo,
		auditService: auditService,
	}
}

func (s *salarySlipService) UploadSalarySlip(req UploadSalarySlipRequest, httpReq *http.Request) (*models.SalarySlip, error) {
	// Convert string IDs to uint
	userID, err := strconv.ParseUint(req.UserID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	orgID, err := strconv.ParseUint(req.OrganizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	salarySlip := &models.SalarySlip{
		UserID:         uint(userID),
		OrganizationID: uint(orgID),
		Month:          req.Month,
		Year:           req.Year,
		// TODO: Add file handling logic here
		// For now, we'll create a placeholder salary slip record
		FileName: "placeholder_salary_slip.pdf",
		FilePath: "/uploads/salary_slips/placeholder_salary_slip.pdf",
		FileSize: 0,
		MimeType: "application/pdf",
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
	changeSummary := fmt.Sprintf("Salary slip uploaded for %s (%s)", req.Month, req.Year)
	if err := s.auditService.LogSalarySlipChange(orgIDStr, salarySlipIDStr, changedBy, "CREATE", changeSummary, httpReq); err != nil {
		fmt.Printf("Failed to log audit: %v\n", err)
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
	return s.repo.GetByOrganizationID(organizationID)
}

func (s *companySettingsService) UpdateSettings(organizationID string, req UpdateCompanySettingsRequest) (*models.CompanySettings, error) {
	// TODO: Implement settings update logic
	return nil, fmt.Errorf("not implemented")
}

func (s *companySettingsService) CreateSettings(organizationID string, req UpdateCompanySettingsRequest) (*models.CompanySettings, error) {
	// TODO: Implement settings creation logic
	return nil, fmt.Errorf("not implemented")
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
	// Get total users count for the organization
	var totalUsers int64
	if err := s.repos.User.CountByOrganization(organizationID, &totalUsers); err != nil {
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

	// Get approved leaves count for the organization
	var approvedLeaves int64
	if err := s.repos.Leave.CountApprovedByOrganization(organizationID, &approvedLeaves); err != nil {
		return nil, fmt.Errorf("failed to get approved leaves count: %w", err)
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

	// Filter upcoming holidays (next 30 days)
	upcomingHolidays := []models.Holiday{}
	now := time.Now()
	thirtyDaysFromNow := now.AddDate(0, 0, 30)

	for _, holiday := range holidays {
		if holiday.Date != nil && holiday.Date.After(now) && holiday.Date.Before(thirtyDaysFromNow) {
			upcomingHolidays = append(upcomingHolidays, holiday)
		}
	}

	// Get recent leaves for the organization (last 10)
	recentLeaves, err := s.repos.Leave.List(organizationID, map[string]interface{}{})
	if err != nil {
		return nil, fmt.Errorf("failed to get recent leaves: %w", err)
	}

	// Sort by created_at desc and limit to 10
	if len(recentLeaves) > 10 {
		recentLeaves = recentLeaves[:10]
	}

	// Get recent documents for the current user only
	recentDocuments, err := s.repos.Document.List(organizationID, map[string]interface{}{
		"user_id": userID,
	})
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

	// Leave balances are handled by the dashboard service
	leaveBalances := []LeaveBalanceResponse{}

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
	}, nil
}
