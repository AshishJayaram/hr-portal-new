package repositories

import (
	"time"

	"hr-portal-backend/internal/models"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// HolidayRepository interface for holiday operations
type HolidayRepository interface {
	Create(holiday *models.Holiday) error
	GetByID(id string) (*models.Holiday, error)
	List(organizationID string, filters map[string]interface{}) ([]models.Holiday, error)
	Update(holiday *models.Holiday) error
	Delete(id string) error
	GetUpcoming(organizationID string, limit int) ([]models.Holiday, error)
}

type holidayRepository struct {
	*BaseRepository
}

func NewHolidayRepository(db *gorm.DB, rdb *redis.Client) HolidayRepository {
	return &holidayRepository{
		BaseRepository: NewBaseRepository(db, rdb),
	}
}

func (r *holidayRepository) Create(holiday *models.Holiday) error {
	holiday.ID = uuid.New()
	holiday.CreatedAt = time.Now()
	holiday.UpdatedAt = time.Now()
	
	return r.db.Create(holiday).Error
}

func (r *holidayRepository) GetByID(id string) (*models.Holiday, error) {
	var holiday models.Holiday
	err := r.db.Where("id = ? AND deleted_at IS NULL", id).First(&holiday).Error
	if err != nil {
		return nil, err
	}
	return &holiday, nil
}

func (r *holidayRepository) List(organizationID string, filters map[string]interface{}) ([]models.Holiday, error) {
	var holidays []models.Holiday
	
	query := r.db.Where("organization_id = ? AND deleted_at IS NULL", organizationID)
	query = r.buildQuery(query, filters)
	
	err := query.Order("date ASC").Find(&holidays).Error
	return holidays, err
}

func (r *holidayRepository) Update(holiday *models.Holiday) error {
	holiday.UpdatedAt = time.Now()
	return r.db.Save(holiday).Error
}

func (r *holidayRepository) Delete(id string) error {
	return r.db.Model(&models.Holiday{}).Where("id = ?", id).Update("deleted_at", time.Now()).Error
}

func (r *holidayRepository) GetUpcoming(organizationID string, limit int) ([]models.Holiday, error) {
	var holidays []models.Holiday
	
	query := r.db.Where("organization_id = ? AND deleted_at IS NULL AND date >= ?", organizationID, time.Now())
	if limit > 0 {
		query = query.Limit(limit)
	}
	
	err := query.Order("date ASC").Find(&holidays).Error
	return holidays, err
}
