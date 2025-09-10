package services

import (
	"fmt"
	"time"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
	"hr-portal-backend/internal/utils"

	"github.com/google/uuid"
)

// userService implements UserService interface
type userService struct {
	userRepo         repositories.UserRepository
	organizationRepo repositories.OrganizationRepository
}

// NewUserService creates a new user service
func NewUserService(userRepo repositories.UserRepository, organizationRepo repositories.OrganizationRepository) UserService {
	return &userService{
		userRepo:         userRepo,
		organizationRepo: organizationRepo,
	}
}

func (s *userService) CreateUser(req CreateUserRequest) (*models.User, error) {
	// Validate organization exists
	org, err := s.organizationRepo.GetByID(req.OrganizationID)
	if err != nil {
		return nil, fmt.Errorf("organization not found: %w", err)
	}

	// Check if username already exists in organization
	existingUser, _ := s.userRepo.GetByUsername(req.Username, req.OrganizationID)
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

	// Parse manager ID if provided
	var managerID *uuid.UUID
	if req.ManagerID != "" {
		managerUUID, err := uuid.Parse(req.ManagerID)
		if err != nil {
			return nil, fmt.Errorf("invalid manager ID: %w", err)
		}
		managerID = &managerUUID
	}

	// Create user
	user := &models.User{
		OrganizationID: uuid.MustParse(req.OrganizationID),
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

func (s *userService) UpdateUser(id string, req UpdateUserRequest) (*models.User, error) {
	// Get existing user
	user, err := s.userRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Update fields if provided
	if req.Username != nil {
		// Check if username already exists
		existingUser, _ := s.userRepo.GetByUsername(*req.Username, user.OrganizationID.String())
		if existingUser != nil && existingUser.ID != user.ID {
			return nil, fmt.Errorf("username already exists")
		}
		user.Username = *req.Username
	}

	if req.Email != nil {
		// Check if email already exists
		existingUser, _ := s.userRepo.GetByEmail(*req.Email, user.OrganizationID.String())
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
			managerUUID, err := uuid.Parse(*req.ManagerID)
			if err != nil {
				return nil, fmt.Errorf("invalid manager ID: %w", err)
			}
			user.ManagerID = &managerUUID
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

	return user, nil
}

func (s *userService) DeleteUser(id string) error {
	if err := s.userRepo.Delete(id); err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
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
