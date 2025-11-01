package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
	"hr-portal-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// GodHandler handles God-level operations
type GodHandler struct {
	services *services.Services
	repos    *repositories.Repositories
}

// NewGodHandler creates a new God handler
func NewGodHandler(services *services.Services, repos *repositories.Repositories) *GodHandler {
	return &GodHandler{
		services: services,
		repos:    repos,
	}
}

// GetPlatformStats returns platform-wide statistics
func (h *GodHandler) GetPlatformStats(c *gin.Context) {
	var totalOrgs int64
	var totalUsers int64
	var activeOrgs int64

	h.services.Organization.Count(&totalOrgs)
	h.services.User.Count(&totalUsers)
	h.services.Organization.CountActive(&activeOrgs)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"total_organizations":  totalOrgs,
			"active_organizations": activeOrgs,
			"total_users":          totalUsers,
		},
	})
}

// ListOrganizations returns all organizations
func (h *GodHandler) ListOrganizations(c *gin.Context) {
	organizations, err := h.services.Organization.ListAllWithUserCount()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch organizations"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"organizations": organizations})
}

// GetOrganization returns a specific organization by ID with admin user info
func (h *GodHandler) GetOrganization(c *gin.Context) {
	orgID := c.Param("id")
	org, err := h.services.Organization.GetByID(orgID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Organization not found"})
		return
	}

	// Get user count for this organization
	var userCount int64
	if err := h.repos.User.CountByOrganization(orgID, &userCount); err != nil {
		userCount = 0
	}

	// Get admin user for this organization
	adminUser, err := h.services.User.GetAdminByOrganizationID(orgID)
	if err != nil {
		// No admin user found, that's okay
		adminUser = nil
	}

	// Create organization response with user count
	orgResponse := map[string]interface{}{
		"id":         org.ID,
		"created_at": org.CreatedAt,
		"updated_at": org.UpdatedAt,
		"name":       org.Name,
		"domain":     org.Domain,
		"is_active":  org.IsActive,
		"user_count": userCount,
	}

	response := gin.H{
		"organization": orgResponse,
	}

	if adminUser != nil {
		response["admin_user"] = gin.H{
			"id":       adminUser.ID,
			"username": adminUser.Username,
			"email":    adminUser.Email,
			"name":     adminUser.Name,
			"role":     adminUser.Role,
		}
	}

	c.JSON(http.StatusOK, response)
}

// CreateOrganization creates a new organization
func (h *GodHandler) CreateOrganization(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		Domain      string `json:"domain"`
		Description string `json:"description"`
		Settings    string `json:"settings"`
		IsActive    *bool  `json:"is_active"`
		AdminUser   *struct {
			Username string `json:"username" binding:"required"`
			Email    string `json:"email" binding:"required,email"`
			Password string `json:"password" binding:"required"`
			Name     string `json:"name" binding:"required"`
		} `json:"admin_user" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format: " + err.Error()})
		return
	}

	// Check if domain already exists (if domain is provided)
	if req.Domain != "" {
		existingOrg, _ := h.services.Organization.GetByDomain(req.Domain)
		if existingOrg != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Domain already exists"})
			return
		}
	}

	// Create organization
	org := &models.Organization{
		Name:     req.Name,
		Domain:   req.Domain,
		Settings: req.Settings,
		IsActive: true,
	}
	if req.IsActive != nil {
		org.IsActive = *req.IsActive
	}

	if err := h.services.Organization.Create(org); err != nil {
		// Check for specific database errors
		if strings.Contains(err.Error(), "UNIQUE constraint failed") || strings.Contains(err.Error(), "duplicate key") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Organization with this domain already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create organization: " + err.Error()})
		return
	}

	// Create admin user
	orgIDStr := fmt.Sprintf("%d", org.ID)
	createUserReq := services.CreateUserRequest{
		OrganizationID: orgIDStr,
		Username:       req.AdminUser.Username,
		Email:          req.AdminUser.Email,
		Password:       req.AdminUser.Password,
		Name:           req.AdminUser.Name,
		Role:           "Admin",
		Department:     "Management", // Default department for admin
	}

	adminUser, err := h.services.User.CreateUser(createUserReq, c.Request)
	if err != nil {
		// If user creation fails, delete the organization to maintain consistency
		h.services.Organization.Delete(orgIDStr)

		// Provide more specific error messages
		errorMsg := err.Error()
		if strings.Contains(errorMsg, "username already exists") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username already exists"})
			return
		}
		if strings.Contains(errorMsg, "email already exists") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Email already exists"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create admin user: " + errorMsg})
		return
	}

	// Return organization with admin user info
	response := gin.H{
		"data":    org,
		"message": "Organization created successfully",
	}

	if adminUser != nil {
		response["admin_user"] = gin.H{
			"id":       adminUser.ID,
			"username": adminUser.Username,
			"email":    adminUser.Email,
			"name":     adminUser.Name,
			"role":     adminUser.Role,
		}
	}

	c.JSON(http.StatusCreated, response)
}

// UpdateOrganization updates an organization
func (h *GodHandler) UpdateOrganization(c *gin.Context) {
	orgID := c.Param("id")
	org, err := h.services.Organization.GetByID(orgID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Organization not found"})
		return
	}

	var req struct {
		Name        string `json:"name"`
		Domain      string `json:"domain"`
		Description string `json:"description"`
		Settings    string `json:"settings"`
		IsActive    *bool  `json:"is_active"`
		AdminUser   *struct {
			Username string `json:"username"`
			Email    string `json:"email"`
			Name     string `json:"name"`
		} `json:"admin_user"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Update organization fields if provided
	if req.Name != "" {
		org.Name = req.Name
	}
	if req.Domain != "" {
		org.Domain = req.Domain
	}
	if req.Description != "" {
		// Assuming Description field exists in Organization model
		// If not, this might need to be stored in Settings or added to the model
	}
	if req.Settings != "" {
		org.Settings = req.Settings
	}
	if req.IsActive != nil {
		org.IsActive = *req.IsActive
	}

	if err := h.services.Organization.Update(org); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update organization"})
		return
	}

	// Update admin user if provided
	if req.AdminUser != nil {
		adminUser, err := h.services.User.GetAdminByOrganizationID(orgID)
		if err == nil && adminUser != nil {
			// Update admin user fields
			updateReq := services.UpdateUserRequest{}

			if req.AdminUser.Username != "" {
				updateReq.Username = &req.AdminUser.Username
			}
			if req.AdminUser.Email != "" {
				updateReq.Email = &req.AdminUser.Email
			}
			if req.AdminUser.Name != "" {
				updateReq.Name = &req.AdminUser.Name
			}

			if updateReq.Username != nil || updateReq.Email != nil || updateReq.Name != nil {
				_, err := h.services.User.UpdateUser(fmt.Sprintf("%d", adminUser.ID), updateReq, c.Request)
				if err != nil {
					// Log error but don't fail the organization update
					// Warning: Failed to update admin user
				}
			}
		}
	}

	// Return updated organization with admin user info
	adminUser, _ := h.services.User.GetAdminByOrganizationID(orgID)
	response := gin.H{
		"data":    org,
		"message": "Organization updated successfully",
	}

	if adminUser != nil {
		response["admin_user"] = gin.H{
			"id":       adminUser.ID,
			"username": adminUser.Username,
			"email":    adminUser.Email,
			"name":     adminUser.Name,
		}
	}

	c.JSON(http.StatusOK, response)
}

// DeleteOrganization deletes an organization
func (h *GodHandler) DeleteOrganization(c *gin.Context) {
	orgID := c.Param("id")

	if err := h.services.Organization.Delete(orgID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete organization"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Organization deleted successfully"})
}

// ListUsers returns all users across all organizations
func (h *GodHandler) ListUsers(c *gin.Context) {
	users, err := h.services.User.ListAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"users": users})
}

// CreateUser creates a new user
func (h *GodHandler) CreateUser(c *gin.Context) {
	var req struct {
		Name           string  `json:"name" validate:"required"`
		Email          string  `json:"email" validate:"required,email"`
		Username       string  `json:"username" validate:"required"`
		Password       string  `json:"password" validate:"required"`
		Role           string  `json:"role" validate:"required"`
		Designation    string  `json:"designation"`
		Department     string  `json:"department" validate:"required"`
		OrganizationID string  `json:"organization_id" validate:"required"`
		CTC            float64 `json:"ctc"`
		IsActive       bool    `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	createdUser, err := h.services.User.CreateUser(services.CreateUserRequest{
		Name:           req.Name,
		Email:          req.Email,
		Username:       req.Username,
		Password:       req.Password,
		Role:           req.Role,
		Designation:    req.Designation,
		Department:     req.Department,
		OrganizationID: req.OrganizationID,
		CTC:            req.CTC,
	}, c.Request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, createdUser)
}

// UpdateUser updates a user
func (h *GodHandler) UpdateUser(c *gin.Context) {
	userID := c.Param("id")
	user, err := h.services.User.GetUser(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var req struct {
		Name        string  `json:"name"`
		Email       string  `json:"email"`
		Username    string  `json:"username"`
		Role        string  `json:"role"`
		Designation string  `json:"designation"`
		Department  string  `json:"department"`
		CTC         float64 `json:"ctc"`
		IsActive    *bool   `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Update fields if provided
	if req.Name != "" {
		user.Name = req.Name
	}
	if req.Email != "" {
		user.Email = req.Email
	}
	if req.Username != "" {
		user.Username = req.Username
	}
	if req.Role != "" {
		user.Role = req.Role
	}
	if req.Designation != "" {
		user.Designation = req.Designation
	}
	if req.Department != "" {
		user.Department = req.Department
	}
	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}

	// Handle CTC separately since it needs encryption
	var ctcPtr *float64
	if req.CTC > 0 {
		ctcPtr = &req.CTC
	}

	updatedUser, err := h.services.User.UpdateUser(userID, services.UpdateUserRequest{
		Name:        &user.Name,
		Email:       &user.Email,
		Username:    &user.Username,
		Role:        &user.Role,
		Designation: &user.Designation,
		Department:  &user.Department,
		CTC:         ctcPtr,
		IsActive:    &user.IsActive,
	}, c.Request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	c.JSON(http.StatusOK, updatedUser)
}

// DeleteUser deletes a user
func (h *GodHandler) DeleteUser(c *gin.Context) {
	userID := c.Param("id")

	if err := h.services.User.DeleteUser(userID, c.Request); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

// UploadOrganizationLogo handles POST /api/god/organizations/:id/logo
func (h *GodHandler) UploadOrganizationLogo(c *gin.Context) {
	organizationID := c.Param("id")
	if organizationID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Organization ID is required"})
		return
	}

	// Get organization
	org, err := h.repos.Organization.GetByID(organizationID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Organization not found"})
		return
	}

	// Get uploaded file
	file, err := c.FormFile("logo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Validate file type
	allowedTypes := []string{".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"}
	ext := strings.ToLower(filepath.Ext(file.Filename))
	isValidType := false
	for _, allowedType := range allowedTypes {
		if ext == allowedType {
			isValidType = true
			break
		}
	}

	if !isValidType {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Allowed types: jpg, jpeg, png, gif, svg, webp"})
		return
	}

	// Validate file size (max 5MB)
	if file.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size too large. Maximum size is 5MB"})
		return
	}

	// Generate unique filename
	filename := fmt.Sprintf("org_%s_logo%s", organizationID, ext)
	uploadPath := filepath.Join("uploads", "logos", filename)

	// Create directory if it doesn't exist
	if err := c.SaveUploadedFile(file, uploadPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Update organization with logo URL
	logoURL := fmt.Sprintf("/api/files/logos/%s", filename)
	org.Logo = logoURL

	if err := h.repos.Organization.Update(org); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update organization"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Logo uploaded successfully",
		"logo_url": logoURL,
	})
}

// ServeLogoFile serves organization logo files
func (h *GodHandler) ServeLogoFile(c *gin.Context) {
	filename := c.Param("filename")
	if filename == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Filename is required"})
		return
	}

	// Security check - ensure filename doesn't contain path traversal
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid filename"})
		return
	}

	filePath := filepath.Join("uploads", "logos", filename)

	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Logo file not found"})
		return
	}

	// Set appropriate headers
	c.Header("Content-Type", "image/*")
	c.Header("Cache-Control", "public, max-age=31536000") // Cache for 1 year

	// Serve the file
	c.File(filePath)
}
