package services

import (
	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
)

// organizationService implements OrganizationService interface
type organizationService struct {
	orgRepo repositories.OrganizationRepository
}

// NewOrganizationService creates a new organization service
func NewOrganizationService(orgRepo repositories.OrganizationRepository) OrganizationService {
	return &organizationService{
		orgRepo: orgRepo,
	}
}

func (s *organizationService) Create(org *models.Organization) error {
	return s.orgRepo.Create(org)
}

func (s *organizationService) GetByID(id string) (*models.Organization, error) {
	return s.orgRepo.GetByID(id)
}

func (s *organizationService) GetByDomain(domain string) (*models.Organization, error) {
	return s.orgRepo.GetByDomain(domain)
}

func (s *organizationService) List() ([]models.Organization, error) {
	return s.orgRepo.List()
}

func (s *organizationService) Update(org *models.Organization) error {
	return s.orgRepo.Update(org)
}

func (s *organizationService) Delete(id string) error {
	return s.orgRepo.Delete(id)
}

func (s *organizationService) Count(count *int64) error {
	return s.orgRepo.Count(count)
}

func (s *organizationService) CountActive(count *int64) error {
	return s.orgRepo.CountActive(count)
}

func (s *organizationService) ListAll() ([]models.Organization, error) {
	return s.orgRepo.ListAll()
}

func (s *organizationService) ListAllWithUserCount() ([]map[string]interface{}, error) {
	return s.orgRepo.ListAllWithUserCount()
}
