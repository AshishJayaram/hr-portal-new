package services

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
)

type holidayService struct {
	repo         repositories.HolidayRepository
	auditService AuditService
}

func NewHolidayService(repo repositories.HolidayRepository, auditService AuditService) HolidayService {
	return &holidayService{
		repo:         repo,
		auditService: auditService,
	}
}

func (s *holidayService) CreateHoliday(req CreateHolidayRequest, httpReq *http.Request) (*models.Holiday, error) {
	// Convert string organization ID to uint
	orgID, err := strconv.ParseUint(req.OrganizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	holiday := &models.Holiday{
		OrganizationID:  uint(orgID),
		Name:            req.Name,
		Type:            req.Type,
		Description:     req.Description,
		IsCalendarEvent: req.IsCalendarEvent,
		Color:           req.Color,
	}

	// Parse date if provided
	if req.Date != "" {
		parsedDate, err := time.Parse("2006-01-02", req.Date)
		if err != nil {
			return nil, fmt.Errorf("invalid date format, expected YYYY-MM-DD: %w", err)
		}
		holiday.Date = &parsedDate
	}

	if err := s.repo.Create(holiday); err != nil {
		return nil, fmt.Errorf("failed to create holiday: %w", err)
	}

	// Log audit entry for holiday creation
	orgIDStr := strconv.FormatUint(uint64(holiday.OrganizationID), 10)
	holidayIDStr := strconv.FormatUint(uint64(holiday.ID), 10)

	// Get current user from request context
	changedBy := "19" // Default fallback
	if httpReq != nil {
		if userID := httpReq.Header.Get("X-User-ID"); userID != "" {
			changedBy = userID
		}
	}

	// Log the holiday creation
	changeSummary := fmt.Sprintf("Holiday '%s' created (%s)", holiday.Name, holiday.Type)
	if err := s.auditService.LogAction(AuditActionRequest{
		OrganizationID: orgIDStr,
		Action:         "CREATE",
		EntityType:     "HOLIDAY",
		EntityID:       holidayIDStr,
		ChangedBy:      changedBy,
		ChangeSummary:  changeSummary,
	}, httpReq); err != nil {
		fmt.Printf("Failed to log audit: %v\n", err)
	}

	return holiday, nil
}

func (s *holidayService) GetHoliday(id string) (*models.Holiday, error) {
	holiday, err := s.repo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("holiday not found: %w", err)
	}
	return holiday, nil
}

func (s *holidayService) ListHolidays(organizationID string, filters map[string]interface{}) ([]models.Holiday, error) {
	holidays, err := s.repo.List(organizationID, filters)
	if err != nil {
		return nil, fmt.Errorf("failed to list holidays: %w", err)
	}
	return holidays, nil
}

func (s *holidayService) GetAvailableYears(organizationID string) ([]int, error) {
	years, err := s.repo.GetAvailableYears(organizationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get available years: %w", err)
	}
	return years, nil
}

func (s *holidayService) UpdateHoliday(id string, req UpdateHolidayRequest) (*models.Holiday, error) {
	holiday, err := s.repo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("holiday not found: %w", err)
	}

	// Update fields if provided
	if req.Name != nil && *req.Name != "" {
		holiday.Name = *req.Name
	}
	if req.Type != nil && *req.Type != "" {
		holiday.Type = *req.Type
	}
	if req.Description != nil && *req.Description != "" {
		holiday.Description = *req.Description
	}
	if req.Color != nil && *req.Color != "" {
		holiday.Color = *req.Color
	}
	if req.IsCalendarEvent != nil {
		holiday.IsCalendarEvent = *req.IsCalendarEvent
	}
	if req.Date != nil && *req.Date != "" {
		parsedDate, err := time.Parse("2006-01-02", *req.Date)
		if err != nil {
			return nil, fmt.Errorf("invalid date format, expected YYYY-MM-DD: %w", err)
		}
		holiday.Date = &parsedDate
	}

	err = s.repo.Update(holiday)
	if err != nil {
		return nil, fmt.Errorf("failed to update holiday: %w", err)
	}

	return holiday, nil
}

func (s *holidayService) DeleteHoliday(id string) error {
	err := s.repo.Delete(id)
	if err != nil {
		return fmt.Errorf("failed to delete holiday: %w", err)
	}
	return nil
}

func (s *holidayService) GetUpcomingHolidays(organizationID string, limit int) ([]models.Holiday, error) {
	// TODO: Implement GetUpcoming method in repository
	holidays, err := s.repo.List(organizationID, map[string]interface{}{"limit": limit})
	if err != nil {
		return nil, fmt.Errorf("failed to get upcoming holidays: %w", err)
	}
	return holidays, nil
}
