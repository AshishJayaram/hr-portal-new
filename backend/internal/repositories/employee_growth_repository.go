package repositories

import (
	"hr-portal-backend/internal/models"
	"time"

	"gorm.io/gorm"
)

type EmployeeGrowthRepository struct {
	DB *gorm.DB
}

func NewEmployeeGrowthRepository(db *gorm.DB) *EmployeeGrowthRepository {
	return &EmployeeGrowthRepository{DB: db}
}

func (r *EmployeeGrowthRepository) CreateGrowthRecord(growth *models.EmployeeGrowth) (*models.EmployeeGrowth, error) {
	err := r.DB.Create(growth).Error
	return growth, err
}

func (r *EmployeeGrowthRepository) GetEmployeeGrowth(userID uint) ([]models.EmployeeGrowth, error) {
	var growth []models.EmployeeGrowth
	err := r.DB.Preload("AddedByUser").
		Where("user_id = ?", userID).
		Order("date DESC").
		Find(&growth).Error
	return growth, err
}

func (r *EmployeeGrowthRepository) GetGrowthRecordByID(id uint) (*models.EmployeeGrowth, error) {
	var growth models.EmployeeGrowth
	err := r.DB.Preload("User").Preload("AddedByUser").
		First(&growth, id).Error
	return &growth, err
}

func (r *EmployeeGrowthRepository) UpdateGrowthRecord(id uint, title, description, growthType string, date time.Time) error {
	updates := map[string]interface{}{
		"title":       title,
		"description": description,
		"type":        growthType,
		"date":        date,
	}

	return r.DB.Model(&models.EmployeeGrowth{}).Where("id = ?", id).Updates(updates).Error
}

func (r *EmployeeGrowthRepository) DeleteGrowthRecord(id uint) error {
	return r.DB.Delete(&models.EmployeeGrowth{}, id).Error
}

func (r *EmployeeGrowthRepository) GetGrowthStats(userID uint) (map[string]int, error) {
	stats := make(map[string]int)

	// Count by type
	var typeCounts []struct {
		Type  string
		Count int
	}
	err := r.DB.Model(&models.EmployeeGrowth{}).
		Select("type, count(*) as count").
		Where("user_id = ?", userID).
		Group("type").
		Scan(&typeCounts).Error

	if err != nil {
		return nil, err
	}

	for _, count := range typeCounts {
		stats[count.Type] = count.Count
	}

	return stats, nil
}
