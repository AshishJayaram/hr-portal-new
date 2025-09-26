package handlers

import (
	"net/http"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// GodHandler handles God-level operations
type GodHandler struct {
	services *services.Services
}

// NewGodHandler creates a new God handler
func NewGodHandler(services *services.Services) *GodHandler {
	return &GodHandler{
		services: services,
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
	organizations, err := h.services.Organization.ListAll()
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

	// Get admin user for this organization
	adminUser, err := h.services.User.GetAdminByOrganizationID(orgID)
	if err != nil {
		// No admin user found, that's okay
		adminUser = nil
	}

	response := gin.H{
		"organization": org,
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
	var org models.Organization
	if err := c.ShouldBindJSON(&org); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	if err := h.services.Organization.Create(&org); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create organization"})
		return
	}

	c.JSON(http.StatusCreated, org)
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
		Name     string `json:"name"`
		Domain   string `json:"domain"`
		Settings string `json:"settings"`
		IsActive *bool  `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Update fields if provided
	if req.Name != "" {
		org.Name = req.Name
	}
	if req.Domain != "" {
		org.Domain = req.Domain
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

	c.JSON(http.StatusOK, org)
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
	})
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
	if req.CTC > 0 {
		user.CTC = req.CTC
	}
	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}

	updatedUser, err := h.services.User.UpdateUser(userID, services.UpdateUserRequest{
		Name:        &user.Name,
		Email:       &user.Email,
		Username:    &user.Username,
		Role:        &user.Role,
		Designation: &user.Designation,
		Department:  &user.Department,
		CTC:         &user.CTC,
		IsActive:    &user.IsActive,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	c.JSON(http.StatusOK, updatedUser)
}

// DeleteUser deletes a user
func (h *GodHandler) DeleteUser(c *gin.Context) {
	userID := c.Param("id")

	if err := h.services.User.DeleteUser(userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}
