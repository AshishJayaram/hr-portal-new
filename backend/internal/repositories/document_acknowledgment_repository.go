package repositories

import (
	"hr-portal-backend/internal/models"

	"gorm.io/gorm"
)

type DocumentAcknowledgmentRepository interface {
	Create(acknowledgment *models.DocumentAcknowledgment) error
	GetByDocumentID(documentID uint) ([]models.DocumentAcknowledgment, error)
	GetByUserID(userID uint) ([]models.DocumentAcknowledgment, error)
	GetByDocumentAndUser(documentID, userID uint) (*models.DocumentAcknowledgment, error)
	Delete(id uint) error
	GetAcknowledgedUsersForDocument(documentID uint) ([]models.User, error)
}

type documentAcknowledgmentRepository struct {
	db *gorm.DB
}

func NewDocumentAcknowledgmentRepository(db *gorm.DB) DocumentAcknowledgmentRepository {
	return &documentAcknowledgmentRepository{db: db}
}

func (r *documentAcknowledgmentRepository) Create(acknowledgment *models.DocumentAcknowledgment) error {
	return r.db.Create(acknowledgment).Error
}

func (r *documentAcknowledgmentRepository) GetByDocumentID(documentID uint) ([]models.DocumentAcknowledgment, error) {
	var acknowledgments []models.DocumentAcknowledgment
	err := r.db.Where("document_id = ?", documentID).
		Preload("User").
		Preload("Document").
		Find(&acknowledgments).Error
	return acknowledgments, err
}

func (r *documentAcknowledgmentRepository) GetByUserID(userID uint) ([]models.DocumentAcknowledgment, error) {
	var acknowledgments []models.DocumentAcknowledgment
	err := r.db.Where("user_id = ?", userID).
		Preload("User").
		Preload("Document").
		Find(&acknowledgments).Error
	return acknowledgments, err
}

func (r *documentAcknowledgmentRepository) GetByDocumentAndUser(documentID, userID uint) (*models.DocumentAcknowledgment, error) {
	var acknowledgment models.DocumentAcknowledgment
	err := r.db.Where("document_id = ? AND user_id = ?", documentID, userID).
		Preload("User").
		Preload("Document").
		First(&acknowledgment).Error
	if err != nil {
		return nil, err
	}
	return &acknowledgment, nil
}

func (r *documentAcknowledgmentRepository) Delete(id uint) error {
	return r.db.Delete(&models.DocumentAcknowledgment{}, id).Error
}

func (r *documentAcknowledgmentRepository) GetAcknowledgedUsersForDocument(documentID uint) ([]models.User, error) {
	var users []models.User
	err := r.db.Table("users").
		Joins("JOIN document_acknowledgments ON users.id = document_acknowledgments.user_id").
		Where("document_acknowledgments.document_id = ? AND document_acknowledgments.deleted_at IS NULL", documentID).
		Where("users.deleted_at IS NULL").
		Select("users.*").
		Find(&users).Error
	return users, err
}
