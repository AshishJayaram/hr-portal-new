package services

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"

	"github.com/sirupsen/logrus"
)

// leaveService implements LeaveService interface
type leaveService struct {
	leaveRepo           repositories.LeaveRepository
	userRepo            repositories.UserRepository
	leaveCategoryRepo   repositories.LeaveCategoryRepository
	leaveAllocationRepo repositories.LeaveAllocationRepository
	holidayRepo         repositories.HolidayRepository
	auditService        AuditService
	notificationService NotificationService
}

func NewLeaveService(leaveRepo repositories.LeaveRepository, userRepo repositories.UserRepository, leaveCategoryRepo repositories.LeaveCategoryRepository, leaveAllocationRepo repositories.LeaveAllocationRepository, holidayRepo repositories.HolidayRepository, auditService AuditService, notificationService NotificationService) LeaveService {
	return &leaveService{
		leaveRepo:           leaveRepo,
		userRepo:            userRepo,
		leaveCategoryRepo:   leaveCategoryRepo,
		leaveAllocationRepo: leaveAllocationRepo,
		holidayRepo:         holidayRepo,
		auditService:        auditService,
		notificationService: notificationService,
	}
}

func (s *leaveService) ApplyLeave(req ApplyLeaveRequest, httpReq *http.Request) (*models.Leave, error) {
	// Validate dates
	if req.ToDate.Before(req.FromDate) {
		return nil, fmt.Errorf("end date cannot be before start date")
	}

	// Check for overlapping leaves
	overlappingLeaves, err := s.leaveRepo.FindOverlappingLeaves(req.UserID, req.FromDate, req.ToDate)
	if err != nil {
		return nil, fmt.Errorf("failed to check for overlapping leaves: %w", err)
	}

	if len(overlappingLeaves) > 0 {
		return nil, fmt.Errorf("you have overlapping leave requests for the date range %s to %s",
			req.FromDate.Format("2006-01-02"), req.ToDate.Format("2006-01-02"))
	}

	// Convert string IDs to uint
	userID, err := strconv.ParseUint(req.UserID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	categoryID, err := strconv.ParseUint(req.CategoryID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid category ID: %w", err)
	}

	orgID, err := strconv.ParseUint(req.OrganizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	// Get holidays for the organization to exclude from leave calculation
	holidays, err := s.holidayRepo.List(req.OrganizationID, map[string]interface{}{})
	if err != nil {
		return nil, fmt.Errorf("failed to get holidays: %w", err)
	}

	// Calculate days based on half day settings and holidays
	// For LOP leaves, don't exclude weekends/holidays as they are unpaid days
	var days float64
	if req.Type == "LOP" {
		days = s.calculateLeaveDays(req.FromDate, req.ToDate, req.StartHalf, req.EndHalf)
	} else {
		days = s.calculateLeaveDaysWithHolidays(req.FromDate, req.ToDate, req.StartHalf, req.EndHalf, holidays)
	}

	// Check if user has sufficient leave balance (only for non-LOP leaves)
	if req.Type != "LOP" {
		currentYear := time.Now().Year()
		allocations, err := s.leaveAllocationRepo.GetByUserID(req.UserID, currentYear)
		if err != nil {
			return nil, fmt.Errorf("failed to get leave allocations: %w", err)
		}

		// Find allocation for this category
		var allocation *models.LeaveAllocation
		for _, alloc := range allocations {
			if alloc.CategoryID == uint(categoryID) {
				allocation = &alloc
				break
			}
		}

		if allocation == nil {
			return nil, fmt.Errorf("no leave allocation found for category %d", categoryID)
		}

		// Check if user has sufficient balance using allocation's used_days
		remainingDays := float64(allocation.TotalDays) - float64(allocation.UsedDays)
		if days > remainingDays {
			return nil, fmt.Errorf("insufficient leave balance: requested %.1f days, available %.1f days", days, remainingDays)
		}
	}

	// Set default half day values if not provided
	startHalf := req.StartHalf
	if startHalf == "" {
		startHalf = "FULL"
	}
	endHalf := req.EndHalf
	if endHalf == "" {
		endHalf = "FULL"
	}

	leave := &models.Leave{
		UserID:         uint(userID),
		CategoryID:     uint(categoryID),
		OrganizationID: uint(orgID),
		Type:           req.Type,
		Reason:         req.Reason,
		FromDate:       req.FromDate,
		ToDate:         req.ToDate,
		Days:           days,
		StartHalf:      startHalf,
		EndHalf:        endHalf,
		Status:         "pending",
		// LOP fields initialized to 0 - will be calculated when approved
		LOPDays:             0,
		SpilloverCategoryID: nil,
		SpilloverDays:       0,
	}

	// For LOP leaves, set the LOP days to the total days requested
	if req.Type == "LOP" {
		leave.LOPDays = int(days)
	}

	err = s.leaveRepo.Create(leave)
	if err != nil {
		return nil, fmt.Errorf("failed to create leave: %w", err)
	}

	// Load user to get manager ID for notification
	user, err := s.userRepo.GetByID(req.UserID)
	if err != nil {
		// Log error but don't fail leave creation
		fmt.Printf("Failed to load user for notification: %v\n", err)
	}

	// Log audit entry for leave application
	orgIDStr := strconv.FormatUint(uint64(leave.OrganizationID), 10)
	leaveIDStr := strconv.FormatUint(uint64(leave.ID), 10)

	// Get current user from request context
	changedBy := strconv.FormatUint(uint64(leave.UserID), 10) // Self-application
	if httpReq != nil {
		if userID := httpReq.Header.Get("X-User-ID"); userID != "" {
			changedBy = userID
		}
	}

	// Log the leave application
	changeSummary := fmt.Sprintf("Leave application submitted: %s from %s to %s", leave.Type, leave.FromDate.Format("2006-01-02"), leave.ToDate.Format("2006-01-02"))
	if err := s.auditService.LogLeaveChange(orgIDStr, leaveIDStr, changedBy, "CREATE", changeSummary, httpReq); err != nil {
	}

	// Send notification to manager asynchronously (don't block the API response)
	go func() {
		// Reload user if not already loaded
		if user == nil {
			loadedUser, err := s.userRepo.GetByID(req.UserID)
			if err != nil {
				logrus.WithError(err).WithFields(logrus.Fields{
					"user_id":  req.UserID,
					"leave_id": leave.ID,
				}).Warn("Failed to load user for leave notification")
				return // Skip notification if user can't be loaded
			}
			user = loadedUser
		}

		// Check if user has a manager assigned
		if user == nil {
			logrus.WithFields(logrus.Fields{
				"user_id":  req.UserID,
				"leave_id": leave.ID,
			}).Warn("User is nil, cannot send leave notification")
			return
		}

		if user.ManagerID == nil {
			logrus.WithFields(logrus.Fields{
				"user_id":   req.UserID,
				"user_name": user.Name,
				"leave_id":  leave.ID,
			}).Info("User has no manager assigned, skipping leave notification")
			return
		}

		logrus.WithFields(logrus.Fields{
			"user_id":    req.UserID,
			"user_name":  user.Name,
			"manager_id": *user.ManagerID,
			"leave_id":   leave.ID,
		}).Info("Attempting to send leave notification to manager")

		manager, err := s.userRepo.GetByID(strconv.FormatUint(uint64(*user.ManagerID), 10))
		if err != nil {
			logrus.WithError(err).WithFields(logrus.Fields{
				"user_id":    req.UserID,
				"manager_id": *user.ManagerID,
				"leave_id":   leave.ID,
			}).Error("Failed to load manager for leave notification")
			return
		}

		if manager == nil {
			logrus.WithFields(logrus.Fields{
				"user_id":    req.UserID,
				"manager_id": *user.ManagerID,
				"leave_id":   leave.ID,
			}).Warn("Manager not found for leave notification")
			return
		}

		// Prepare leave object with user info for notification
		leaveWithUser := *leave
		leaveWithUser.User = *user

		// Load the category for the notification (skip for LOP leaves where CategoryID=0)
		if leave.CategoryID != 0 && leave.Category.Name == "" {
			category, _ := s.leaveCategoryRepo.GetByID(strconv.FormatUint(uint64(leave.CategoryID), 10))
			if category != nil {
				leaveWithUser.Category = *category
			}
		}
		// For LOP leaves, set a default category name if needed
		if leave.Type == "LOP" && leaveWithUser.Category.Name == "" {
			leaveWithUser.Category = models.LeaveCategory{
				Name: "Loss of Pay",
			}
		}

		logrus.WithFields(logrus.Fields{
			"manager_email": manager.Email,
			"manager_name":  manager.Name,
			"manager_id":    manager.ID,
			"leave_id":      leave.ID,
			"applicant":     user.Name,
		}).Info("Sending leave request notification email to manager")

		if err := s.notificationService.SendLeaveRequestNotification(&leaveWithUser, manager, "applied"); err != nil {
			logrus.WithError(err).WithFields(logrus.Fields{
				"manager_email": manager.Email,
				"manager_id":    manager.ID,
				"leave_id":      leave.ID,
			}).Error("Failed to send leave request notification")
		} else {
			logrus.WithFields(logrus.Fields{
				"manager_email": manager.Email,
				"manager_id":    manager.ID,
				"leave_id":      leave.ID,
			}).Info("Leave request notification sent successfully")
		}
	}()

	return leave, nil
}

func (s *leaveService) GetLeave(id string) (*models.Leave, error) {
	return s.leaveRepo.GetByID(id)
}

func (s *leaveService) ListLeaves(organizationID string, filters map[string]interface{}) ([]models.Leave, error) {
	return s.leaveRepo.List(organizationID, filters)
}

func (s *leaveService) ListLeavesPaginated(organizationID string, filters map[string]interface{}, page, perPage int) (*PaginatedResponse, error) {
	leaves, total, err := s.leaveRepo.ListPaginated(organizationID, filters, page, perPage)
	if err != nil {
		return nil, err
	}

	totalPages := int((total + int64(perPage) - 1) / int64(perPage))

	return &PaginatedResponse{
		Data:       leaves,
		Total:      total,
		Page:       page,
		PerPage:    perPage,
		TotalPages: totalPages,
	}, nil
}

func (s *leaveService) GetTeamLeaves(managerID string, organizationID string, filters map[string]interface{}) ([]models.Leave, error) {
	return s.leaveRepo.GetTeamLeaves(managerID, organizationID, filters)
}

func (s *leaveService) GetTeamLeavesPaginated(managerID string, organizationID string, filters map[string]interface{}, page, perPage int) (*PaginatedResponse, error) {
	leaves, total, err := s.leaveRepo.GetTeamLeavesPaginated(managerID, organizationID, filters, page, perPage)
	if err != nil {
		return nil, err
	}

	totalPages := int((total + int64(perPage) - 1) / int64(perPage))

	return &PaginatedResponse{
		Data:       leaves,
		Total:      total,
		Page:       page,
		PerPage:    perPage,
		TotalPages: totalPages,
	}, nil
}

func (s *leaveService) GetTeamLeavesRecursive(managerID string, organizationID string, filters map[string]interface{}) ([]models.Leave, error) {
	return s.leaveRepo.GetTeamLeavesRecursive(managerID, organizationID, filters)
}

func (s *leaveService) GetTeamLeavesRecursivePaginated(managerID string, organizationID string, filters map[string]interface{}, page, perPage int) (*PaginatedResponse, error) {
	leaves, total, err := s.leaveRepo.GetTeamLeavesRecursivePaginated(managerID, organizationID, filters, page, perPage)
	if err != nil {
		return nil, err
	}

	totalPages := int((total + int64(perPage) - 1) / int64(perPage))

	return &PaginatedResponse{
		Data:       leaves,
		Total:      total,
		Page:       page,
		PerPage:    perPage,
		TotalPages: totalPages,
	}, nil
}

func (s *leaveService) UpdateLeave(id string, req UpdateLeaveRequest) (*models.Leave, error) {
	// Get existing leave
	leave, err := s.leaveRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("leave not found: %w", err)
	}

	// Only allow updates to pending leaves
	if leave.Status != "pending" {
		return nil, fmt.Errorf("only pending leaves can be updated")
	}

	// Update fields if provided
	if req.Type != nil {
		leave.Type = *req.Type
	}
	if req.Reason != nil {
		leave.Reason = *req.Reason
	}
	if req.FromDate != nil {
		leave.FromDate = *req.FromDate
	}
	if req.ToDate != nil {
		leave.ToDate = *req.ToDate
	}
	if req.StartHalf != nil {
		leave.StartHalf = *req.StartHalf
	}
	if req.EndHalf != nil {
		leave.EndHalf = *req.EndHalf
	}
	if req.Status != nil {
		leave.Status = *req.Status
	}

	// Validate dates if they were updated
	if req.FromDate != nil || req.ToDate != nil {
		if leave.ToDate.Before(leave.FromDate) {
			return nil, fmt.Errorf("end date cannot be before start date")
		}

		// Recalculate days if dates or half-day settings changed
		if req.FromDate != nil || req.ToDate != nil || req.StartHalf != nil || req.EndHalf != nil {
			// Get holidays for the organization to exclude from leave calculation
			holidays, err := s.holidayRepo.List(fmt.Sprintf("%d", leave.OrganizationID), map[string]interface{}{})
			if err != nil {
				return nil, fmt.Errorf("failed to get holidays: %w", err)
			}

			// Calculate days based on half day settings and holidays
			leave.Days = s.calculateLeaveDaysWithHolidays(leave.FromDate, leave.ToDate, leave.StartHalf, leave.EndHalf, holidays)
		}
	}

	// Update the leave
	err = s.leaveRepo.Update(leave)
	if err != nil {
		return nil, fmt.Errorf("failed to update leave: %w", err)
	}

	return leave, nil
}

func (s *leaveService) ApproveLeave(id, approverID string) (*models.Leave, error) {
	// Get the leave record first
	leave, err := s.leaveRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("leave not found: %w", err)
	}

	// Only allow approval of pending leaves
	if leave.Status != "pending" {
		return nil, fmt.Errorf("only pending leaves can be approved")
	}

	// Check leave balance before approval (only for non-LOP leaves)
	if leave.Type != "LOP" {
		currentYear := time.Now().Year()

		// Get current allocation
		allocations, err := s.leaveAllocationRepo.GetByUserID(fmt.Sprintf("%d", leave.UserID), currentYear)
		if err != nil {
			return nil, fmt.Errorf("failed to get leave allocations: %w", err)
		}

		// Find allocation for this category
		var allocation *models.LeaveAllocation
		for _, alloc := range allocations {
			if alloc.CategoryID == leave.CategoryID {
				allocation = &alloc
				break
			}
		}

		if allocation == nil {
			return nil, fmt.Errorf("no leave allocation found for category %d", leave.CategoryID)
		}

		// Check if user has sufficient balance using allocation's used_days
		remainingDays := float64(allocation.TotalDays) - float64(allocation.UsedDays)
		if leave.Days > remainingDays {
			return nil, fmt.Errorf("insufficient leave balance: requested %.1f days, available %.1f days", leave.Days, remainingDays)
		}
	}

	// Approve the leave
	err = s.leaveRepo.Approve(id, approverID)
	if err != nil {
		return nil, err
	}

	// Deduct leave balance (only for non-LOP leaves)
	if leave.Type != "LOP" {
		currentYear := time.Now().Year()

		// Get current allocation
		allocations, err := s.leaveAllocationRepo.GetByUserID(fmt.Sprintf("%d", leave.UserID), currentYear)
		if err != nil {
			return nil, fmt.Errorf("failed to get leave allocations: %w", err)
		}

		// Find allocation for this category
		var allocation *models.LeaveAllocation
		for _, alloc := range allocations {
			if alloc.CategoryID == leave.CategoryID {
				allocation = &alloc
				break
			}
		}

		if allocation != nil {
			// Update used days
			newUsedDays := allocation.UsedDays + int(leave.Days)
			err = s.leaveAllocationRepo.UpdateUsedDays(fmt.Sprintf("%d", leave.UserID), fmt.Sprintf("%d", leave.CategoryID), currentYear, newUsedDays)
			if err != nil {
				return nil, fmt.Errorf("failed to update leave allocation: %w", err)
			}
		}
	}

	// Get the updated leave with relationships
	updatedLeave, err := s.leaveRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	// Send notification to employee asynchronously (don't block the API response)
	go func() {
		if updatedLeave.User.Name != "" {
			// Load the category for the notification (skip for LOP leaves where CategoryID=0)
			if updatedLeave.CategoryID != 0 && updatedLeave.Category.Name == "" {
				category, _ := s.leaveCategoryRepo.GetByID(strconv.FormatUint(uint64(updatedLeave.CategoryID), 10))
				if category != nil {
					updatedLeave.Category = *category
				}
			}
			// For LOP leaves, set a default category name if needed
			if updatedLeave.Type == "LOP" && updatedLeave.Category.Name == "" {
				updatedLeave.Category = models.LeaveCategory{
					Name: "Loss of Pay",
				}
			}
			s.notificationService.SendLeaveRequestNotification(updatedLeave, &updatedLeave.User, "approved")
		}
	}()

	return updatedLeave, nil
}

func (s *leaveService) RejectLeave(id, rejecterID, reason string) (*models.Leave, error) {
	// Get the leave record first
	leave, err := s.leaveRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("leave not found: %w", err)
	}

	// Only allow rejection of pending leaves
	if leave.Status != "pending" {
		return nil, fmt.Errorf("only pending leaves can be rejected")
	}

	// Reject the leave
	err = s.leaveRepo.Reject(id, rejecterID, reason)
	if err != nil {
		return nil, err
	}

	// No need to update leave balance for rejected leaves as they were never deducted

	// Get the updated leave with relationships
	updatedLeave, err := s.leaveRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	// Send notification to employee asynchronously (don't block the API response)
	go func() {
		if updatedLeave.User.Name != "" {
			// Load the category for the notification (skip for LOP leaves where CategoryID=0)
			if updatedLeave.CategoryID != 0 && updatedLeave.Category.Name == "" {
				category, _ := s.leaveCategoryRepo.GetByID(strconv.FormatUint(uint64(updatedLeave.CategoryID), 10))
				if category != nil {
					updatedLeave.Category = *category
				}
			}
			// For LOP leaves, set a default category name if needed
			if updatedLeave.Type == "LOP" && updatedLeave.Category.Name == "" {
				updatedLeave.Category = models.LeaveCategory{
					Name: "Loss of Pay",
				}
			}
			s.notificationService.SendLeaveRequestNotification(updatedLeave, &updatedLeave.User, "rejected")
		}
	}()

	return updatedLeave, nil
}

func (s *leaveService) GetUserLeaves(userID string, filters map[string]interface{}) ([]models.Leave, error) {
	return s.leaveRepo.GetByUserID(userID, filters)
}

func (s *leaveService) GetPendingApprovals(managerID string) ([]models.Leave, error) {
	return s.leaveRepo.GetPendingApprovals(managerID)
}

func (s *leaveService) GetTeamLeaveBalances(managerID, organizationID string) (map[string][]LeaveBalanceResponse, error) {
	// Get the current user to check their role
	currentUser, err := s.userRepo.GetByID(managerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get current user: %w", err)
	}

	var userIDs []uint

	// If user is HR/Admin/God, get ALL users in the organization
	// Otherwise, get only subordinates (reportees)
	if currentUser.Role == "HR" || currentUser.Role == "Admin" || currentUser.Role == "God" {
		// Get all users in the organization
		allUsers, err := s.userRepo.List(organizationID, map[string]interface{}{})
		if err != nil {
			return nil, fmt.Errorf("failed to get organization users: %w", err)
		}
		// Extract user IDs
		for _, user := range allUsers {
			userIDs = append(userIDs, user.ID)
		}
	} else {
		// Get subordinate user IDs recursively (for managers)
		subordinateIDs, err := s.getAllSubordinateIDs(managerID, organizationID)
		if err != nil {
			return nil, fmt.Errorf("failed to get subordinate IDs: %w", err)
		}
		userIDs = subordinateIDs
	}

	teamBalances := make(map[string][]LeaveBalanceResponse)

	for _, userID := range userIDs {
		balances, err := s.GetLeaveBalance(strconv.FormatUint(uint64(userID), 10))
		if err != nil {
			// Log error but continue with other users
			continue
		}
		teamBalances[strconv.FormatUint(uint64(userID), 10)] = balances
	}

	return teamBalances, nil
}

// getAllSubordinateIDs recursively gets all subordinate user IDs for a given manager
func (s *leaveService) getAllSubordinateIDs(managerID, organizationID string) ([]uint, error) {
	var subordinateIDs []uint

	// Get direct reports
	directReports, err := s.userRepo.GetSubordinates(organizationID, managerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get direct reports: %w", err)
	}

	// Add direct reports to the list
	for _, user := range directReports {
		subordinateIDs = append(subordinateIDs, user.ID)

		// Recursively get sub-reports
		subReports, err := s.getAllSubordinateIDs(strconv.FormatUint(uint64(user.ID), 10), organizationID)
		if err != nil {
			return nil, err
		}
		subordinateIDs = append(subordinateIDs, subReports...)
	}

	return subordinateIDs, nil
}

func (s *leaveService) GetLeaveBalance(userID string) ([]LeaveBalanceResponse, error) {
	// Get user's leave allocations for current year
	currentYear := time.Now().Year()
	allocations, err := s.leaveAllocationRepo.GetByUserID(userID, currentYear)
	if err != nil {
		return nil, fmt.Errorf("failed to get leave allocations: %w", err)
	}

	// Calculate balance for each category using allocation's used_days
	// Filter out allocations with category_id = 0 (invalid/unassigned categories)
	var balances []LeaveBalanceResponse
	for _, allocation := range allocations {
		// Skip allocations with invalid category ID (0)
		if allocation.CategoryID == 0 {
			continue
		}

		balance := LeaveBalanceResponse{
			CategoryID:    fmt.Sprintf("%d", allocation.CategoryID),
			CategoryName:  allocation.CategoryName,
			TotalDays:     allocation.TotalDays,
			UsedDays:      allocation.UsedDays,
			RemainingDays: allocation.TotalDays - allocation.UsedDays,
		}
		balances = append(balances, balance)
	}

	return balances, nil
}

func (s *leaveService) CancelLeave(id, userID string) (*models.Leave, error) {
	// Get the leave record
	leave, err := s.leaveRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("leave not found: %w", err)
	}

	// Check if user owns this leave
	userIDUint, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	if leave.UserID != uint(userIDUint) {
		return nil, fmt.Errorf("unauthorized: user does not own this leave")
	}

	// Check if leave can be cancelled (only pending leaves can be cancelled)
	if leave.Status != "pending" {
		return nil, fmt.Errorf("only pending leaves can be cancelled")
	}

	// Update status to cancelled
	leave.Status = "cancelled"
	err = s.leaveRepo.Update(leave)
	if err != nil {
		return nil, fmt.Errorf("failed to cancel leave: %w", err)
	}

	// No need to update leave balance for cancelled leaves as they were never deducted

	// Get the updated leave with relationships for notification
	updatedLeave, err := s.leaveRepo.GetByID(id)
	if err != nil {
		// If we can't get the updated leave, just return the cancelled leave
		return leave, nil
	}

	// Send notification to employee asynchronously (don't block the API response)
	go func() {
		if updatedLeave.User.Name != "" {
			// Load the category for the notification (skip for LOP leaves where CategoryID=0)
			if updatedLeave.CategoryID != 0 && updatedLeave.Category.Name == "" {
				category, _ := s.leaveCategoryRepo.GetByID(strconv.FormatUint(uint64(updatedLeave.CategoryID), 10))
				if category != nil {
					updatedLeave.Category = *category
				}
			}
			// For LOP leaves, set a default category name if needed
			if updatedLeave.Type == "LOP" && updatedLeave.Category.Name == "" {
				updatedLeave.Category = models.LeaveCategory{
					Name: "Loss of Pay",
				}
			}
			s.notificationService.SendLeaveRequestNotification(updatedLeave, &updatedLeave.User, "cancelled")
		}
	}()

	return updatedLeave, nil
}

// leaveCategoryService implements LeaveCategoryService interface
type leaveCategoryService struct {
	repo repositories.LeaveCategoryRepository
}

func NewLeaveCategoryService(repo repositories.LeaveCategoryRepository) LeaveCategoryService {
	return &leaveCategoryService{
		repo: repo,
	}
}

func (s *leaveCategoryService) CreateCategory(organizationID string, req CreateLeaveCategoryRequest) (*models.LeaveCategory, error) {
	// Parse organization ID from string to uint
	orgID, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	category := &models.LeaveCategory{
		OrganizationID:   uint(orgID),
		Name:             req.Name,
		Description:      req.Description,
		DefaultDays:      req.DefaultDays,
		MaxDaysPerYear:   req.MaxDaysPerYear,
		RequiresApproval: req.RequiresApproval,
		IsActive:         true, // Default to active
	}

	err = s.repo.Create(category)
	if err != nil {
		return nil, err
	}
	return category, nil
}

func (s *leaveCategoryService) GetCategory(id string) (*models.LeaveCategory, error) {
	return s.repo.GetByID(id)
}

func (s *leaveCategoryService) ListCategories(organizationID string) ([]models.LeaveCategory, error) {
	return s.repo.List(organizationID)
}

func (s *leaveCategoryService) UpdateCategory(id string, req UpdateLeaveCategoryRequest) (*models.LeaveCategory, error) {
	// Get existing category first
	existing, err := s.repo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to get category: %w", err)
	}

	// Update fields if provided
	if req.Name != nil {
		existing.Name = *req.Name
	}
	if req.Description != nil {
		existing.Description = *req.Description
	}
	if req.DefaultDays != nil {
		existing.DefaultDays = *req.DefaultDays
	}
	if req.MaxDaysPerYear != nil {
		existing.MaxDaysPerYear = *req.MaxDaysPerYear
	}
	if req.RequiresApproval != nil {
		existing.RequiresApproval = *req.RequiresApproval
	}
	if req.IsActive != nil {
		existing.IsActive = *req.IsActive
	}

	err = s.repo.Update(existing)
	if err != nil {
		return nil, err
	}
	return existing, nil
}

func (s *leaveCategoryService) DeleteCategory(id string) error {
	return s.repo.Delete(id)
}

// leaveAllocationService implements LeaveAllocationService interface
type leaveAllocationService struct {
	allocationRepo repositories.LeaveAllocationRepository
	categoryRepo   repositories.LeaveCategoryRepository
	userRepo       repositories.UserRepository
}

func NewLeaveAllocationService(allocationRepo repositories.LeaveAllocationRepository, categoryRepo repositories.LeaveCategoryRepository, userRepo repositories.UserRepository) LeaveAllocationService {
	return &leaveAllocationService{
		allocationRepo: allocationRepo,
		categoryRepo:   categoryRepo,
		userRepo:       userRepo,
	}
}

func (s *leaveAllocationService) CreateAllocation(req CreateLeaveAllocationRequest) (*models.LeaveAllocation, error) {
	// Convert string IDs to uint
	userID, err := strconv.ParseUint(req.UserID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	categoryID, err := strconv.ParseUint(req.CategoryID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid category ID: %w", err)
	}

	organizationID, err := strconv.ParseUint(req.OrganizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	// Validate that the category exists and belongs to the organization
	category, err := s.categoryRepo.GetByID(req.CategoryID)
	if err != nil {
		return nil, fmt.Errorf("leave category not found: %w", err)
	}
	if category.OrganizationID != uint(organizationID) {
		return nil, fmt.Errorf("leave category does not belong to organization")
	}
	if !category.IsActive {
		return nil, fmt.Errorf("leave category is not active")
	}

	// Validate that the user belongs to the organization
	user, err := s.userRepo.GetByID(req.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	if user.OrganizationID != uint(organizationID) {
		return nil, fmt.Errorf("user does not belong to organization")
	}

	// Check if allocation already exists for this user, category, and year
	existingAllocations, err := s.allocationRepo.GetByUserID(req.UserID, req.Year)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing allocations: %w", err)
	}

	// Check for duplicate category
	for _, existing := range existingAllocations {
		if existing.CategoryID == uint(categoryID) {
			return nil, fmt.Errorf("leave allocation already exists for user %s, category %s, year %d", req.UserID, req.CategoryName, req.Year)
		}
	}

	// Validate that total days doesn't exceed category maximum
	if req.TotalDays > category.MaxDaysPerYear {
		return nil, fmt.Errorf("total days (%d) exceeds the maximum allowed for this category (%d days)", req.TotalDays, category.MaxDaysPerYear)
	}

	// Create the allocation
	allocation := &models.LeaveAllocation{
		UserID:         uint(userID),
		CategoryID:     uint(categoryID),
		OrganizationID: uint(organizationID),
		CategoryName:   req.CategoryName,
		TotalDays:      req.TotalDays,
		UsedDays:       0,
		RemainingDays:  req.TotalDays,
		Year:           req.Year,
	}

	err = s.allocationRepo.Create(allocation)
	if err != nil {
		return nil, fmt.Errorf("failed to create leave allocation: %w", err)
	}

	return allocation, nil
}

func (s *leaveAllocationService) GetAllocation(id string) (*models.LeaveAllocation, error) {
	return s.allocationRepo.GetByID(id)
}

func (s *leaveAllocationService) ListAllocations(organizationID string, filters map[string]interface{}) ([]models.LeaveAllocation, error) {
	return s.allocationRepo.List(organizationID, filters)
}

func (s *leaveAllocationService) UpdateAllocation(id string, req UpdateLeaveAllocationRequest) (*models.LeaveAllocation, error) {
	// Get existing allocation
	allocation, err := s.allocationRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("allocation not found: %w", err)
	}

	// Determine final values for total_days and used_days
	finalTotalDays := allocation.TotalDays
	finalUsedDays := allocation.UsedDays

	if req.TotalDays != nil {
		finalTotalDays = *req.TotalDays
	}

	if req.UsedDays != nil {
		finalUsedDays = *req.UsedDays
	}

	// Validate: total days must be non-negative
	if finalTotalDays < 0 {
		return nil, fmt.Errorf("total days cannot be negative")
	}

	// Validate: used days must be non-negative
	if finalUsedDays < 0 {
		return nil, fmt.Errorf("used days cannot be negative")
	}

	// Validate: used days cannot exceed total days
	if finalUsedDays > finalTotalDays {
		return nil, fmt.Errorf("used days (%d) cannot exceed total days (%d)", finalUsedDays, finalTotalDays)
	}

	// Calculate remaining days
	finalRemainingDays := finalTotalDays - finalUsedDays

	// Optional: Validate against category maximum if category exists (don't fail if category doesn't exist)
	// Only validate if total_days is being changed
	if req.TotalDays != nil && *req.TotalDays != allocation.TotalDays {
		category, err := s.categoryRepo.GetByID(strconv.FormatUint(uint64(allocation.CategoryID), 10))
		if err == nil && category != nil && category.IsActive {
			if finalTotalDays > category.MaxDaysPerYear {
				return nil, fmt.Errorf("total days (%d) exceeds the maximum allowed for this category (%d days)", finalTotalDays, category.MaxDaysPerYear)
			}
		}
		// Silently ignore category lookup errors - category may have been deleted
	}

	// Update the allocation fields
	allocation.TotalDays = finalTotalDays
	allocation.UsedDays = finalUsedDays
	allocation.RemainingDays = finalRemainingDays

	// Save updated allocation using repository method
	err = s.allocationRepo.Update(allocation)
	if err != nil {
		return nil, fmt.Errorf("failed to update allocation: %w", err)
	}

	// Reload the allocation to get updated_at timestamp
	updatedAllocation, err := s.allocationRepo.GetByID(strconv.FormatUint(uint64(allocation.ID), 10))
	if err != nil {
		// If reload fails, return the allocation we updated (it was saved successfully)
		return allocation, nil
	}

	return updatedAllocation, nil
}

func (s *leaveAllocationService) DeleteAllocation(id string) error {
	return s.allocationRepo.Delete(id)
}

func (s *leaveAllocationService) GetUserAllocations(userID string, year int) ([]models.LeaveAllocation, error) {
	return s.allocationRepo.GetByUserID(userID, year)
}

func (s *leaveAllocationService) UpdateUsedDays(userID, categoryID string, year int, days int) error {
	return s.allocationRepo.UpdateUsedDays(userID, categoryID, year, days)
}

// calculateLeaveDaysWithHolidays calculates the number of leave days based on dates, half day settings, and holidays
func (s *leaveService) calculateLeaveDaysWithHolidays(fromDate, toDate time.Time, startHalf, endHalf string, holidays []models.Holiday) float64 {
	if toDate.Before(fromDate) {
		return 0
	}

	// Create a set of holiday dates for quick lookup
	holidaySet := make(map[string]bool)
	for _, holiday := range holidays {
		if holiday.Date != nil {
			holidaySet[holiday.Date.Format("2006-01-02")] = true
		}
	}

	// Calculate working days (excluding weekends and holidays)
	days := 0.0
	current := fromDate
	for current.Before(toDate) || current.Equal(toDate) {
		// Check if it's a weekend (Saturday = 6, Sunday = 0)
		weekday := current.Weekday()
		isWeekend := weekday == time.Saturday || weekday == time.Sunday

		// Check if it's a holiday
		isHoliday := holidaySet[current.Format("2006-01-02")]

		// Count as working day if not weekend and not holiday
		if !isWeekend && !isHoliday {
			days += 1.0
		}

		current = current.AddDate(0, 0, 1)
	}

	// Handle half day adjustments
	if fromDate.Format("2006-01-02") == toDate.Format("2006-01-02") {
		// Single day leave
		if startHalf != "FULL" || endHalf != "FULL" {
			days -= 0.5
		}
	} else {
		// Multi-day leave
		if startHalf != "FULL" {
			days -= 0.5
		}
		if endHalf != "FULL" {
			days -= 0.5
		}
	}

	// Ensure non-negative result
	if days < 0 {
		days = 0
	}

	return days
}

// calculateLeaveDays calculates the number of leave days based on dates and half day settings (legacy method)
func (s *leaveService) calculateLeaveDays(fromDate, toDate time.Time, startHalf, endHalf string) float64 {
	if toDate.Before(fromDate) {
		return 0
	}

	// Calculate total days between dates
	days := toDate.Sub(fromDate).Hours()/24 + 1

	// Handle half day adjustments
	if fromDate.Format("2006-01-02") == toDate.Format("2006-01-02") {
		// Single day leave
		if startHalf != "FULL" || endHalf != "FULL" {
			days -= 0.5
		}
	} else {
		// Multi-day leave
		if startHalf != "FULL" {
			days -= 0.5
		}
		if endHalf != "FULL" {
			days -= 0.5
		}
	}

	// Ensure non-negative result
	if days < 0 {
		days = 0
	}

	return days
}
