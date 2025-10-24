package services

import (
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
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
		// Check if it's a date range (e.g., "2024-01-01 to 2024-01-03")
		if strings.Contains(req.Date, " to ") {
			// For multi-day events, store the range as a string
			holiday.Date = nil            // Clear the single date field
			holiday.DateRange = &req.Date // Store the range
		} else {
			// Single date
			parsedDate, err := time.Parse("2006-01-02", req.Date)
			if err != nil {
				return nil, fmt.Errorf("invalid date format, expected YYYY-MM-DD: %w", err)
			}
			holiday.Date = &parsedDate
			holiday.DateRange = nil
		}
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
	// Check if this is an upcoming request
	if upcoming, exists := filters["upcoming"]; exists && upcoming.(bool) {
		// Remove the upcoming filter before calling repo
		delete(filters, "upcoming")
		return s.GetUpcomingHolidaysAndEvents(organizationID, 5)
	}

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
		// Check if it's a date range (e.g., "2024-01-01 to 2024-01-03")
		if strings.Contains(*req.Date, " to ") {
			// For multi-day events, store the range as a string
			holiday.Date = nil           // Clear the single date field
			holiday.DateRange = req.Date // Store the range
		} else {
			// Single date
			parsedDate, err := time.Parse("2006-01-02", *req.Date)
			if err != nil {
				return nil, fmt.Errorf("invalid date format, expected YYYY-MM-DD: %w", err)
			}
			holiday.Date = &parsedDate
			holiday.DateRange = nil
		}
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

// GetUpcomingHolidaysAndEvents returns upcoming holidays and events for dashboard
func (s *holidayService) GetUpcomingHolidaysAndEvents(organizationID string, limit int) ([]models.Holiday, error) {
	// Get all holidays and events
	allHolidays, err := s.repo.List(organizationID, map[string]interface{}{})
	if err != nil {
		return nil, fmt.Errorf("failed to get holidays: %w", err)
	}

	// Filter upcoming holidays and events
	upcoming := []models.Holiday{}
	now := time.Now()
	fmt.Printf("DEBUG: Current time: %v\n", now)

	for _, holiday := range allHolidays {
		shouldInclude := false

		if holiday.Date != nil {
			fmt.Printf("DEBUG: Holiday %s has date %v, after now: %v\n", holiday.Name, holiday.Date, holiday.Date.After(now))
			if holiday.Date.After(now) {
				// Future single-day holiday/event
				shouldInclude = true
			}
		} else if holiday.DateRange != nil && *holiday.DateRange != "" {
			// Multi-day holiday/event - check if any part is in the future
			// Parse the date range to check if it's upcoming
			dateRangeStr := *holiday.DateRange
			fmt.Printf("DEBUG: Holiday %s has date range %s\n", holiday.Name, dateRangeStr)
			if strings.Contains(dateRangeStr, " to ") {
				parts := strings.Split(dateRangeStr, " to ")
				if len(parts) == 2 {
					startDate, err := time.Parse("2006-01-02", strings.TrimSpace(parts[0]))
					if err == nil {
						fmt.Printf("DEBUG: Parsed start date %v, after now: %v\n", startDate, startDate.After(now))
						if startDate.After(now) {
							shouldInclude = true
						}
					}
				}
			}
		}
		// Remove the condition for holidays without dates as they might be past events

		if shouldInclude {
			upcoming = append(upcoming, holiday)
		}
	}

	// Sort by date (earliest first)
	sort.Slice(upcoming, func(i, j int) bool {
		// Handle different date formats
		var dateI, dateJ time.Time

		if upcoming[i].Date != nil {
			dateI = *upcoming[i].Date
		} else if upcoming[i].DateRange != nil {
			// For date ranges, use the start date
			dateRangeStr := *upcoming[i].DateRange
			if strings.Contains(dateRangeStr, " to ") {
				parts := strings.Split(dateRangeStr, " to ")
				if len(parts) == 2 {
					if parsed, err := time.Parse("2006-01-02", strings.TrimSpace(parts[0])); err == nil {
						dateI = parsed
					}
				}
			}
		}

		if upcoming[j].Date != nil {
			dateJ = *upcoming[j].Date
		} else if upcoming[j].DateRange != nil {
			// For date ranges, use the start date
			dateRangeStr := *upcoming[j].DateRange
			if strings.Contains(dateRangeStr, " to ") {
				parts := strings.Split(dateRangeStr, " to ")
				if len(parts) == 2 {
					if parsed, err := time.Parse("2006-01-02", strings.TrimSpace(parts[0])); err == nil {
						dateJ = parsed
					}
				}
			}
		}

		return dateI.Before(dateJ)
	})

	// Limit results
	if limit > 0 && len(upcoming) > limit {
		upcoming = upcoming[:limit]
	}

	return upcoming, nil
}
