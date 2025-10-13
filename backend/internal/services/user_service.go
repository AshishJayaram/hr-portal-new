package services

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
	"hr-portal-backend/internal/utils"
)

// userService implements UserService interface
type userService struct {
	userRepo            repositories.UserRepository
	organizationRepo    repositories.OrganizationRepository
	leaveAllocationRepo repositories.LeaveAllocationRepository
	auditService        AuditService
}

// NewUserService creates a new user service
func NewUserService(userRepo repositories.UserRepository, organizationRepo repositories.OrganizationRepository, leaveAllocationRepo repositories.LeaveAllocationRepository, auditService AuditService) UserService {
	return &userService{
		userRepo:            userRepo,
		organizationRepo:    organizationRepo,
		leaveAllocationRepo: leaveAllocationRepo,
		auditService:        auditService,
	}
}

func (s *userService) CreateUser(req CreateUserRequest, httpReq *http.Request) (*models.User, error) {
	// Validate organization exists
	_, err := s.organizationRepo.GetByID(req.OrganizationID)
	if err != nil {
		return nil, fmt.Errorf("organization not found: %w", err)
	}

	// Check if username already exists across all organizations
	existingUser, _ := s.userRepo.GetByUsernameAcrossOrgs(req.Username)
	if existingUser != nil {
		return nil, fmt.Errorf("username already exists")
	}

	// Check if email already exists in organization
	existingUser, _ = s.userRepo.GetByEmail(req.Email, req.OrganizationID)
	if existingUser != nil {
		return nil, fmt.Errorf("email already exists")
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Parse organization ID
	orgID, err := strconv.ParseUint(req.OrganizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	// Parse manager ID if provided
	var managerID *uint
	if req.ManagerID != "" {
		managerIDUint, err := strconv.ParseUint(req.ManagerID, 10, 32)
		if err != nil {
			return nil, fmt.Errorf("invalid manager ID: %w", err)
		}
		managerIDUintPtr := uint(managerIDUint)
		managerID = &managerIDUintPtr
	}

	// Create user
	user := &models.User{
		OrganizationID: uint(orgID),
		Username:       req.Username,
		Email:          req.Email,
		PasswordHash:   hashedPassword,
		Name:           req.Name,
		Designation:    req.Designation,
		Department:     req.Department,
		Role:           req.Role,
		ManagerID:      managerID,
		CTC:            req.CTC,
		IsActive:       true,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Create default leave allocations for the new user
	if err := s.createDefaultLeaveAllocations(user); err != nil {
		// Log the error but don't fail user creation
		fmt.Printf("Warning: Failed to create leave allocations for user %s: %v\n", user.Username, err)
	}

	// Log audit entry for user creation
	orgIDStr := strconv.FormatUint(uint64(user.OrganizationID), 10)
	userIDStr := strconv.FormatUint(uint64(user.ID), 10)

	// Get current user from request context (from middleware)
	changedBy := "19" // Default fallback
	if httpReq != nil {
		// Try to get user ID from context header (set by middleware)
		if userID := httpReq.Header.Get("X-User-ID"); userID != "" {
			changedBy = userID
		}
	}

	// Log the user creation
	if err := s.auditService.LogUserChange(orgIDStr, userIDStr, changedBy, "CREATE", nil, user, httpReq); err != nil {
		fmt.Printf("Failed to log audit: %v\n", err)
	}

	return user, nil
}

func (s *userService) GetUser(id string) (*models.User, error) {
	user, err := s.userRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return user, nil
}

func (s *userService) ListUsers(organizationID string, filters map[string]interface{}) ([]models.User, error) {
	users, err := s.userRepo.List(organizationID, filters)
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}
	return users, nil
}

func (s *userService) UpdateUser(id string, req UpdateUserRequest, httpReq *http.Request) (*models.User, error) {
	// Get existing user
	user, err := s.userRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Store old user for audit logging
	oldUser := *user

	// Update fields if provided
	if req.Username != nil {
		// Check if username already exists across all organizations
		existingUser, _ := s.userRepo.GetByUsernameAcrossOrgs(*req.Username)
		if existingUser != nil && existingUser.ID != user.ID {
			return nil, fmt.Errorf("username already exists")
		}
		user.Username = *req.Username
	}

	if req.Email != nil {
		// Check if email already exists
		existingUser, _ := s.userRepo.GetByEmail(*req.Email, strconv.FormatUint(uint64(user.OrganizationID), 10))
		if existingUser != nil && existingUser.ID != user.ID {
			return nil, fmt.Errorf("email already exists")
		}
		user.Email = *req.Email
	}

	if req.Name != nil {
		user.Name = *req.Name
	}

	if req.Designation != nil {
		user.Designation = *req.Designation
	}

	if req.Department != nil {
		user.Department = *req.Department
	}

	if req.Role != nil {
		user.Role = *req.Role
	}

	if req.ManagerID != nil {
		if *req.ManagerID == "" {
			user.ManagerID = nil
		} else {
			// Prevent self-assignment as manager
			if *req.ManagerID == id {
				return nil, fmt.Errorf("an employee cannot be assigned as their own manager")
			}

			managerIDUint, err := strconv.ParseUint(*req.ManagerID, 10, 32)
			if err != nil {
				return nil, fmt.Errorf("invalid manager ID: %w", err)
			}

			// Check for circular dependency
			if err := s.checkCircularDependency(id, uint(managerIDUint)); err != nil {
				return nil, err
			}

			managerIDUintPtr := uint(managerIDUint)
			user.ManagerID = &managerIDUintPtr
		}
	}

	if req.CTC != nil {
		user.CTC = *req.CTC
	}

	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}

	// Update user
	if err := s.userRepo.Update(user); err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	// Refetch user with updated relationships
	updatedUser, err := s.userRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to refetch updated user: %w", err)
	}
	user = updatedUser

	// Log audit entry for user update
	if req.CTC != nil || req.Name != nil || req.Role != nil || req.Department != nil || req.Designation != nil {
		orgID := strconv.FormatUint(uint64(user.OrganizationID), 10)

		// Get current user from request context (from middleware)
		changedBy := "19" // Default fallback
		if httpReq != nil {
			if userID := httpReq.Header.Get("X-User-ID"); userID != "" {
				changedBy = userID
			}
		}

		// Log the user change (ignore any errors for now)
		if err := s.auditService.LogUserChange(orgID, id, changedBy, "UPDATE", &oldUser, user, httpReq); err != nil {
			fmt.Printf("Failed to log audit: %v\n", err)
		}
	}

	return user, nil
}

func (s *userService) DeleteUser(id string, httpReq *http.Request) error {
	// Get user before deletion for audit logging
	user, err := s.userRepo.GetByID(id)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}

	if err := s.userRepo.Delete(id); err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	// Log audit entry for user deletion
	orgID := strconv.FormatUint(uint64(user.OrganizationID), 10)

	// Get current user from request context (from middleware)
	changedBy := "19" // Default fallback
	if httpReq != nil {
		if userID := httpReq.Header.Get("X-User-ID"); userID != "" {
			changedBy = userID
		}
	}

	// Log the user deletion
	if err := s.auditService.LogUserChange(orgID, id, changedBy, "DELETE", user, nil, httpReq); err != nil {
		fmt.Printf("Failed to log audit: %v\n", err)
	}

	return nil
}

func (s *userService) ChangePassword(userID, currentPassword, newPassword string) error {
	// Get user
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}

	// Verify current password
	if !utils.CheckPasswordHash(currentPassword, user.PasswordHash) {
		return fmt.Errorf("current password is incorrect")
	}

	// Validate new password strength
	if err := utils.ValidatePasswordStrength(newPassword); err != nil {
		return fmt.Errorf("new password validation failed: %w", err)
	}

	// Hash new password
	hashedPassword, err := utils.HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("failed to hash new password: %w", err)
	}

	// Update password
	user.PasswordHash = hashedPassword
	if err := s.userRepo.Update(user); err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	return nil
}

func (s *userService) IsSubordinate(organizationID, managerID, subordinateID string) (bool, error) {
	return s.userRepo.IsSubordinate(organizationID, managerID, subordinateID)
}

func (s *userService) GetSubordinates(organizationID, managerID string) ([]models.User, error) {
	return s.userRepo.GetSubordinates(organizationID, managerID)
}

// createDefaultLeaveAllocations creates default leave allocations for a new user
func (s *userService) createDefaultLeaveAllocations(user *models.User) error {
	// Create default allocations based on common leave types
	currentYear := time.Now().Year()

	// Default leave allocations (these should ideally come from organization settings)
	defaultAllocations := []struct {
		categoryName string
		totalDays    int
	}{
		{"Sick Leave", 12},
		{"Casual Leave", 12},
		{"Professional Leave", 5},
		{"Annual Leave", 21},
	}

	// Create allocations for each default category
	for _, alloc := range defaultAllocations {
		allocation := &models.LeaveAllocation{
			UserID:         user.ID,
			OrganizationID: user.OrganizationID,
			CategoryName:   alloc.categoryName,
			TotalDays:      alloc.totalDays,
			UsedDays:       0,
			RemainingDays:  alloc.totalDays,
			Year:           currentYear,
		}

		// Create the allocation directly using the repository
		if err := s.leaveAllocationRepo.Create(allocation); err != nil {
			fmt.Printf("Failed to create leave allocation %s for user %s: %v\n", alloc.categoryName, user.Username, err)
			// Continue with other allocations even if one fails
		}
	}

	return nil
}

func (s *userService) Count(count *int64) error {
	return s.userRepo.Count(count)
}

func (s *userService) ListAll() ([]models.User, error) {
	return s.userRepo.ListAll()
}

func (s *userService) GetAdminByOrganizationID(organizationID string) (*models.User, error) {
	return s.userRepo.GetAdminByOrganizationID(organizationID)
}

// checkCircularDependency checks if assigning the given manager would create a circular dependency
func (s *userService) checkCircularDependency(userID string, managerID uint) error {
	// Get the user to access organization ID
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}

	organizationID := strconv.FormatUint(uint64(user.OrganizationID), 10)

	// Get the user's current subordinates
	subordinates, err := s.userRepo.GetSubordinates(organizationID, userID)
	if err != nil {
		return fmt.Errorf("failed to get subordinates: %w", err)
	}

	// Check if the proposed manager is in the user's subordinate chain
	return s.checkSubordinateChain(subordinates, managerID, organizationID)
}

// checkSubordinateChain recursively checks if the managerID exists in the subordinate chain
func (s *userService) checkSubordinateChain(subordinates []models.User, managerID uint, organizationID string) error {
	for _, subordinate := range subordinates {
		// Direct subordinate check
		if subordinate.ID == managerID {
			return fmt.Errorf("cannot assign manager: would create circular dependency (manager is a direct subordinate)")
		}

		// Recursive check for indirect subordinates
		indirectSubordinates, err := s.userRepo.GetSubordinates(organizationID, strconv.FormatUint(uint64(subordinate.ID), 10))
		if err != nil {
			continue // Skip if we can't get subordinates
		}

		if err := s.checkSubordinateChain(indirectSubordinates, managerID, organizationID); err != nil {
			return err
		}
	}

	return nil
}
