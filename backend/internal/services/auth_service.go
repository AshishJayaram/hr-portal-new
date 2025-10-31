package services

import (
	"fmt"
	"strconv"
	"time"

	"hr-portal-backend/internal/config"
	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
	"hr-portal-backend/internal/utils"
)

// authService implements AuthService interface
type authService struct {
	userRepo            repositories.UserRepository
	organizationRepo    repositories.OrganizationRepository
	otpRepo             repositories.OTPRepository
	passwordResetRepo   repositories.PasswordResetRepository
	jwtConfig           config.JWTConfig
	notificationService NotificationService
}

// NewAuthService creates a new auth service
func NewAuthService(userRepo repositories.UserRepository, organizationRepo repositories.OrganizationRepository, otpRepo repositories.OTPRepository, passwordResetRepo repositories.PasswordResetRepository, jwtConfig config.JWTConfig, notificationService NotificationService) AuthService {
	return &authService{
		userRepo:            userRepo,
		organizationRepo:    organizationRepo,
		otpRepo:             otpRepo,
		passwordResetRepo:   passwordResetRepo,
		jwtConfig:           jwtConfig,
		notificationService: notificationService,
	}
}

func (s *authService) Login(req LoginRequest) (*LoginResponse, error) {
	// Get user by username across all organizations
	user, err := s.userRepo.GetByUsernameAcrossOrgs(req.Username)
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
		strconv.FormatUint(uint64(user.ID), 10),
		strconv.FormatUint(uint64(user.OrganizationID), 10),
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
		strconv.FormatUint(uint64(user.ID), 10),
		s.jwtConfig.Secret,
		s.jwtConfig.RefreshExpireHours,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Update last login
	if err := s.userRepo.UpdateLastLogin(strconv.FormatUint(uint64(user.ID), 10)); err != nil {
		// Log error but don't fail login
	}

	// Calculate expiration time
	expiresAt := time.Now().Add(time.Duration(s.jwtConfig.ExpireHours) * time.Hour)

	// Convert user to response with decrypted CTC
	userResponse, err := ConvertUserToResponse(user)
	if err != nil {
		return nil, fmt.Errorf("failed to convert user to response: %w", err)
	}

	return &LoginResponse{
		Token:        token,
		RefreshToken: refreshToken,
		User:         userResponse,
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
		strconv.FormatUint(uint64(user.ID), 10),
		strconv.FormatUint(uint64(user.OrganizationID), 10),
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
		strconv.FormatUint(uint64(user.ID), 10),
		s.jwtConfig.Secret,
		s.jwtConfig.RefreshExpireHours,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Calculate expiration time
	expiresAt := time.Now().Add(time.Duration(s.jwtConfig.ExpireHours) * time.Hour)

	// Convert user to response with decrypted CTC
	userResponse, err := ConvertUserToResponse(user)
	if err != nil {
		return nil, fmt.Errorf("failed to convert user to response: %w", err)
	}

	return &LoginResponse{
		Token:        token,
		RefreshToken: newRefreshToken,
		User:         userResponse,
		ExpiresAt:    expiresAt,
	}, nil
}

func (s *authService) ValidateToken(token string) (*utils.JWTClaims, error) {
	return utils.ValidateToken(token, s.jwtConfig.Secret)
}

func (s *authService) GetUserByID(userID string) (*models.User, error) {
	return s.userRepo.GetByID(userID)
}

// SendOTP sends an OTP to the user's email for login
func (s *authService) SendOTP(email string) error {
	// Find user by email across all organizations
	user, err := s.userRepo.GetByEmailAcrossOrgs(email)
	if err != nil {
		// Don't reveal if user exists or not (security best practice)
		return nil
	}

	// Check if user is active
	if !user.IsActive {
		return nil
	}

	// Invalidate any existing unused OTPs for this email
	if err := s.otpRepo.InvalidateUserOTPs(email); err != nil {
		// Log but don't fail
	}

	// Generate 6-digit OTP
	otp, err := utils.GenerateOTP()
	if err != nil {
		return fmt.Errorf("failed to generate OTP: %w", err)
	}

	// Create OTP token (expires in 10 minutes)
	otpToken := &models.OTPToken{
		UserID:    user.ID,
		Email:     email,
		OTP:       otp,
		ExpiresAt: time.Now().Add(10 * time.Minute),
		Used:      false,
	}

	if err := s.otpRepo.Create(otpToken); err != nil {
		return fmt.Errorf("failed to create OTP token: %w", err)
	}

	// Send OTP email
	emailSubject := "Your HR Portal Login OTP"
	emailBody := fmt.Sprintf(
		"Hello %s,\n\n"+
			"Your OTP for HR Portal login is: %s\n\n"+
			"This OTP will expire in 10 minutes.\n\n"+
			"If you did not request this OTP, please ignore this email.\n\n"+
			"Best regards,\nHR Portal Team",
		user.Name,
		otp,
	)

	if err := s.notificationService.SendEmail(user.Email, emailSubject, emailBody); err != nil {
		// Log but don't fail - OTP is already created
	}

	return nil
}

// VerifyOTP verifies the OTP and logs in the user
func (s *authService) VerifyOTP(email, otp string) (*LoginResponse, error) {
	// Get OTP token
	otpToken, err := s.otpRepo.GetByEmailAndOTP(email, otp)
	if err != nil {
		return nil, fmt.Errorf("invalid or expired OTP")
	}

	// Mark OTP as used
	if err := s.otpRepo.MarkAsUsed(otp); err != nil {
		// Continue anyway
	}

	// Get user
	user, err := s.userRepo.GetByID(strconv.FormatUint(uint64(otpToken.UserID), 10))
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Check if user is still active
	if !user.IsActive {
		return nil, fmt.Errorf("user account is deactivated")
	}

	// Generate JWT token
	token, err := utils.GenerateToken(
		strconv.FormatUint(uint64(user.ID), 10),
		strconv.FormatUint(uint64(user.OrganizationID), 10),
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
		strconv.FormatUint(uint64(user.ID), 10),
		s.jwtConfig.Secret,
		s.jwtConfig.RefreshExpireHours,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Update last login
	if err := s.userRepo.UpdateLastLogin(strconv.FormatUint(uint64(user.ID), 10)); err != nil {
		// Log error but don't fail login
	}

	// Calculate expiration time
	expiresAt := time.Now().Add(time.Duration(s.jwtConfig.ExpireHours) * time.Hour)

	// Convert user to response with decrypted CTC
	userResponse, err := ConvertUserToResponse(user)
	if err != nil {
		return nil, fmt.Errorf("failed to convert user to response: %w", err)
	}

	return &LoginResponse{
		Token:        token,
		RefreshToken: refreshToken,
		User:         userResponse,
		ExpiresAt:    expiresAt,
	}, nil
}

// ForgotPassword initiates a password reset request
func (s *authService) ForgotPassword(email string, resetURL string) error {
	// Find user by email across all organizations
	user, err := s.userRepo.GetByEmailAcrossOrgs(email)
	if err != nil {
		// Don't reveal if user exists or not (security best practice)
		return nil
	}

	// Check if user is active
	if !user.IsActive {
		return nil
	}

	// Invalidate any existing unused tokens for this user
	if err := s.passwordResetRepo.InvalidateUserTokens(strconv.FormatUint(uint64(user.ID), 10)); err != nil {
		// Log but don't fail
	}

	// Generate secure random token
	token, err := utils.GenerateRandomString(64)
	if err != nil {
		return fmt.Errorf("failed to generate reset token: %w", err)
	}

	// Create password reset token (expires in 1 hour)
	resetToken := &models.PasswordResetToken{
		UserID:    user.ID,
		Token:     token,
		ExpiresAt: time.Now().Add(1 * time.Hour),
		Used:      false,
	}

	if err := s.passwordResetRepo.Create(resetToken); err != nil {
		return fmt.Errorf("failed to create reset token: %w", err)
	}

	// Send password reset email
	resetLink := fmt.Sprintf("%s?token=%s", resetURL, token)
	emailSubject := "Password Reset Request - HR Portal"
	emailBody := fmt.Sprintf(
		"Hello %s,\n\n"+
			"You requested a password reset for your HR Portal account.\n\n"+
			"Click the following link to reset your password:\n%s\n\n"+
			"This link will expire in 1 hour.\n\n"+
			"If you did not request this password reset, please ignore this email.\n\n"+
			"Best regards,\nHR Portal Team",
		user.Name,
		resetLink,
	)

	if err := s.notificationService.SendEmail(user.Email, emailSubject, emailBody); err != nil {
		// Log but don't fail - token is already created
	}

	return nil
}

// ResetPassword resets a user's password using a reset token
func (s *authService) ResetPassword(token, newPassword string) error {
	// Validate password strength (relaxed - just check length for now)
	if len(newPassword) < 8 {
		return fmt.Errorf("password must be at least 8 characters long")
	}

	// Get reset token
	resetToken, err := s.passwordResetRepo.GetByToken(token)
	if err != nil {
		return fmt.Errorf("invalid or expired token")
	}

	// Mark token as used
	if err := s.passwordResetRepo.MarkAsUsed(token); err != nil {
		// Continue anyway
	}

	// Hash new password
	hashedPassword, err := utils.HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Update user password
	user, err := s.userRepo.GetByID(strconv.FormatUint(uint64(resetToken.UserID), 10))
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	user.PasswordHash = hashedPassword
	if err := s.userRepo.Update(user); err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	// Send confirmation email (non-blocking)
	go func() {
		emailSubject := "Password Reset Successful - HR Portal"
		emailBody := fmt.Sprintf(
			"Hello %s,\n\n"+
				"Your password has been successfully reset.\n\n"+
				"If you did not perform this action, please contact support immediately.\n\n"+
				"Best regards,\nHR Portal Team",
			user.Name,
		)
		if err := s.notificationService.SendEmail(user.Email, emailSubject, emailBody); err != nil {
			// Log error silently
		}
	}()

	return nil
}
