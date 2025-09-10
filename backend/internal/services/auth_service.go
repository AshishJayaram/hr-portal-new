package services

import (
	"fmt"
	"time"

	"hr-portal-backend/internal/config"
	"hr-portal-backend/internal/repositories"
	"hr-portal-backend/internal/utils"

	"github.com/google/uuid"
)

// authService implements AuthService interface
type authService struct {
	userRepo         repositories.UserRepository
	organizationRepo repositories.OrganizationRepository
	jwtConfig        config.JWTConfig
}

// NewAuthService creates a new auth service
func NewAuthService(userRepo repositories.UserRepository, organizationRepo repositories.OrganizationRepository, jwtConfig config.JWTConfig) AuthService {
	return &authService{
		userRepo:         userRepo,
		organizationRepo: organizationRepo,
		jwtConfig:        jwtConfig,
	}
}

func (s *authService) Login(req LoginRequest) (*LoginResponse, error) {
	// Validate organization exists
	org, err := s.organizationRepo.GetByID(req.OrganizationID)
	if err != nil {
		return nil, fmt.Errorf("organization not found: %w", err)
	}

	// Get user by username and organization
	user, err := s.userRepo.GetByUsername(req.Username, req.OrganizationID)
	if err != nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	// Check if user is active
	if !user.IsActive {
		return nil, fmt.Errorf("user account is deactivated")
	}

	// Verify password
	if !utils.CheckPasswordHash(req.Password, user.PasswordHash) {
		return nil, fmt.Errorf("invalid credentials")
	}

	// Generate JWT token
	token, err := utils.GenerateToken(
		user.ID.String(),
		user.OrganizationID.String(),
		user.Role,
		user.Username,
		s.jwtConfig.Secret,
		s.jwtConfig.ExpireHours,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	// Generate refresh token
	refreshToken, err := utils.GenerateRefreshToken(
		user.ID.String(),
		s.jwtConfig.Secret,
		s.jwtConfig.RefreshExpireHours,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Update last login
	if err := s.userRepo.UpdateLastLogin(user.ID.String()); err != nil {
		// Log error but don't fail login
		fmt.Printf("Failed to update last login: %v\n", err)
	}

	// Calculate expiration time
	expiresAt := time.Now().Add(time.Duration(s.jwtConfig.ExpireHours) * time.Hour)

	return &LoginResponse{
		Token:        token,
		RefreshToken: refreshToken,
		User:         user,
		ExpiresAt:    expiresAt,
	}, nil
}

func (s *authService) Logout(userID string) error {
	// In a production system, you might want to:
	// 1. Add the token to a blacklist
	// 2. Store logout events
	// 3. Invalidate refresh tokens
	// For now, we'll just return success
	return nil
}

func (s *authService) RefreshToken(refreshToken string) (*LoginResponse, error) {
	// Validate refresh token
	claims, err := utils.ValidateToken(refreshToken, s.jwtConfig.Secret)
	if err != nil {
		return nil, fmt.Errorf("invalid refresh token: %w", err)
	}

	// Get user
	user, err := s.userRepo.GetByID(claims.Subject)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Check if user is still active
	if !user.IsActive {
		return nil, fmt.Errorf("user account is deactivated")
	}

	// Generate new JWT token
	token, err := utils.GenerateToken(
		user.ID.String(),
		user.OrganizationID.String(),
		user.Role,
		user.Username,
		s.jwtConfig.Secret,
		s.jwtConfig.ExpireHours,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	// Generate new refresh token
	newRefreshToken, err := utils.GenerateRefreshToken(
		user.ID.String(),
		s.jwtConfig.Secret,
		s.jwtConfig.RefreshExpireHours,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Calculate expiration time
	expiresAt := time.Now().Add(time.Duration(s.jwtConfig.ExpireHours) * time.Hour)

	return &LoginResponse{
		Token:        token,
		RefreshToken: newRefreshToken,
		User:         user,
		ExpiresAt:    expiresAt,
	}, nil
}

func (s *authService) ValidateToken(token string) (*utils.JWTClaims, error) {
	return utils.ValidateToken(token, s.jwtConfig.Secret)
}
