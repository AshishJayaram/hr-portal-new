package services

import (
	"fmt"
	"strconv"
	"time"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
)

type HolidayService struct {
	repo repositories.HolidayRepository
}

func NewHolidayService(repo repositories.HolidayRepository) HolidayService {
	return HolidayService{
		repo: repo,
	}
}

func (s *HolidayService) CreateHoliday(req CreateHolidayRequest) (*models.Holiday, error) {
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

	return holiday, nil
}

func (s *HolidayService) GetHoliday(id string) (*models.Holiday, error) {
	holiday, err := s.repo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("holiday not found: %w", err)
	}
	return holiday, nil
}

func (s *HolidayService) ListHolidays(organizationID string, filters map[string]interface{}) ([]models.Holiday, error) {
	holidays, err := s.repo.List(organizationID, filters)
	if err != nil {
		return nil, fmt.Errorf("failed to list holidays: %w", err)
	}
	return holidays, nil
}

func (s *HolidayService) UpdateHoliday(id string, req UpdateHolidayRequest) (*models.Holiday, error) {
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

func (s *HolidayService) DeleteHoliday(id string) error {
	err := s.repo.Delete(id)
	if err != nil {
		return fmt.Errorf("failed to delete holiday: %w", err)
	}
	return nil
}

func (s *HolidayService) GetUpcomingHolidays(organizationID string, limit int) ([]models.Holiday, error) {
	// TODO: Implement GetUpcoming method in repository
	holidays, err := s.repo.List(organizationID, map[string]interface{}{"limit": limit})
	if err != nil {
		return nil, fmt.Errorf("failed to get upcoming holidays: %w", err)
	}
	return holidays, nil
}
