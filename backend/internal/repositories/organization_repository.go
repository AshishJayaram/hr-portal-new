package repositories

import (
	"fmt"

	"hr-portal-backend/internal/models"
)

// organizationRepository implements OrganizationRepository interface
type organizationRepository struct {
	*BaseRepository
}

func (r *organizationRepository) Create(org *models.Organization) error {
	if err := r.db.Create(org).Error; err != nil {
		return fmt.Errorf("failed to create organization: %w", err)
	}
	return nil
}

func (r *organizationRepository) GetByID(id string) (*models.Organization, error) {
	var org models.Organization
	if err := r.db.Where("id = ?", id).First(&org).Error; err != nil {
		return nil, fmt.Errorf("organization not found: %w", err)
	}
	return &org, nil
}

func (r *organizationRepository) GetByDomain(domain string) (*models.Organization, error) {
	var org models.Organization
	if err := r.db.Where("domain = ?", domain).First(&org).Error; err != nil {
		return nil, fmt.Errorf("organization not found: %w", err)
	}
	return &org, nil
}

func (r *organizationRepository) List() ([]models.Organization, error) {
	var orgs []models.Organization
	if err := r.db.Find(&orgs).Error; err != nil {
		return nil, fmt.Errorf("failed to list organizations: %w", err)
	}
	return orgs, nil
}

func (r *organizationRepository) Update(org *models.Organization) error {
	if err := r.db.Save(org).Error; err != nil {
		return fmt.Errorf("failed to update organization: %w", err)
	}
	return nil
}

func (r *organizationRepository) Delete(id string) error {
	if err := r.db.Where("id = ?", id).Delete(&models.Organization{}).Error; err != nil {
		return fmt.Errorf("failed to delete organization: %w", err)
	}
	return nil
}
