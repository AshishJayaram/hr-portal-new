package handlers

import (
	"net/http"

	"hr-portal-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// TeamHandler handles team-related HTTP requests
type TeamHandler struct {
	userService services.UserService
}

// NewTeamHandler creates a new team handler
func NewTeamHandler(userService services.UserService) *TeamHandler {
	return &TeamHandler{
		userService: userService,
	}
}

// GetTeam handles getting team hierarchy
// @Summary Get team hierarchy
// @Description Get team structure with manager-subordinate relationships
// @Tags team
// @Security BearerAuth
// @Security OrganizationAuth
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Router /api/team [get]
func (h *TeamHandler) GetTeam(c *gin.Context) {
	organizationID, _ := c.Get("current_organization_id")

	// Get all users in the organization with manager relationships
	users, err := h.userService.ListUsers(organizationID.(string), map[string]interface{}{})
	if err != nil {
		logrus.WithError(err).Error("Failed to list team members")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch team members",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  users,
		"total": len(users),
	})
}
