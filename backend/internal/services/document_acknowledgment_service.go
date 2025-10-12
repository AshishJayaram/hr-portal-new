package services

import (
	"errors"
	"time"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
)

type DocumentAcknowledgmentService interface {
	AcknowledgeDocument(documentID, userID, organizationID uint) error
	GetDocumentAcknowledgments(documentID uint) ([]models.DocumentAcknowledgment, error)
	GetUserAcknowledgments(userID uint) ([]models.DocumentAcknowledgment, error)
	IsDocumentAcknowledged(documentID, userID uint) (bool, error)
	GetAcknowledgedUsersForDocument(documentID uint) ([]models.User, error)
}

type documentAcknowledgmentService struct {
	repo repositories.DocumentAcknowledgmentRepository
}

func NewDocumentAcknowledgmentService(repo repositories.DocumentAcknowledgmentRepository) DocumentAcknowledgmentService {
	return &documentAcknowledgmentService{repo: repo}
}

func (s *documentAcknowledgmentService) AcknowledgeDocument(documentID, userID, organizationID uint) error {
	// Check if already acknowledged
	existing, err := s.repo.GetByDocumentAndUser(documentID, userID)
	if err == nil && existing != nil {
		return errors.New("document already acknowledged by this user")
	}

	acknowledgment := &models.DocumentAcknowledgment{
		DocumentID:     documentID,
		UserID:         userID,
		OrganizationID: organizationID,
		AcknowledgedAt: time.Now(),
	}

	return s.repo.Create(acknowledgment)
}

func (s *documentAcknowledgmentService) GetDocumentAcknowledgments(documentID uint) ([]models.DocumentAcknowledgment, error) {
	return s.repo.GetByDocumentID(documentID)
}

func (s *documentAcknowledgmentService) GetUserAcknowledgments(userID uint) ([]models.DocumentAcknowledgment, error) {
	return s.repo.GetByUserID(userID)
}

func (s *documentAcknowledgmentService) IsDocumentAcknowledged(documentID, userID uint) (bool, error) {
	acknowledgment, err := s.repo.GetByDocumentAndUser(documentID, userID)
	if err != nil {
		return false, nil // Not acknowledged
	}
	return acknowledgment != nil, nil
}

func (s *documentAcknowledgmentService) GetAcknowledgedUsersForDocument(documentID uint) ([]models.User, error) {
	return s.repo.GetAcknowledgedUsersForDocument(documentID)
}
