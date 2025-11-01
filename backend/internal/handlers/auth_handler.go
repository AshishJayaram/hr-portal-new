package handlers

import (
	"net/http"

	"hr-portal-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// AuthHandler handles authentication-related HTTP requests
type AuthHandler struct {
	authService services.AuthService
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(authService services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// Login handles user login
// @Summary Login user
// @Description Authenticate user and return JWT token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body services.LoginRequest true "Login credentials"
// @Success 200 {object} services.LoginResponse
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Router /api/auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req services.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	// Validate request
	if req.Username == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Username and password are required",
		})
		return
	}

	// Attempt login
	response, err := h.authService.Login(req)
	if err != nil {
		logrus.WithError(err).Error("Login failed")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid credentials",
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// Logout handles user logout
// @Summary Logout user
// @Description Logout user and invalidate token
// @Tags auth
// @Security BearerAuth
// @Produce json
// @Success 200 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Router /api/auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	if err := h.authService.Logout(userID.(string)); err != nil {
		logrus.WithError(err).Error("Logout failed")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to logout",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Logged out successfully",
	})
}

// RefreshToken handles token refresh
// @Summary Refresh JWT token
// @Description Generate new JWT token using refresh token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body map[string]string true "Refresh token"
// @Success 200 {object} services.LoginResponse
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Router /api/auth/refresh [post]
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Refresh token is required",
		})
		return
	}

	response, err := h.authService.RefreshToken(req.RefreshToken)
	if err != nil {
		logrus.WithError(err).Error("Token refresh failed")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid refresh token",
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetCurrentUser returns the current user's information
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	user, err := h.authService.GetUserByID(userID.(string))
	if err != nil {
		logrus.WithError(err).Error("Failed to get user")
		c.JSON(http.StatusNotFound, gin.H{
			"error": "User not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": user,
	})
}

// SendOTP handles OTP request for email login
func (h *AuthHandler) SendOTP(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Valid email address is required",
		})
		return
	}

	err := h.authService.SendOTP(req.Email)
	if err != nil {
		logrus.WithError(err).Error("Failed to send OTP")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to send OTP",
		})
		return
	}

	// Always return success to prevent email enumeration
	c.JSON(http.StatusOK, gin.H{
		"message": "If an account with that email exists, an OTP has been sent.",
	})
}

// VerifyOTP handles OTP verification and login
func (h *AuthHandler) VerifyOTP(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
		OTP   string `json:"otp" binding:"required,len=6"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Email and 6-digit OTP are required",
		})
		return
	}

	response, err := h.authService.VerifyOTP(req.Email, req.OTP)
	if err != nil {
		logrus.WithError(err).Error("OTP verification failed")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// ForgotPassword handles forgot password request - sends OTP
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Valid email address is required",
		})
		return
	}

	err := h.authService.ForgotPassword(req.Email)
	if err != nil {
		logrus.WithError(err).Error("Failed to process forgot password request")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to process password reset request",
		})
		return
	}

	// Always return success to prevent email enumeration
	c.JSON(http.StatusOK, gin.H{
		"message": "If an account with that email exists, a password reset OTP has been sent.",
	})
}

// ResetPassword handles password reset with OTP
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req struct {
		Email       string `json:"email" binding:"required,email"`
		OTP         string `json:"otp" binding:"required,len=6"`
		NewPassword string `json:"new_password" binding:"required,min=8"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Email, 6-digit OTP, and new password (minimum 8 characters) are required",
		})
		return
	}

	err := h.authService.ResetPasswordWithOTP(req.Email, req.OTP, req.NewPassword)
	if err != nil {
		logrus.WithError(err).Error("Failed to reset password")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Password reset successfully",
	})
}
