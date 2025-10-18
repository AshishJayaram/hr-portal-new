package services

import (
	"fmt"
	"strconv"
	"time"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
)

// KRAService handles KRA-related business logic
type KRAService interface {
	CreateKRA(req CreateKRARequest) (*models.KRA, error)
	GetKRA(id string) (*models.KRA, error)
	GetUserKRAs(userID, organizationID string, year int) ([]models.KRA, error)
	GetAllUserKRAs(userID, organizationID string) ([]models.KRA, error)
	GetTeamKRAs(managerID, organizationID string, year int) ([]models.KRA, error)
	UpdateKRA(id string, req UpdateKRARequest) (*models.KRA, error)
	EvaluateKRA(id string, req EvaluateKRARequest) (*models.KRA, error)
	DeleteKRA(id string) error
	ListKRAs(organizationID string, filters map[string]interface{}) ([]models.KRA, error)
	GetKRASummary(userID, organizationID string, year int) (*KRASummary, error)
}

type kraService struct {
	kraRepo     repositories.KRARepository
	userRepo    repositories.UserRepository
	auditService AuditService
	notificationService NotificationService
}

// CreateKRARequest represents a request to create a new KRA
type CreateKRARequest struct {
	UserID          string  `json:"user_id" binding:"required"`
	OrganizationID  string  `json:"organization_id"` // Set from context
	Year            int     `json:"year" binding:"required"`
	Title           string  `json:"title" binding:"required"`
	Description     string  `json:"description"`
	Weight          float64 `json:"weight" binding:"required,min=0,max=100"`
	TargetValue     string  `json:"target_value" binding:"required"`
	MeasurementUnit string  `json:"measurement_unit" binding:"required"`
	SetBy           string  `json:"set_by"` // Set from context
}

// UpdateKRARequest represents a request to update a KRA
type UpdateKRARequest struct {
	Title           *string  `json:"title"`
	Description     *string  `json:"description"`
	Weight          *float64 `json:"weight"`
	TargetValue     *string  `json:"target_value"`
	MeasurementUnit *string  `json:"measurement_unit"`
	Status          *string  `json:"status"`
}

// EvaluateKRARequest represents a request to evaluate a KRA
type EvaluateKRARequest struct {
	ActualValue       string  `json:"actual_value" binding:"required"`
	Rating            float64 `json:"rating" binding:"required,min=1,max=5"`
	Comments          string  `json:"comments"`
	EmployeeComments  string  `json:"employee_comments"`
	EvaluatedBy       string  `json:"evaluated_by" binding:"required"`
}

// KRASummary represents a summary of KRA performance for a user
type KRASummary struct {
	UserID           string  `json:"user_id"`
	UserName         string  `json:"user_name"`
	Year             int     `json:"year"`
	TotalKRAs        int     `json:"total_kras"`
	CompletedKRAs    int     `json:"completed_kras"`
	AverageRating    float64 `json:"average_rating"`
	TotalWeight      float64 `json:"total_weight"`
	WeightedScore    float64 `json:"weighted_score"`
	OverallRating    string  `json:"overall_rating"`
	KRAs             []models.KRA `json:"kras"`
}

func NewKRAService(kraRepo repositories.KRARepository, userRepo repositories.UserRepository, auditService AuditService, notificationService NotificationService) KRAService {
	return &kraService{
		kraRepo:      kraRepo,
		userRepo:     userRepo,
		auditService: auditService,
		notificationService: notificationService,
	}
}

// CreateKRA creates a new KRA
func (s *kraService) CreateKRA(req CreateKRARequest) (*models.KRA, error) {
	// Validate user exists
	user, err := s.userRepo.GetByID(req.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Validate set_by user exists
	_, err = s.userRepo.GetByID(req.SetBy)
	if err != nil {
		return nil, fmt.Errorf("set_by user not found: %w", err)
	}

	// Convert string IDs to uint
	userIDUint, err := strconv.ParseUint(req.UserID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	orgIDUint, err := strconv.ParseUint(req.OrganizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	setByUint, err := strconv.ParseUint(req.SetBy, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid set_by user ID: %w", err)
	}

	// Check if KRA already exists for this user and year
	existingKRAs, err := s.kraRepo.GetByUserAndYear(req.UserID, req.OrganizationID, req.Year)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing KRAs: %w", err)
	}

	// Check total weight doesn't exceed 100%
	totalWeight := req.Weight
	for _, kra := range existingKRAs {
		totalWeight += kra.Weight
	}

	if totalWeight > 100 {
		return nil, fmt.Errorf("total KRA weight cannot exceed 100%%. Current total: %.2f%%", totalWeight)
	}

	kra := &models.KRA{
		UserID:          uint(userIDUint),
		OrganizationID:  uint(orgIDUint),
		Year:            req.Year,
		Title:           req.Title,
		Description:     req.Description,
		Weight:          req.Weight,
		TargetValue:     req.TargetValue,
		MeasurementUnit: req.MeasurementUnit,
		Status:          "draft",
		SetBy:           uint(setByUint),
		SetAt:           time.Now(),
	}

	if err := s.kraRepo.Create(kra); err != nil {
		return nil, fmt.Errorf("failed to create KRA: %w", err)
	}

	// Log audit entry
	kraIDStr := strconv.FormatUint(uint64(kra.ID), 10)
	
	auditReq := AuditActionRequest{
		OrganizationID: strconv.FormatUint(uint64(kra.OrganizationID), 10),
		Action:         "CREATE",
		EntityType:     "KRA",
		EntityID:       kraIDStr,
		ChangedBy:      strconv.FormatUint(uint64(setByUint), 10),
		ChangeSummary:  fmt.Sprintf("Created KRA '%s' for user %s (Year: %d)", kra.Title, user.Name, kra.Year),
		NewValues:      fmt.Sprintf(`{"title":"%s","weight":%.2f,"target_value":"%s"}`, kra.Title, kra.Weight, kra.TargetValue),
	}

	if err := s.auditService.LogAction(auditReq, nil); err != nil {
		// Log error but don't fail the operation
		fmt.Printf("Failed to log audit entry: %v\n", err)
	}

	// Send notification to the user
	if err := s.notificationService.SendKRANotification(kra, user, "created"); err != nil {
		fmt.Printf("Failed to send KRA notification: %v\n", err)
	}

	return kra, nil
}

// GetKRA retrieves a KRA by ID
func (s *kraService) GetKRA(id string) (*models.KRA, error) {
	return s.kraRepo.GetByID(id)
}

// GetUserKRAs retrieves KRAs for a specific user and year
func (s *kraService) GetUserKRAs(userID, organizationID string, year int) ([]models.KRA, error) {
	return s.kraRepo.GetByUserAndYear(userID, organizationID, year)
}

// GetAllUserKRAs retrieves all KRAs for a specific user
func (s *kraService) GetAllUserKRAs(userID, organizationID string) ([]models.KRA, error) {
	return s.kraRepo.GetByUser(userID, organizationID)
}

// GetTeamKRAs retrieves KRAs for all team members managed by a manager
func (s *kraService) GetTeamKRAs(managerID, organizationID string, year int) ([]models.KRA, error) {
	return s.kraRepo.GetTeamKRAs(managerID, organizationID, year)
}

// UpdateKRA updates an existing KRA
func (s *kraService) UpdateKRA(id string, req UpdateKRARequest) (*models.KRA, error) {
	kra, err := s.kraRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("KRA not found: %w", err)
	}

	// Update fields if provided
	if req.Title != nil {
		kra.Title = *req.Title
	}
	if req.Description != nil {
		kra.Description = *req.Description
	}
	if req.Weight != nil {
		kra.Weight = *req.Weight
	}
	if req.TargetValue != nil {
		kra.TargetValue = *req.TargetValue
	}
	if req.MeasurementUnit != nil {
		kra.MeasurementUnit = *req.MeasurementUnit
	}
	if req.Status != nil {
		kra.Status = *req.Status
	}

	if err := s.kraRepo.Update(kra); err != nil {
		return nil, fmt.Errorf("failed to update KRA: %w", err)
	}

	// Log audit entry
	kraIDStr := strconv.FormatUint(uint64(kra.ID), 10)
	
	auditReq := AuditActionRequest{
		OrganizationID: strconv.FormatUint(uint64(kra.OrganizationID), 10),
		Action:         "UPDATE",
		EntityType:     "KRA",
		EntityID:       kraIDStr,
		ChangedBy:      strconv.FormatUint(uint64(kra.SetBy), 10),
		ChangeSummary:  fmt.Sprintf("Updated KRA '%s'", kra.Title),
		NewValues:      fmt.Sprintf(`{"title":"%s","weight":%.2f,"status":"%s"}`, kra.Title, kra.Weight, kra.Status),
	}

	if err := s.auditService.LogAction(auditReq, nil); err != nil {
		fmt.Printf("Failed to log audit entry: %v\n", err)
	}

	return kra, nil
}

// EvaluateKRA evaluates a KRA with actual performance data
func (s *kraService) EvaluateKRA(id string, req EvaluateKRARequest) (*models.KRA, error) {
	kra, err := s.kraRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("KRA not found: %w", err)
	}

	// Validate evaluator exists
	_, err = s.userRepo.GetByID(req.EvaluatedBy)
	if err != nil {
		return nil, fmt.Errorf("evaluator not found: %w", err)
	}

	// Convert string ID to uint
	evaluatedByUint, err := strconv.ParseUint(req.EvaluatedBy, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid evaluator ID: %w", err)
	}

	// Update evaluation fields
	kra.ActualValue = &req.ActualValue
	kra.Rating = &req.Rating
	kra.Comments = &req.Comments
	kra.EmployeeComments = &req.EmployeeComments
	evaluatedByUint32 := uint(evaluatedByUint)
	kra.EvaluatedBy = &evaluatedByUint32
	now := time.Now()
	kra.EvaluatedAt = &now
	kra.Status = "completed"

	if err := s.kraRepo.Update(kra); err != nil {
		return nil, fmt.Errorf("failed to evaluate KRA: %w", err)
	}

	// Log audit entry
	kraIDStr := strconv.FormatUint(uint64(kra.ID), 10)
	
	auditReq := AuditActionRequest{
		OrganizationID: strconv.FormatUint(uint64(kra.OrganizationID), 10),
		Action:         "UPDATE",
		EntityType:     "KRA",
		EntityID:       kraIDStr,
		ChangedBy:      req.EvaluatedBy,
		ChangeSummary:  fmt.Sprintf("Evaluated KRA '%s' with rating %.1f", kra.Title, req.Rating),
		NewValues:      fmt.Sprintf(`{"actual_value":"%s","rating":%.1f,"status":"completed"}`, req.ActualValue, req.Rating),
	}

	if err := s.auditService.LogAction(auditReq, nil); err != nil {
		fmt.Printf("Failed to log audit entry: %v\n", err)
	}

	return kra, nil
}

// DeleteKRA deletes a KRA
func (s *kraService) DeleteKRA(id string) error {
	kra, err := s.kraRepo.GetByID(id)
	if err != nil {
		return fmt.Errorf("KRA not found: %w", err)
	}

	if err := s.kraRepo.Delete(id); err != nil {
		return fmt.Errorf("failed to delete KRA: %w", err)
	}

	// Log audit entry
	kraIDStr := strconv.FormatUint(uint64(kra.ID), 10)
	
	auditReq := AuditActionRequest{
		OrganizationID: strconv.FormatUint(uint64(kra.OrganizationID), 10),
		Action:         "DELETE",
		EntityType:     "KRA",
		EntityID:       kraIDStr,
		ChangedBy:      strconv.FormatUint(uint64(kra.SetBy), 10),
		ChangeSummary:  fmt.Sprintf("Deleted KRA '%s'", kra.Title),
		OldValues:      fmt.Sprintf(`{"title":"%s","weight":%.2f}`, kra.Title, kra.Weight),
	}

	if err := s.auditService.LogAction(auditReq, nil); err != nil {
		fmt.Printf("Failed to log audit entry: %v\n", err)
	}

	return nil
}

// ListKRAs lists KRAs with optional filters
func (s *kraService) ListKRAs(organizationID string, filters map[string]interface{}) ([]models.KRA, error) {
	return s.kraRepo.List(organizationID, filters)
}

// GetKRASummary calculates a summary of KRA performance for a user
func (s *kraService) GetKRASummary(userID, organizationID string, year int) (*KRASummary, error) {
	kras, err := s.kraRepo.GetByUserAndYear(userID, organizationID, year)
	if err != nil {
		return nil, fmt.Errorf("failed to get KRAs: %w", err)
	}

	if len(kras) == 0 {
		return &KRASummary{
			UserID:        userID,
			Year:          year,
			TotalKRAs:     0,
			CompletedKRAs: 0,
			AverageRating: 0,
			TotalWeight:   0,
			WeightedScore: 0,
			OverallRating: "No KRAs",
			KRAs:          []models.KRA{},
		}, nil
	}

	// Get user name
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Calculate summary metrics
	totalKRAs := len(kras)
	completedKRAs := 0
	totalWeight := 0.0
	weightedScore := 0.0
	totalRating := 0.0
	ratedCount := 0

	for _, kra := range kras {
		totalWeight += kra.Weight
		
		if kra.Status == "completed" {
			completedKRAs++
		}
		
		if kra.Rating != nil {
			totalRating += *kra.Rating
			ratedCount++
			weightedScore += (*kra.Rating * kra.Weight / 100.0)
		}
	}

	averageRating := 0.0
	if ratedCount > 0 {
		averageRating = totalRating / float64(ratedCount)
	}

	// Determine overall rating
	overallRating := "Not Evaluated"
	if completedKRAs > 0 {
		if averageRating >= 4.5 {
			overallRating = "Outstanding"
		} else if averageRating >= 3.5 {
			overallRating = "Exceeds Expectations"
		} else if averageRating >= 2.5 {
			overallRating = "Meets Expectations"
		} else if averageRating >= 1.5 {
			overallRating = "Below Expectations"
		} else if averageRating > 0 {
			overallRating = "Unsatisfactory"
		}
	}

	return &KRASummary{
		UserID:        userID,
		UserName:      user.Name,
		Year:          year,
		TotalKRAs:     totalKRAs,
		CompletedKRAs: completedKRAs,
		AverageRating: averageRating,
		TotalWeight:   totalWeight,
		WeightedScore: weightedScore,
		OverallRating: overallRating,
		KRAs:          kras,
	}, nil
}
