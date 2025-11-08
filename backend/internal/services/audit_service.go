package services

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
)

// auditService implements AuditService interface
type auditService struct {
	repo     repositories.AuditLogRepository
	userRepo repositories.UserRepository
}

func NewAuditService(repo repositories.AuditLogRepository, userRepo repositories.UserRepository) AuditService {
	return &auditService{
		repo:     repo,
		userRepo: userRepo,
	}
}

func (s *auditService) LogAction(req AuditActionRequest, httpReq *http.Request) error {
	// Convert organization ID
	orgIDUint, err := strconv.ParseUint(req.OrganizationID, 10, 32)
	if err != nil {
		return fmt.Errorf("invalid organization ID: %w", err)
	}

	// Convert user ID
	userIDUint, err := strconv.ParseUint(req.ChangedBy, 10, 32)
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}

	// Prepare old and new values as JSON strings
	var oldValuesStr, newValuesStr *string
	if req.OldValues != nil {
		if oldBytes, err := json.Marshal(req.OldValues); err == nil {
			oldStr := string(oldBytes)
			oldValuesStr = &oldStr
		}
	}
	if req.NewValues != nil {
		if newBytes, err := json.Marshal(req.NewValues); err == nil {
			newStr := string(newBytes)
			newValuesStr = &newStr
		}
	}

	// Get IP and UserAgent from request if available
	ipAddress := ""
	userAgent := ""
	if httpReq != nil {
		ipAddress = s.getClientIP(httpReq)
		userAgent = httpReq.Header.Get("User-Agent")
		if len(userAgent) > 500 {
			userAgent = userAgent[:500] // Limit length
		}
	}

	auditLog := &models.AuditLog{
		OrganizationID: uint(orgIDUint),
		Action:         req.Action,
		EntityType:     req.EntityType,
		EntityID:       req.EntityID,
		ChangedBy:      uint(userIDUint),
		ChangeSummary:  req.ChangeSummary,
		OldValues:      oldValuesStr,
		NewValues:      newValuesStr,
		IPAddress:      ipAddress,
		UserAgent:      userAgent,
		CreatedAt:      time.Now(),
	}

	return s.repo.Create(auditLog)
}

// Helper functions for common audit log scenarios

func (s *auditService) LogUserChange(organizationID, userID, changedBy string, action string, oldUser, newUser *models.User, req *http.Request) error {
	var changeSummary string

	switch action {
	case "CREATE":
		changeSummary = fmt.Sprintf("%s %s was created", newUser.Name, newUser.Role)
	case "UPDATE":
		// Compare key fields and create summary
		changes := []string{}
		if oldUser != nil && newUser != nil {
			if oldUser.Name != newUser.Name {
				changes = append(changes, fmt.Sprintf("Name: %s → %s", oldUser.Name, newUser.Name))
			}
			if oldUser.Role != newUser.Role {
				changes = append(changes, fmt.Sprintf("Role: %s → %s", oldUser.Role, newUser.Role))
			}
			if oldUser.CTC != newUser.CTC {
				changes = append(changes, "CTC: Changed")
			}
			if oldUser.Department != newUser.Department {
				changes = append(changes, fmt.Sprintf("Department: %s → %s", oldUser.Department, newUser.Department))
			}
		}
		if len(changes) == 0 {
			changeSummary = fmt.Sprintf("%s's profile was updated", newUser.Name)
		} else {
			changeSummary = fmt.Sprintf("%s: %s", newUser.Name, strings.Join(changes, ", "))
		}
	case "DELETE":
		changeSummary = fmt.Sprintf("%s %s was deleted", oldUser.Name, oldUser.Role)
	default:
		changeSummary = fmt.Sprintf("User %s", action)
	}

	// Find who made the change
	var changedByUser *models.User
	if changedBy != "" {
		if user, err := s.userRepo.GetByID(changedBy); err == nil {
			changedByUser = user
		}
	}

	changedByName := "unknown"
	if changedByUser != nil {
		changedByName = changedByUser.Name
	}
	changeSummary += fmt.Sprintf(" - By %s", changedByName)

	return s.LogAction(AuditActionRequest{
		OrganizationID: organizationID,
		Action:         action,
		EntityType:     "USER",
		EntityID:       userID,
		ChangedBy:      changedBy,
		ChangeSummary:  changeSummary,
		OldValues:      oldUser,
		NewValues:      newUser,
	}, req)
}

func (s *auditService) LogDocumentChange(organizationID, documentID, changedBy string, action string, changeSummary string, req *http.Request) error {
	// Find who made the change
	var changedByUser *models.User
	if changedBy != "" {
		if user, err := s.userRepo.GetByID(changedBy); err == nil {
			changedByUser = user
		}
	}

	changedByName := "unknown"
	if changedByUser != nil {
		changedByName = changedByUser.Name
	}
	changeSummary += fmt.Sprintf(" - By %s", changedByName)

	return s.LogAction(AuditActionRequest{
		OrganizationID: organizationID,
		Action:         action,
		EntityType:     "DOCUMENT",
		EntityID:       documentID,
		ChangedBy:      changedBy,
		ChangeSummary:  changeSummary,
	}, req)
}

func (s *auditService) LogLeaveChange(organizationID, leaveID, changedBy string, action string, changeSummary string, req *http.Request) error {
	// Find who made the change
	var changedByUser *models.User
	if changedBy != "" {
		if user, err := s.userRepo.GetByID(changedBy); err == nil {
			changedByUser = user
		}
	}

	changedByName := "unknown"
	if changedByUser != nil {
		changedByName = changedByUser.Name
	}
	changeSummary += fmt.Sprintf(" - By %s", changedByName)

	return s.LogAction(AuditActionRequest{
		OrganizationID: organizationID,
		Action:         action,
		EntityType:     "LEAVE",
		EntityID:       leaveID,
		ChangedBy:      changedBy,
		ChangeSummary:  changeSummary,
	}, req)
}

func (s *auditService) LogOffSiteChange(organizationID, offSiteID, changedBy string, action string, changeSummary string, req *http.Request) error {
	// Find who made the change
	var changedByUser *models.User
	if changedBy != "" {
		if user, err := s.userRepo.GetByID(changedBy); err == nil {
			changedByUser = user
		}
	}

	changedByName := "unknown"
	if changedByUser != nil {
		changedByName = changedByUser.Name
	}
	changeSummary += fmt.Sprintf(" - By %s", changedByName)

	return s.LogAction(AuditActionRequest{
		OrganizationID: organizationID,
		Action:         action,
		EntityType:     "OFF_SITE",
		EntityID:       offSiteID,
		ChangedBy:      changedBy,
		ChangeSummary:  changeSummary,
	}, req)
}

func (s *auditService) LogSalarySlipChange(organizationID, salarySlipID, changedBy string, action string, changeSummary string, req *http.Request) error {
	// Find who made the change
	var changedByUser *models.User
	if changedBy != "" {
		if user, err := s.userRepo.GetByID(changedBy); err == nil {
			changedByUser = user
		}
	}

	changedByName := "unknown"
	if changedByUser != nil {
		changedByName = changedByUser.Name
	}
	changeSummary += fmt.Sprintf(" - By %s", changedByName)

	return s.LogAction(AuditActionRequest{
		OrganizationID: organizationID,
		Action:         action,
		EntityType:     "SALARY_SLIP",
		EntityID:       salarySlipID,
		ChangedBy:      changedBy,
		ChangeSummary:  changeSummary,
	}, req)
}

func (s *auditService) GetAuditLogs(organizationID string, filters map[string]interface{}) ([]models.AuditLog, error) {
	return s.repo.List(organizationID, filters)
}

func (s *auditService) CountAuditLogs(organizationID string, filters map[string]interface{}) (int64, error) {
	return s.repo.Count(organizationID, filters)
}

func (s *auditService) GetEntityAuditLogs(entityType, entityID string) ([]models.AuditLog, error) {
	return s.repo.GetByEntity(entityType, entityID)
}

func (s *auditService) GetUserAuditLogs(userID string) ([]models.AuditLog, error) {
	return s.repo.GetByUser(userID)
}

func (s *auditService) DeleteOldLogs(organizationID string, olderThan time.Time) error {
	return s.repo.Delete(organizationID, olderThan)
}

func (s *auditService) DeleteEntityLogs(entityType, entityID string) error {
	return s.repo.DeleteByEntity(entityType, entityID)
}

// AddDummyLogs creates some sample audit logs for testing
func (s *auditService) AddDummyLogs(organizationID string) error {
	// Use the provided organization ID
	orgID := organizationID

	// Check if dummy logs already exist for this organization
	existingLogs, _ := s.repo.List(orgID, map[string]interface{}{})
	if len(existingLogs) > 0 {
		// Dummy logs already exist, don't add more
		return nil
	}

	// Convert orgID to uint for database
	orgIDUint, err := strconv.ParseUint(orgID, 10, 32)
	if err != nil {
		return fmt.Errorf("invalid organization ID: %w", err)
	}

	// Create sample audit logs for the specific organization
	dummyLogs := []models.AuditLog{
		{
			BaseModel: models.BaseModel{
				CreatedAt: time.Now().Add(-2 * 24 * time.Hour),
				UpdatedAt: time.Now().Add(-2 * 24 * time.Hour),
			},
			OrganizationID: uint(orgIDUint),
			Action:         "CREATE",
			EntityType:     "USER",
			EntityID:       "33",
			ChangedBy:      19,
			ChangeSummary:  "John Doe was created",
			IPAddress:      "127.0.0.1",
		},
		{
			BaseModel: models.BaseModel{
				CreatedAt: time.Now().Add(-1 * 24 * time.Hour),
				UpdatedAt: time.Now().Add(-1 * 24 * time.Hour),
			},
			OrganizationID: uint(orgIDUint),
			Action:         "UPDATE",
			EntityType:     "USER",
			EntityID:       "33",
			ChangedBy:      19,
			ChangeSummary:  "John Doe's CTC was changed - ₹50,000 → ₹60,000",
			IPAddress:      "127.0.0.1",
		},
		{
			BaseModel: models.BaseModel{
				CreatedAt: time.Now().Add(-30 * time.Minute),
				UpdatedAt: time.Now().Add(-30 * time.Minute),
			},
			OrganizationID: uint(orgIDUint),
			Action:         "CREATE",
			EntityType:     "LEAVE",
			EntityID:       "1",
			ChangedBy:      33,
			ChangeSummary:  "Leave application submitted: Sick Leave from 2024-01-15 to 2024-01-17",
			IPAddress:      "127.0.0.1",
		},
		{
			BaseModel: models.BaseModel{
				CreatedAt: time.Now().Add(-15 * time.Minute),
				UpdatedAt: time.Now().Add(-15 * time.Minute),
			},
			OrganizationID: uint(orgIDUint),
			Action:         "APPROVE",
			EntityType:     "LEAVE",
			EntityID:       "1",
			ChangedBy:      19,
			ChangeSummary:  "Leave approved:	Sick Leave from 2024-01-15 to 2024-01-17",
			IPAddress:      "127.0.0.1",
		},
		{
			BaseModel: models.BaseModel{
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
			OrganizationID: uint(orgIDUint),
			Action:         "CREATE",
			EntityType:     "DOCUMENT",
			EntityID:       "1",
			ChangedBy:      33,
			ChangeSummary:  "Document 'Employment Contract.pdf' uploaded",
			IPAddress:      "127.0.0.1",
		},
	}

	// Insert dummy logs
	for _, log := range dummyLogs {
		if err := s.repo.Create(&log); err != nil {
			// Continue if some logs fail to insert
			continue
		}
	}
	return nil
}

// Helper to get client IP from request
func (s *auditService) getClientIP(req *http.Request) string {
	// Check for forwarded IP
	ip := req.Header.Get("X-Forwarded-For")
	if ip != "" {
		return ip
	}

	ip = req.Header.Get("X-Real-IP")
	if ip != "" {
		return ip
	}

	// Get from RemoteAddr
	ip, _, err := net.SplitHostPort(req.RemoteAddr)
	if err != nil {
		return req.RemoteAddr
	}

	return ip
}
