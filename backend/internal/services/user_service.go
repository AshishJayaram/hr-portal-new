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
	leaveCategoryRepo   repositories.LeaveCategoryRepository
	auditService        AuditService
	notificationService NotificationService
}

// NewUserService creates a new user service
func NewUserService(userRepo repositories.UserRepository, organizationRepo repositories.OrganizationRepository, leaveAllocationRepo repositories.LeaveAllocationRepository, leaveCategoryRepo repositories.LeaveCategoryRepository, auditService AuditService, notificationService NotificationService) UserService {
	return &userService{
		userRepo:            userRepo,
		organizationRepo:    organizationRepo,
		leaveAllocationRepo: leaveAllocationRepo,
		leaveCategoryRepo:   leaveCategoryRepo,
		auditService:        auditService,
		notificationService: notificationService,
	}
}

// generateEmployeeID generates a unique Employee ID based on the user's database ID
// Format: EMP{padded_id} where id is padded to 6 digits (e.g., EMP000001, EMP000123)
// If the generated ID already exists, it will try alternative formats
func (s *userService) generateEmployeeID(userID uint, organizationID string) string {
	baseID := fmt.Sprintf("EMP%06d", userID)

	// Check if this ID already exists in the organization
	existingUser, _ := s.userRepo.GetByEmployeeID(baseID, organizationID)
	if existingUser == nil {
		return baseID
	}

	// If ID exists, try alternative formats
	for i := 1; i < 1000; i++ {
		altID := fmt.Sprintf("EMP%06d-%d", userID, i)
		existingUser, _ := s.userRepo.GetByEmployeeID(altID, organizationID)
		if existingUser == nil {
			return altID
		}
	}

	// Fallback: use timestamp-based ID if all alternatives fail
	return fmt.Sprintf("EMP%06d-%d", userID, time.Now().Unix()%10000)
}

func (s *userService) CreateUser(req CreateUserRequest, httpReq *http.Request) (*models.User, error) {
	// Validate organization exists and get organization details
	org, err := s.organizationRepo.GetByID(req.OrganizationID)
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

	// Check if employee_id already exists in organization (if provided)
	if req.EmployeeID != "" {
		existingUser, _ = s.userRepo.GetByEmployeeID(req.EmployeeID, req.OrganizationID)
		if existingUser != nil {
			return nil, fmt.Errorf("employee ID already exists in this organization")
		}
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
		EmployeeID:     req.EmployeeID,
		CTC:            "", // Will be set after encryption
		IsActive:       true,
	}

	// Encrypt CTC if provided
	if req.CTC > 0 {
		encryptedCTC, err := utils.EncryptFloat64(req.CTC)
		if err != nil {
			return nil, fmt.Errorf("failed to encrypt CTC: %w", err)
		}
		user.CTC = encryptedCTC
	}

	// Set joining date if provided
	if req.JoiningDate != nil && *req.JoiningDate != "" {
		joiningDate, err := time.Parse("2006-01-02", *req.JoiningDate)
		if err != nil {
			return nil, fmt.Errorf("invalid joining date format: %w", err)
		}
		user.JoiningDate = &joiningDate
	}

	// Set birthday if provided
	if req.Birthday != nil && *req.Birthday != "" {
		birthday, err := time.Parse("2006-01-02", *req.Birthday)
		if err != nil {
			return nil, fmt.Errorf("invalid birthday format: %w", err)
		}
		user.Birthday = &birthday
	}

	// Set hike cycle and calculate next hike date
	hikeCycleMonths := 12 // Default to 12 months
	if req.HikeCycleMonths != nil && *req.HikeCycleMonths > 0 {
		hikeCycleMonths = *req.HikeCycleMonths
	}
	user.HikeCycleMonths = hikeCycleMonths

	// Set last hike date if provided
	if req.LastHikeDate != nil && *req.LastHikeDate != "" {
		lastHikeDate, err := time.Parse("2006-01-02", *req.LastHikeDate)
		if err != nil {
			return nil, fmt.Errorf("invalid last hike date format: %w", err)
		}
		user.LastHikeDate = &lastHikeDate
		// Calculate next hike date from last hike date
		nextHikeDate := lastHikeDate.AddDate(0, hikeCycleMonths, 0)
		user.NextHikeDate = &nextHikeDate
	} else if user.JoiningDate != nil {
		// If no last hike date but joining date exists, calculate from joining date
		nextHikeDate := user.JoiningDate.AddDate(0, hikeCycleMonths, 0)
		user.NextHikeDate = &nextHikeDate
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Generate Employee ID if not provided
	if user.EmployeeID == "" {
		orgIDStr := strconv.FormatUint(uint64(user.OrganizationID), 10)
		user.EmployeeID = s.generateEmployeeID(user.ID, orgIDStr)
		// Update the user with the generated Employee ID
		if err := s.userRepo.Update(user); err != nil {
			// Non-critical error, log but don't fail
		}
	}

	// Note: Leave allocations are created by the frontend after user creation
	// to ensure proper category ID matching. Default allocations are not created
	// automatically to avoid conflicts with user-selected allocations.

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
	}

	// Send welcome email
	go func() {
		// Determine sender name based on role
		var senderName string
		if req.Role == "Admin" || req.Role == "HR" {
			senderName = "The AA HR Team"
		} else {
			senderName = org.Name
		}

		if err := s.notificationService.SendWelcomeEmail(user, senderName, req.Password); err != nil {
		}
	}()

	return user, nil
}

func (s *userService) GetUser(id string) (*models.User, error) {
	user, err := s.userRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Generate Employee ID if missing
	hadEmployeeID := user.EmployeeID != ""
	if !hadEmployeeID {
		orgIDStr := strconv.FormatUint(uint64(user.OrganizationID), 10)
		user.EmployeeID = s.generateEmployeeID(user.ID, orgIDStr)
		// Update the user with the generated Employee ID if it was missing
		if err := s.userRepo.Update(user); err != nil {
			// Non-critical error, log but don't fail
		}
	}

	// Decrypt CTC for display
	if user.CTC != "" {
		decryptedCTC, err := utils.DecryptFloat64(user.CTC)
		if err != nil {
			// If decryption fails, set CTC to 0 (might be old unencrypted data)
			user.CTC = "0"
		} else {
			user.CTC = fmt.Sprintf("%.2f", decryptedCTC)
		}
	}

	return user, nil
}

func (s *userService) ListUsers(organizationID string, filters map[string]interface{}) ([]models.User, error) {
	users, err := s.userRepo.List(organizationID, filters)
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}

	// Generate Employee IDs for users that don't have one
	usersToUpdate := make([]*models.User, 0)
	if len(users) > 0 {
		orgIDStr := organizationID // Use the organizationID parameter directly
		for i := range users {
			if users[i].EmployeeID == "" {
				users[i].EmployeeID = s.generateEmployeeID(users[i].ID, orgIDStr)
				usersToUpdate = append(usersToUpdate, &users[i])
			}

			// Decrypt CTC for all users
			if users[i].CTC != "" {
				decryptedCTC, err := utils.DecryptFloat64(users[i].CTC)
				if err != nil {
					// If decryption fails, set CTC to 0 (might be old unencrypted data)
					users[i].CTC = "0"
				} else {
					users[i].CTC = fmt.Sprintf("%.2f", decryptedCTC)
				}
			}
		}
	}

	// Update users in batch if any Employee IDs were generated
	for _, userToUpdate := range usersToUpdate {
		if err := s.userRepo.Update(userToUpdate); err != nil {
			// Non-critical error, continue
		}
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
	// Track previous manager for audit-only purposes; handled inside atomic reassignment
	// oldManagerID := user.ManagerID

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

	if req.EmployeeID != nil {
		// Check if the new employee_id already exists in the organization (excluding current user)
		if *req.EmployeeID != "" {
			existingUser, _ := s.userRepo.GetByEmployeeID(*req.EmployeeID, strconv.FormatUint(uint64(user.OrganizationID), 10))
			if existingUser != nil && existingUser.ID != user.ID {
				return nil, fmt.Errorf("employee ID already exists in this organization")
			}
		}
		user.EmployeeID = *req.EmployeeID
	}

	// Track manager reassignment; perform atomically later
	var managerReassignRequested bool
	var newManagerIDPtr *uint
	if req.ManagerID != nil {
		managerReassignRequested = true
		if *req.ManagerID == "" {
			newManagerIDPtr = nil
		} else {
			// Prevent self-assignment as manager
			if *req.ManagerID == id {
				return nil, fmt.Errorf("an employee cannot be assigned as their own manager")
			}

			managerIDUint, err := strconv.ParseUint(*req.ManagerID, 10, 32)
			if err != nil {
				return nil, fmt.Errorf("invalid manager ID: %w", err)
			}

			// Check for circular dependency (manager cannot be in user's subordinate chain)
			if err := s.checkCircularDependency(id, uint(managerIDUint)); err != nil {
				return nil, err
			}

			managerID := uint(managerIDUint)
			newManagerIDPtr = &managerID
		}
	}

	if req.CTC != nil {
		if *req.CTC > 0 {
			encryptedCTC, err := utils.EncryptFloat64(*req.CTC)
			if err != nil {
				return nil, fmt.Errorf("failed to encrypt CTC: %w", err)
			}
			user.CTC = encryptedCTC
		} else {
			user.CTC = ""
		}
	}

	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}

	if req.JoiningDate != nil {
		if *req.JoiningDate == "" {
			user.JoiningDate = nil
		} else {
			joiningDate, err := time.Parse("2006-01-02", *req.JoiningDate)
			if err != nil {
				return nil, fmt.Errorf("invalid joining date format: %w", err)
			}
			user.JoiningDate = &joiningDate
		}
	}

	if req.Birthday != nil {
		if *req.Birthday == "" {
			user.Birthday = nil
		} else {
			birthday, err := time.Parse("2006-01-02", *req.Birthday)
			if err != nil {
				return nil, fmt.Errorf("invalid birthday format: %w", err)
			}
			user.Birthday = &birthday
		}
	}

	// Update hike cycle and recalculate next hike date
	if req.HikeCycleMonths != nil {
		user.HikeCycleMonths = *req.HikeCycleMonths
		// Recalculate next hike date if hike cycle changed
		if user.LastHikeDate != nil {
			nextHikeDate := user.LastHikeDate.AddDate(0, user.HikeCycleMonths, 0)
			user.NextHikeDate = &nextHikeDate
		} else if user.JoiningDate != nil {
			nextHikeDate := user.JoiningDate.AddDate(0, user.HikeCycleMonths, 0)
			user.NextHikeDate = &nextHikeDate
		}
	}

	if req.LastHikeDate != nil {
		if *req.LastHikeDate == "" {
			user.LastHikeDate = nil
			// Recalculate next hike date from joining date if last hike date is cleared
			if user.JoiningDate != nil {
				nextHikeDate := user.JoiningDate.AddDate(0, user.HikeCycleMonths, 0)
				user.NextHikeDate = &nextHikeDate
			} else {
				user.NextHikeDate = nil
			}
		} else {
			lastHikeDate, err := time.Parse("2006-01-02", *req.LastHikeDate)
			if err != nil {
				return nil, fmt.Errorf("invalid last hike date format: %w", err)
			}
			user.LastHikeDate = &lastHikeDate
			// Recalculate next hike date from last hike date
			nextHikeDate := lastHikeDate.AddDate(0, user.HikeCycleMonths, 0)
			user.NextHikeDate = &nextHikeDate
		}
	}

	// Update non-manager fields first
	if err := s.userRepo.Update(user); err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	// Perform atomic manager reassignment and optional subordinate transfer
	if managerReassignRequested {
		transferReports := false
		if req.TransferReports != nil {
			transferReports = *req.TransferReports && newManagerIDPtr != nil // only meaningful if assigning a new manager
		}
		if err := s.userRepo.ReassignManagerAtomic(id, newManagerIDPtr, transferReports); err != nil {
			return nil, fmt.Errorf("failed to reassign manager: %w", err)
		}
	}

	// Note: subordinate transfer (if requested) is handled atomically above

	// Refetch user with updated relationships
	updatedUser, err := s.userRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to refetch updated user: %w", err)
	}
	user = updatedUser

	// Generate Employee ID if missing
	hadEmployeeID := user.EmployeeID != ""
	if !hadEmployeeID {
		orgIDStr := strconv.FormatUint(uint64(user.OrganizationID), 10)
		user.EmployeeID = s.generateEmployeeID(user.ID, orgIDStr)
		if err := s.userRepo.Update(user); err != nil {
			// Non-critical error, log but don't fail
		}
	}

	// Log audit entry for user update
	if req.CTC != nil || req.Name != nil || req.Role != nil || req.Department != nil || req.Designation != nil || req.ManagerID != nil {
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
		}
	}

	// Decrypt CTC for display
	if user.CTC != "" {
		decryptedCTC, err := utils.DecryptFloat64(user.CTC)
		if err != nil {
			// If decryption fails, set CTC to 0 (might be old unencrypted data)
			user.CTC = "0"
		} else {
			user.CTC = fmt.Sprintf("%.2f", decryptedCTC)
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
// based on active leave categories in the organization
func (s *userService) createDefaultLeaveAllocations(user *models.User) error {
	currentYear := time.Now().Year()
	orgIDStr := strconv.FormatUint(uint64(user.OrganizationID), 10)

	// Get all active leave categories for the organization
	categories, err := s.leaveCategoryRepo.List(orgIDStr)
	if err != nil {
		// If we can't fetch categories, that's okay - allocations can be added manually
		return fmt.Errorf("failed to fetch leave categories: %w", err)
	}

	// Create allocations for each active category using their default days
	for _, category := range categories {
		if !category.IsActive || category.DefaultDays <= 0 {
			continue // Skip inactive categories or categories with no default days
		}

		allocation := &models.LeaveAllocation{
			UserID:         user.ID,
			OrganizationID: user.OrganizationID,
			CategoryID:     category.ID,
			CategoryName:   category.Name,
			TotalDays:      category.DefaultDays,
			UsedDays:       0,
			RemainingDays:  category.DefaultDays,
			Year:           currentYear,
		}

		// Create the allocation using the repository
		if err := s.leaveAllocationRepo.Create(allocation); err != nil {
			// Error creating allocation - continue with other allocations
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

// handleManagerChangeWithReportTransfer handles transferring reports when a manager changes
func (s *userService) handleManagerChangeWithReportTransfer(userID string, oldManagerID, newManagerID *uint, httpReq *http.Request) error {

	// Get the user to access organization ID
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}
	organizationID := strconv.FormatUint(uint64(user.OrganizationID), 10)

	// Get current subordinates of the user
	subordinates, err := s.userRepo.GetSubordinates(organizationID, userID)
	if err != nil {
		return fmt.Errorf("failed to get subordinates: %w", err)
	}

	if len(subordinates) == 0 {
		// No subordinates to transfer
		return nil
	}

	// Transfer all subordinates to the new manager
	for _, subordinate := range subordinates {
		// Update the subordinate's manager
		subordinate.ManagerID = newManagerID
		if err := s.userRepo.Update(&subordinate); err != nil {
			continue
		}

		// Log audit entry for subordinate transfer
		subordinateOrgID := strconv.FormatUint(uint64(subordinate.OrganizationID), 10)
		subordinateID := strconv.FormatUint(uint64(subordinate.ID), 10)

		// Get current user from request context
		changedBy := "19" // Default fallback
		if httpReq != nil {
			if userID := httpReq.Header.Get("X-User-ID"); userID != "" {
				changedBy = userID
			}
		}

		// Create old subordinate for audit logging
		oldSubordinate := subordinate
		if oldManagerID != nil {
			oldSubordinate.ManagerID = oldManagerID
		} else {
			oldSubordinate.ManagerID = nil
		}

		// Log the subordinate transfer
		if err := s.auditService.LogUserChange(subordinateOrgID, subordinateID, changedBy, "UPDATE", &oldSubordinate, &subordinate, httpReq); err != nil {
		}
	}

	return nil
}
