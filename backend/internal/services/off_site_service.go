package services

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
)

// OffSiteService interface for off-site business logic
type OffSiteService interface {
	CreateOffSite(req CreateOffSiteRequest, httpReq *http.Request) (*models.OffSite, error)
	GetOffSite(id string) (*models.OffSite, error)
	ListOffSites(organizationID string, filters map[string]interface{}) ([]models.OffSite, error)
	ListUserOffSites(userID string, filters map[string]interface{}) ([]models.OffSite, error)
	ListManagerOffSites(managerID string, organizationID string, filters map[string]interface{}) ([]models.OffSite, error)
	UpdateOffSite(id string, req UpdateOffSiteRequest, httpReq *http.Request) (*models.OffSite, error)
	DeleteOffSite(id string, httpReq *http.Request) error
	GetOffSitesByDateRange(organizationID string, startDate, endDate time.Time) ([]models.OffSite, error)
}

// CreateOffSiteRequest represents the request to create an off-site entry
type CreateOffSiteRequest struct {
	UserID         string    `json:"user_id" validate:"required"`
	OrganizationID string    `json:"organization_id" validate:"required"`
	Title          string    `json:"title" validate:"required"`
	Description    string    `json:"description"`
	Location       string    `json:"location"`
	StartDate      time.Time `json:"start_date" validate:"required"`
	EndDate        time.Time `json:"end_date" validate:"required"`
	Type           string    `json:"type" validate:"required,oneof=training meeting conference client_visit other"`
}

// UpdateOffSiteRequest represents the request to update an off-site entry
type UpdateOffSiteRequest struct {
	Title       *string    `json:"title"`
	Description *string    `json:"description"`
	Location    *string    `json:"location"`
	StartDate   *time.Time `json:"start_date"`
	EndDate     *time.Time `json:"end_date"`
	Type        *string    `json:"type" validate:"omitempty,oneof=training meeting conference client_visit other"`
	Status      *string    `json:"status" validate:"omitempty,oneof=planned in_progress completed cancelled"`
}

// offSiteService implements OffSiteService interface
type offSiteService struct {
	offSiteRepo  repositories.OffSiteRepository
	userRepo     repositories.UserRepository
	auditService AuditService
}

// NewOffSiteService creates a new off-site service
func NewOffSiteService(offSiteRepo repositories.OffSiteRepository, userRepo repositories.UserRepository, auditService AuditService) OffSiteService {
	return &offSiteService{
		offSiteRepo:  offSiteRepo,
		userRepo:     userRepo,
		auditService: auditService,
	}
}

func (s *offSiteService) CreateOffSite(req CreateOffSiteRequest, httpReq *http.Request) (*models.OffSite, error) {
	// Validate dates
	if req.EndDate.Before(req.StartDate) {
		return nil, fmt.Errorf("end date cannot be before start date")
	}

	// Convert string IDs to uint
	userID, err := strconv.ParseUint(req.UserID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	orgID, err := strconv.ParseUint(req.OrganizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	// Create off-site entry
	offSite := &models.OffSite{
		UserID:         uint(userID),
		OrganizationID: uint(orgID),
		Title:          req.Title,
		Description:    req.Description,
		Location:       req.Location,
		StartDate:      req.StartDate,
		EndDate:        req.EndDate,
		Type:           req.Type,
		Status:         "planned",
	}

	err = s.offSiteRepo.Create(offSite)
	if err != nil {
		return nil, fmt.Errorf("failed to create off-site: %w", err)
	}

	// Preload relationships before returning
	offSiteWithRelations, err := s.offSiteRepo.GetByID(strconv.FormatUint(uint64(offSite.ID), 10))
	if err != nil {
		return nil, fmt.Errorf("failed to get created off-site with relationships: %w", err)
	}

	// Log audit entry
	orgIDStr := strconv.FormatUint(uint64(offSite.OrganizationID), 10)
	offSiteIDStr := strconv.FormatUint(uint64(offSite.ID), 10)

	// Get current user from request context
	changedBy := strconv.FormatUint(uint64(offSite.UserID), 10) // Self-creation
	if httpReq != nil {
		if userID := httpReq.Header.Get("X-User-ID"); userID != "" {
			changedBy = userID
		}
	}

	// Log the off-site creation
	changeSummary := fmt.Sprintf("Off-site entry created: %s from %s to %s",
		offSite.Title, offSite.StartDate.Format("2006-01-02"), offSite.EndDate.Format("2006-01-02"))
	if err := s.auditService.LogOffSiteChange(orgIDStr, offSiteIDStr, changedBy, "CREATE", changeSummary, httpReq); err != nil {
	}

	return offSiteWithRelations, nil
}

func (s *offSiteService) GetOffSite(id string) (*models.OffSite, error) {
	return s.offSiteRepo.GetByID(id)
}

func (s *offSiteService) ListOffSites(organizationID string, filters map[string]interface{}) ([]models.OffSite, error) {
	return s.offSiteRepo.List(organizationID, filters)
}

func (s *offSiteService) ListUserOffSites(userID string, filters map[string]interface{}) ([]models.OffSite, error) {
	return s.offSiteRepo.ListByUser(userID, filters)
}

func (s *offSiteService) ListManagerOffSites(managerID string, organizationID string, filters map[string]interface{}) ([]models.OffSite, error) {
	return s.offSiteRepo.ListByManager(managerID, organizationID, filters)
}

func (s *offSiteService) UpdateOffSite(id string, req UpdateOffSiteRequest, httpReq *http.Request) (*models.OffSite, error) {
	// Get existing off-site
	offSite, err := s.offSiteRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to get off-site: %w", err)
	}

	// Store old off-site for audit logging (not used in this implementation)
	_ = *offSite

	// Update fields if provided
	if req.Title != nil {
		offSite.Title = *req.Title
	}
	if req.Description != nil {
		offSite.Description = *req.Description
	}
	if req.Location != nil {
		offSite.Location = *req.Location
	}
	if req.StartDate != nil {
		offSite.StartDate = *req.StartDate
	}
	if req.EndDate != nil {
		offSite.EndDate = *req.EndDate
	}
	if req.Type != nil {
		offSite.Type = *req.Type
	}
	if req.Status != nil {
		offSite.Status = *req.Status
	}

	// Validate dates
	if offSite.EndDate.Before(offSite.StartDate) {
		return nil, fmt.Errorf("end date cannot be before start date")
	}

	err = s.offSiteRepo.Update(offSite)
	if err != nil {
		return nil, fmt.Errorf("failed to update off-site: %w", err)
	}

	// Log audit entry
	orgIDStr := strconv.FormatUint(uint64(offSite.OrganizationID), 10)
	offSiteIDStr := strconv.FormatUint(uint64(offSite.ID), 10)

	// Get current user from request context
	changedBy := "unknown"
	if httpReq != nil {
		if userID := httpReq.Header.Get("X-User-ID"); userID != "" {
			changedBy = userID
		}
	}

	// Log the off-site update
	changeSummary := fmt.Sprintf("Off-site entry updated: %s", offSite.Title)
	if err := s.auditService.LogOffSiteChange(orgIDStr, offSiteIDStr, changedBy, "UPDATE", changeSummary, httpReq); err != nil {
	}

	return offSite, nil
}

func (s *offSiteService) DeleteOffSite(id string, httpReq *http.Request) error {
	// Get off-site for audit logging
	offSite, err := s.offSiteRepo.GetByID(id)
	if err != nil {
		return fmt.Errorf("failed to get off-site: %w", err)
	}

	err = s.offSiteRepo.Delete(id)
	if err != nil {
		return fmt.Errorf("failed to delete off-site: %w", err)
	}

	// Log audit entry
	orgIDStr := strconv.FormatUint(uint64(offSite.OrganizationID), 10)
	offSiteIDStr := strconv.FormatUint(uint64(offSite.ID), 10)

	// Get current user from request context
	changedBy := "unknown"
	if httpReq != nil {
		if userID := httpReq.Header.Get("X-User-ID"); userID != "" {
			changedBy = userID
		}
	}

	// Log the off-site deletion
	changeSummary := fmt.Sprintf("Off-site entry deleted: %s", offSite.Title)
	if err := s.auditService.LogOffSiteChange(orgIDStr, offSiteIDStr, changedBy, "DELETE", changeSummary, httpReq); err != nil {
	}

	return nil
}

func (s *offSiteService) GetOffSitesByDateRange(organizationID string, startDate, endDate time.Time) ([]models.OffSite, error) {
	return s.offSiteRepo.GetByDateRange(organizationID, startDate, endDate)
}
