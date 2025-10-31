package repositories

import (
	"fmt"

	"hr-portal-backend/internal/models"

	"gorm.io/gorm"
)

// holidayRepository implements HolidayRepository interface
type holidayRepository struct {
	*BaseRepository
}

func (r *holidayRepository) Create(holiday *models.Holiday) error {
	if err := r.db.Create(holiday).Error; err != nil {
		return fmt.Errorf("failed to create holiday: %w", err)
	}
	return nil
}

func (r *holidayRepository) GetByID(id string) (*models.Holiday, error) {
	var holiday models.Holiday
	if err := r.db.Where("id = ?", id).First(&holiday).Error; err != nil {
		return nil, fmt.Errorf("holiday not found: %w", err)
	}
	return &holiday, nil
}

func (r *holidayRepository) List(organizationID string, filters map[string]interface{}) ([]models.Holiday, error) {
	var holidays []models.Holiday
	query := r.db.Where("organization_id = ?", organizationID)
	query = r.buildQuery(query, filters)

	if err := query.Find(&holidays).Error; err != nil {
		return nil, fmt.Errorf("failed to list holidays: %w", err)
	}
	return holidays, nil
}

func (r *holidayRepository) GetAvailableYears(organizationID string) ([]int, error) {
	var years []struct {
		Year int `json:"year"`
	}

	// Get distinct FY years from single-date holidays (derive FY by month >= Apr)
	if err := r.db.Model(&models.Holiday{}).
		Select("DISTINCT CASE "+
			"WHEN strftime('%m', date) >= '04' THEN CAST(strftime('%Y', date) AS INTEGER) "+
			"ELSE CAST(strftime('%Y', date) AS INTEGER) - 1 "+
			"END as year").
		Where("organization_id = ? AND deleted_at IS NULL AND date IS NOT NULL", organizationID).
		Scan(&years).Error; err != nil {
		return nil, fmt.Errorf("failed to get available years (single date): %w", err)
	}

	// Also include years from date_range (start and end years)
	var rangeYears []struct {
		Year int `json:"year"`
	}
	// Start year from date_range
	if err := r.db.Model(&models.Holiday{}).
		Select("DISTINCT CAST(substr(date_range, 1, 4) AS INTEGER) as year").
		Where("organization_id = ? AND deleted_at IS NULL AND date_range IS NOT NULL", organizationID).
		Scan(&rangeYears).Error; err == nil {
		years = append(years, rangeYears...)
	}
	rangeYears = nil
	// End year from date_range (last 10 chars are 'YYYY-MM-DD')
	if err := r.db.Model(&models.Holiday{}).
		Select("DISTINCT CAST(substr(date_range, length(date_range) - 9, 4) AS INTEGER) as year").
		Where("organization_id = ? AND deleted_at IS NULL AND date_range IS NOT NULL", organizationID).
		Scan(&rangeYears).Error; err == nil {
		years = append(years, rangeYears...)
	}

	var yearList []int
	for _, y := range years {
		yearList = append(yearList, y.Year)
	}

	// Remove duplicates and sort
	yearMap := make(map[int]bool)
	var uniqueYears []int
	for _, year := range yearList {
		if !yearMap[year] {
			yearMap[year] = true
			uniqueYears = append(uniqueYears, year)
		}
	}

	// Sort in descending order
	for i := 0; i < len(uniqueYears); i++ {
		for j := i + 1; j < len(uniqueYears); j++ {
			if uniqueYears[i] < uniqueYears[j] {
				uniqueYears[i], uniqueYears[j] = uniqueYears[j], uniqueYears[i]
			}
		}
	}

	return uniqueYears, nil
}

func (r *holidayRepository) Update(holiday *models.Holiday) error {
	if err := r.db.Save(holiday).Error; err != nil {
		return fmt.Errorf("failed to update holiday: %w", err)
	}
	return nil
}

func (r *holidayRepository) Delete(id string) error {
	if err := r.db.Where("id = ?", id).Delete(&models.Holiday{}).Error; err != nil {
		return fmt.Errorf("failed to delete holiday: %w", err)
	}
	return nil
}

// buildQuery constructs a GORM query based on filters
func (r *holidayRepository) buildQuery(query *gorm.DB, filters map[string]interface{}) *gorm.DB {
	for key, value := range filters {
		switch key {
		case "year":
			if yearStr, ok := value.(string); ok {
				// Filter by year - handle NULL dates (multi-day only have date_range)
				if len(yearStr) == 4 {
					// Check date field (only if not NULL) OR date_range containing the year
					query = query.Where("(date IS NOT NULL AND strftime('%Y', date) = ?) OR date_range LIKE ?", yearStr, fmt.Sprintf("%%%s%%", yearStr))
				}
			} else if year, ok := value.(int); ok {
				if year > 0 {
					yearStr := fmt.Sprintf("%d", year)
					// Check date field (only if not NULL) OR date_range containing the year
					query = query.Where("(date IS NOT NULL AND strftime('%Y', date) = ?) OR date_range LIKE ?", yearStr, fmt.Sprintf("%%%s%%", yearStr))
				}
			}
		case "type":
			if holidayType, ok := value.(string); ok && holidayType != "" {
				query = query.Where("type = ?", holidayType)
			}
		case "is_calendar_event":
			if isCalendarEvent, ok := value.(bool); ok {
				query = query.Where("is_calendar_event = ?", isCalendarEvent)
			}
		case "date_from":
			if fromDate, ok := value.(string); ok && fromDate != "" {
				query = query.Where("date >= ?", fromDate)
			}
		case "date_to":
			if toDate, ok := value.(string); ok && toDate != "" {
				query = query.Where("date <= ?", toDate)
			}
		}
	}
	return query
}
