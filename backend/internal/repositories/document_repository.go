package repositories

import (
	"fmt"
	"strconv"

	"hr-portal-backend/internal/models"
)

// documentRepository implements DocumentRepository interface
type documentRepository struct {
	*BaseRepository
}

func (r *documentRepository) Create(document *models.Document) error {
	if err := r.db.Create(document).Error; err != nil {
		return fmt.Errorf("failed to create document: %w", err)
	}
	return nil
}

func (r *documentRepository) GetByID(id string) (*models.Document, error) {
	var document models.Document
	if err := r.db.Preload("User").Where("id = ?", id).First(&document).Error; err != nil {
		return nil, fmt.Errorf("document not found: %w", err)
	}
	return &document, nil
}

func (r *documentRepository) List(organizationID string, filters map[string]interface{}) ([]models.Document, error) {
	var documents []models.Document

	// Convert string organizationID to uint
	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	query := r.db.Preload("User").Where("organization_id = ?", uint(orgIDUint))
	query = r.buildQuery(query, filters)

	if err := query.Find(&documents).Error; err != nil {
		return nil, fmt.Errorf("failed to list documents: %w", err)
	}
	return documents, nil
}

func (r *documentRepository) Update(document *models.Document) error {
	if err := r.db.Save(document).Error; err != nil {
		return fmt.Errorf("failed to update document: %w", err)
	}
	return nil
}

func (r *documentRepository) Delete(id string) error {
	if err := r.db.Where("id = ?", id).Delete(&models.Document{}).Error; err != nil {
		return fmt.Errorf("failed to delete document: %w", err)
	}
	return nil
}

func (r *documentRepository) GetByUserID(userID string) ([]models.Document, error) {
	var documents []models.Document

	// Convert string userID to uint
	userIDUint, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	if err := r.db.Preload("User").Where("user_id = ?", uint(userIDUint)).Find(&documents).Error; err != nil {
		return nil, fmt.Errorf("failed to get user documents: %w", err)
	}
	return documents, nil
}

func (r *documentRepository) Count(count *int64) error {
	if err := r.db.Model(&models.Document{}).Count(count).Error; err != nil {
		return fmt.Errorf("failed to count documents: %w", err)
	}
	return nil
}

func (r *documentRepository) CountByOrganization(organizationID string, count *int64) error {
	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return fmt.Errorf("invalid organization ID: %w", err)
	}
	if err := r.db.Model(&models.Document{}).Where("organization_id = ?", uint(orgIDUint)).Count(count).Error; err != nil {
		return fmt.Errorf("failed to count documents by organization: %w", err)
	}
	return nil
}
