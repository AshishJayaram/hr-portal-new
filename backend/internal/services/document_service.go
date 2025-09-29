package services

import (
	"fmt"
	"strconv"
	"time"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
)

// documentService implements DocumentService interface
type documentService struct {
	repo repositories.DocumentRepository
}

func NewDocumentService(repo repositories.DocumentRepository) DocumentService {
	return &documentService{
		repo: repo,
	}
}

func (s *documentService) UploadDocument(req UploadDocumentRequest) (*models.Document, error) {
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

	return document, nil
}

func (s *documentService) GetDocument(id string) (*models.Document, error) {
	return s.repo.GetByID(id)
}

func (s *documentService) ListDocuments(organizationID string, filters map[string]interface{}) ([]models.Document, error) {
	return s.repo.List(organizationID, filters)
}

func (s *documentService) DeleteDocument(id string) error {
	return s.repo.Delete(id)
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
	repo repositories.SalarySlipRepository
}

func NewSalarySlipService(repo repositories.SalarySlipRepository) SalarySlipService {
	return &salarySlipService{
		repo: repo,
	}
}

func (s *salarySlipService) UploadSalarySlip(req UploadSalarySlipRequest) (*models.SalarySlip, error) {
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

	// Get recent documents for the organization (last 5)
	recentDocuments, err := s.repos.Document.List(organizationID, map[string]interface{}{})
	if err != nil {
		return nil, fmt.Errorf("failed to get recent documents: %w", err)
	}

	// Sort by created_at desc and limit to 5
	if len(recentDocuments) > 5 {
		recentDocuments = recentDocuments[:5]
	}

	// Get leave balances for the current user
	leaveService := NewLeaveService(s.repos.Leave, s.repos.User, s.repos.LeaveCategory, s.repos.LeaveAllocation, s.repos.Holiday)
	leaveBalances, err := leaveService.GetLeaveBalance(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get leave balances: %w", err)
	}

	return &DashboardStatsResponse{
		TotalUsers:       totalUsers,
		TotalLeaves:      totalLeaves,
		PendingLeaves:    pendingLeaves,
		ApprovedLeaves:   approvedLeaves,
		TotalDocuments:   totalDocuments,
		UpcomingHolidays: upcomingHolidays,
		RecentLeaves:     recentLeaves,
		RecentDocuments:  recentDocuments,
		LeaveBalances:    leaveBalances,
	}, nil
}
