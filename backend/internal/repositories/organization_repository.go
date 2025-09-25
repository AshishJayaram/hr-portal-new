package repositories

import (
	"fmt"
	"strconv"

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
	// Convert string to uint for organization ID
	orgID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	if err := r.db.Where("id = ?", uint(orgID)).First(&org).Error; err != nil {
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

// Count returns the total number of organizations
func (r *organizationRepository) Count(count *int64) error {
	return r.db.Model(&models.Organization{}).Count(count).Error
}

// CountActive returns the number of active organizations
func (r *organizationRepository) CountActive(count *int64) error {
	return r.db.Model(&models.Organization{}).Where("is_active = ?", true).Count(count).Error
}

// ListAll returns all organizations (for God users)
func (r *organizationRepository) ListAll() ([]models.Organization, error) {
	var orgs []models.Organization
	err := r.db.Find(&orgs).Error
	return orgs, err
}
