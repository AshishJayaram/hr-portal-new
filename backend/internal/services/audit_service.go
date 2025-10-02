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
				changes = append(changes, fmt.Sprintf("CTC: ₹%.0f → ₹%.0f", oldUser.CTC, newUser.CTC))
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

	changeSummary += fmt.Sprintf(" - By %s", changedByUser.Name)

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

	changeSummary += fmt.Sprintf(" - By %s", changedByUser.Name)

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

	changeSummary += fmt.Sprintf(" - By %s", changedByUser.Name)

	return s.LogAction(AuditActionRequest{
		OrganizationID: organizationID,
		Action:         action,
		EntityType:     "LEAVE",
		EntityID:       leaveID,
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

	changeSummary += fmt.Sprintf(" - By %s", changedByUser.Name)

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

func (s *auditService) GetEntityAuditLogs(entityType, entityID string) ([]models.AuditLog, error) {
	return s.repo.GetByEntity(entityType, entityID)
}

func (s *auditService) GetUserAuditLogs(userID string) ([]models.AuditLog, error) {
	return s.repo.GetByUser(userID)
}

func (s *auditService) DeleteOldLogs(organizationID string, olderThan time.Time) error {
	return s.repo.Delete(organizationID, olderThan)
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
