package services

import (
	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
	"time"
)

type EmployeeGrowthService struct {
	repo *repositories.EmployeeGrowthRepository
}

func NewEmployeeGrowthService(repo *repositories.EmployeeGrowthRepository) *EmployeeGrowthService {
	return &EmployeeGrowthService{repo: repo}
}

func (s *EmployeeGrowthService) CreateGrowthRecord(userID, organizationID, addedBy uint, title, description, growthType string, date time.Time) (*models.EmployeeGrowth, error) {
	growth := &models.EmployeeGrowth{
		UserID:         userID,
		OrganizationID: organizationID,
		Title:          title,
		Description:    description,
		Type:           growthType,
		Date:           date,
		AddedBy:        addedBy,
	}

	return s.repo.CreateGrowthRecord(growth)
}

func (s *EmployeeGrowthService) GetEmployeeGrowth(userID uint) ([]models.EmployeeGrowth, error) {
	return s.repo.GetEmployeeGrowth(userID)
}

func (s *EmployeeGrowthService) GetGrowthRecordByID(id uint) (*models.EmployeeGrowth, error) {
	return s.repo.GetGrowthRecordByID(id)
}

func (s *EmployeeGrowthService) UpdateGrowthRecord(id uint, title, description, growthType string, date time.Time) error {
	return s.repo.UpdateGrowthRecord(id, title, description, growthType, date)
}

func (s *EmployeeGrowthService) DeleteGrowthRecord(id uint) error {
	return s.repo.DeleteGrowthRecord(id)
}

func (s *EmployeeGrowthService) GetGrowthStats(userID uint) (map[string]int, error) {
	return s.repo.GetGrowthStats(userID)
}
