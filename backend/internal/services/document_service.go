package services

import (
	"fmt"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"

	"github.com/google/uuid"
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
	// Convert string IDs to UUIDs
	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	orgID, err := uuid.Parse(req.OrganizationID)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	document := &models.Document{
		UserID:         userID,
		OrganizationID: orgID,
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
	// TODO: Implement salary slip generation logic
	return nil, fmt.Errorf("not implemented")
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
	// Get total users count
	var totalUsers int64
	if err := s.repos.User.Count(&totalUsers); err != nil {
		return nil, fmt.Errorf("failed to get total users count: %w", err)
	}

	// Get total leaves count
	var totalLeaves int64
	if err := s.repos.Leave.Count(&totalLeaves); err != nil {
		return nil, fmt.Errorf("failed to get total leaves count: %w", err)
	}

	// Get pending leaves count
	var pendingLeaves int64
	if err := s.repos.Leave.Count(&pendingLeaves); err != nil {
		return nil, fmt.Errorf("failed to get pending leaves count: %w", err)
	}

	// Get total documents count
	var totalDocuments int64
	if err := s.repos.Document.Count(&totalDocuments); err != nil {
		return nil, fmt.Errorf("failed to get total documents count: %w", err)
	}

	// For now, return basic stats without complex queries
	return &DashboardStatsResponse{
		TotalUsers:       totalUsers,
		TotalLeaves:      totalLeaves,
		PendingLeaves:    pendingLeaves,
		TotalDocuments:   totalDocuments,
		UpcomingHolidays: []models.Holiday{},
		RecentLeaves:     []models.Leave{},
		RecentDocuments:  []models.Document{},
		LeaveBalances:    []LeaveBalanceResponse{},
	}, nil
}
