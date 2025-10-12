package repositories

import (
	"fmt"
	"hr-portal-backend/internal/models"
	"strconv"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type EmployeePrivateDocumentRepository interface {
	Create(doc *models.EmployeePrivateDocument) error
	ListByUser(userID string) ([]models.EmployeePrivateDocument, error)
	GetByID(id string) (*models.EmployeePrivateDocument, error)
	Delete(id string) error
}

type employeePrivateDocumentRepository struct {
	*BaseRepository
}

func NewEmployeePrivateDocumentRepository(db *gorm.DB, rdb *redis.Client) EmployeePrivateDocumentRepository {
	return &employeePrivateDocumentRepository{BaseRepository: NewBaseRepository(db, rdb)}
}

func (r *employeePrivateDocumentRepository) Create(doc *models.EmployeePrivateDocument) error {
	// Explicitly set ID to 0 to ensure auto-increment
	doc.ID = 0

	if err := r.db.Create(doc).Error; err != nil {
		return fmt.Errorf("failed to create employee private document: %w", err)
	}
	return nil
}

func (r *employeePrivateDocumentRepository) ListByUser(userID string) ([]models.EmployeePrivateDocument, error) {
	var docs []models.EmployeePrivateDocument
	id, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user id: %w", err)
	}
	if err := r.db.Where("user_id = ?", uint(id)).Order("created_at DESC").Find(&docs).Error; err != nil {
		return nil, fmt.Errorf("failed to list employee private documents: %w", err)
	}
	return docs, nil
}

func (r *employeePrivateDocumentRepository) GetByID(id string) (*models.EmployeePrivateDocument, error) {
	var doc models.EmployeePrivateDocument
	if err := r.db.Where("id = ?", id).First(&doc).Error; err != nil {
		return nil, fmt.Errorf("failed to get employee private document: %w", err)
	}
	return &doc, nil
}

func (r *employeePrivateDocumentRepository) Delete(id string) error {
	if err := r.db.Delete(&models.EmployeePrivateDocument{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("failed to delete employee private document: %w", err)
	}
	return nil
}
