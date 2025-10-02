package services

import (
	"fmt"
	"net/http"
	"strconv"

	"hr-portal-backend/internal/models"
)

// EditLeave allows users to edit their pending leave requests
// Creates a new leave and cancels the old one, effectively reverting to pending state
func (s *leaveService) EditLeave(req EditLeaveRequest, userID, organizationID string, httpReq *http.Request) (*models.Leave, error) {
	// Validate dates
	if req.ToDate.Before(req.FromDate) {
		return nil, fmt.Errorf("end date cannot be before start date")
	}

	// Get the existing leave to check status and permissions
	existingLeave, err := s.leaveRepo.GetByID(req.LeaveID)
	if err != nil {
		return nil, fmt.Errorf("leave not found")
	}

	// Get the user information to get organization ID and manager
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}

	organizationIDUint := user.OrganizationID

	// Verify the leave belongs to the requesting user
	existingLeaveUserIDStr := strconv.FormatUint(uint64(existingLeave.UserID), 10)
	if existingLeaveUserIDStr != userID {
		return nil, fmt.Errorf("not authorized to edit this leave request")
	}

	// Only allow editing of pending and approved leaves
	if existingLeave.Status != "pending" && existingLeave.Status != "approved" {
		return nil, fmt.Errorf("only pending and approved leave requests can be edited")
	}

	// Validate that the user isn't trying to edit to conflicting dates
	// We'll check overlaps excluding the current leave being edited
	// Convert string IDs to uint for validation
	newUserIDUint, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID")
	}

	// Get all existing leaves for this user excluding the one being edited
	existingLeaves, err := s.leaveRepo.List(strconv.FormatUint(uint64(organizationIDUint), 10), map[string]interface{}{
		"user_id": userID,
		"status":  []string{"pending", "approved"}, // Only check active leaves
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get existing leaves: %w", err)
	}

	// Check for overlaps with other leaves (excluding the current leave)
	for _, leave := range existingLeaves {
		if leave.ID == existingLeave.ID {
			continue // Skip the leave being edited
		}

		// Check if the new date range overlaps with this leave
		if (leave.FromDate.Before(req.ToDate) || leave.FromDate.Equal(req.ToDate)) &&
			(leave.ToDate.After(req.FromDate) || leave.ToDate.Equal(req.FromDate)) {
			return nil, fmt.Errorf("leave request overlaps with existing approved or pending leave: %s to %s",
				leave.FromDate.Format("2006-01-02"), leave.ToDate.Format("2006-01-02"))
		}
	}

	// Convert category ID to uint
	categoryID, err := strconv.ParseUint(req.CategoryID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid category ID")
	}

	// Verify the category exists and is active
	category, err := s.leaveCategoryRepo.GetByID(req.CategoryID)
	if err != nil {
		return nil, fmt.Errorf("leave category not found")
	}
	if !category.IsActive {
		return nil, fmt.Errorf("leave category is no longer active")
	}

	// Calculate leave days
	leaveDays := s.calculateLeaveDays(req.FromDate, req.ToDate, req.StartHalf, req.EndHalf)
	adjustedDays := leaveDays

	if adjustedDays <= 0 {
		return nil, fmt.Errorf("no leave days remaining")
	}

	// Verify user has sufficient leave balance
	allocations, err := s.leaveAllocationRepo.GetByUserID(userID, req.FromDate.Year())
	if err != nil {
		return nil, fmt.Errorf("failed to get leave allocations: %w", err)
	}

	hasEnoughBalance := false
	for _, alloc := range allocations {
		if alloc.CategoryID == uint(categoryID) && alloc.RemainingDays >= int(adjustedDays) {
			hasEnoughBalance = true
			break
		}
	}

	if !hasEnoughBalance {
		return nil, fmt.Errorf("insufficient leave balance for this category")
	}

	// Cancel the existing leave
	_, err = s.CancelLeave(strconv.FormatUint(uint64(existingLeave.ID), 10), userID)
	if err != nil {
		return nil, fmt.Errorf("failed to cancel existing leave: %w", err)
	}

	// Create the new leave request with updated details
	newLeave := &models.Leave{
		OrganizationID: organizationIDUint, // Keep same organization
		UserID:         uint(newUserIDUint),
		CategoryID:     uint(categoryID),
		Type:           req.Type,
		Reason:         req.Reason,
		Status:         "pending", // Always starts as pending when edited
		FromDate:       req.FromDate,
		ToDate:         req.ToDate,
		StartHalf:      req.StartHalf,
		EndHalf:        req.EndHalf,
		Days:           adjustedDays,
	}

	err = s.leaveRepo.Create(newLeave)
	if err != nil {
		return nil, fmt.Errorf("failed to create new leave request: %w", err)
	}

	// Populate category name for response
	newLeave.Category = *category

	return newLeave, nil
}
