package handlers

import (
	"net/http"
	"strconv"
	"time"

	"hr-portal-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// KRAHandler handles KRA-related HTTP requests
type KRAHandler struct {
	kraService services.KRAService
}

// NewKRAHandler creates a new KRA handler
func NewKRAHandler(kraService services.KRAService) *KRAHandler {
	return &KRAHandler{
		kraService: kraService,
	}
}

// CreateKRARequestBody represents the request body for creating a KRA
type CreateKRARequestBody struct {
	UserID          string  `json:"user_id" binding:"required"`
	Year            int     `json:"year" binding:"required"`
	Title           string  `json:"title" binding:"required"`
	Description     string  `json:"description"`
	Weight          float64 `json:"weight" binding:"required,min=1,max=100"`
	TargetValue     string  `json:"target_value" binding:"required"`
	MeasurementUnit string  `json:"measurement_unit" binding:"required"`
}

// CreateKRA handles POST /api/kras
func (h *KRAHandler) CreateKRA(c *gin.Context) {
	var reqBody CreateKRARequestBody
	if err := c.ShouldBindJSON(&reqBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Create the service request with context values
	req := services.CreateKRARequest{
		UserID:          reqBody.UserID,
		OrganizationID:  c.GetString("current_organization_id"),
		Year:            reqBody.Year,
		Title:           reqBody.Title,
		Description:     reqBody.Description,
		Weight:          reqBody.Weight,
		TargetValue:     reqBody.TargetValue,
		MeasurementUnit: reqBody.MeasurementUnit,
		SetBy:           c.GetString("user_id"),
	}

	// Validate required context values
	if req.OrganizationID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Organization ID is required",
		})
		return
	}

	if req.SetBy == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "User ID is required",
		})
		return
	}

	kra, err := h.kraService.CreateKRA(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create KRA",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "KRA created successfully",
		"data":    kra,
	})
}

// GetKRA handles GET /api/kras/:id
func (h *KRAHandler) GetKRA(c *gin.Context) {
	id := c.Param("id")

	kra, err := h.kraService.GetKRA(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "KRA not found",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": kra,
	})
}

// GetUserKRAs handles GET /api/kras/user/:user_id
func (h *KRAHandler) GetUserKRAs(c *gin.Context) {
	userID := c.Param("user_id")
	organizationID := c.GetString("organization_id")

	yearStr := c.Query("year")
	if yearStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Year parameter is required",
		})
		return
	}

	year, err := strconv.Atoi(yearStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid year parameter",
		})
		return
	}

	kras, err := h.kraService.GetUserKRAs(userID, organizationID, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get user KRAs",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": kras,
	})
}

// GetAllUserKRAs handles GET /api/kras/user/:user_id/all
func (h *KRAHandler) GetAllUserKRAs(c *gin.Context) {
	userID := c.Param("user_id")
	organizationID := c.GetString("organization_id")

	kras, err := h.kraService.GetAllUserKRAs(userID, organizationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get user KRAs",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": kras,
	})
}

// GetTeamKRAs handles GET /api/kras/team
func (h *KRAHandler) GetTeamKRAs(c *gin.Context) {
	managerID := c.GetString("user_id")
	organizationID := c.GetString("organization_id")

	yearStr := c.Query("year")
	if yearStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Year parameter is required",
		})
		return
	}

	year, err := strconv.Atoi(yearStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid year parameter",
		})
		return
	}

	kras, err := h.kraService.GetTeamKRAs(managerID, organizationID, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get team KRAs",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": kras,
	})
}

// UpdateKRA handles PUT /api/kras/:id
func (h *KRAHandler) UpdateKRA(c *gin.Context) {
	id := c.Param("id")

	var req services.UpdateKRARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	kra, err := h.kraService.UpdateKRA(id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update KRA",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "KRA updated successfully",
		"data":    kra,
	})
}

// EvaluateKRA handles POST /api/kras/:id/evaluate
func (h *KRAHandler) EvaluateKRA(c *gin.Context) {
	id := c.Param("id")

	var req services.EvaluateKRARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Set evaluated_by from authenticated user
	req.EvaluatedBy = c.GetString("user_id")

	kra, err := h.kraService.EvaluateKRA(id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to evaluate KRA",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "KRA evaluated successfully",
		"data":    kra,
	})
}

// SelfAssessKRA handles POST /api/kras/:id/self-assess
func (h *KRAHandler) SelfAssessKRA(c *gin.Context) {
	id := c.Param("id")

	// Bind only the fields provided by the client; set RatedBy from auth context
	type SelfAssessKRARequestBody struct {
		ActualValue      string  `json:"actual_value" binding:"required"`
		EmployeeRating   float64 `json:"employee_rating" binding:"required,min=1,max=5"`
		EmployeeComments string  `json:"employee_comments"`
	}

	var body SelfAssessKRARequestBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid assessment body",
			"details": err.Error(),
		})
		return
	}

	// Set employee_rated_by from authenticated user
	req := services.SelfAssessKRARequest{
		ActualValue:      body.ActualValue,
		EmployeeRating:   body.EmployeeRating,
		EmployeeComments: body.EmployeeComments,
		EmployeeRatedBy:  c.GetString("user_id"),
	}

	kra, err := h.kraService.SelfAssessKRA(id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to self-assess KRA",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "KRA self-assessment submitted successfully",
		"data":    kra,
	})
}

// GetReporteesKRAs handles GET /api/kras/reportees
func (h *KRAHandler) GetReporteesKRAs(c *gin.Context) {
	managerID := c.GetString("user_id")
	organizationID := c.GetString("current_organization_id")
	yearStr := c.Query("year")

	year := time.Now().Year()
	if yearStr != "" {
		if parsedYear, err := strconv.Atoi(yearStr); err == nil {
			year = parsedYear
		}
	}

	kras, err := h.kraService.GetReporteesKRAs(managerID, organizationID, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get reportees KRAs",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Reportees KRAs retrieved successfully",
		"data":    kras,
	})
}

// DeleteKRA handles DELETE /api/kras/:id
func (h *KRAHandler) DeleteKRA(c *gin.Context) {
	id := c.Param("id")

	err := h.kraService.DeleteKRA(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to delete KRA",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "KRA deleted successfully",
	})
}

// ListKRAs handles GET /api/kras
func (h *KRAHandler) ListKRAs(c *gin.Context) {
	organizationID := c.GetString("organization_id")

	// Build filters from query parameters
	filters := make(map[string]interface{})

	if userID := c.Query("user_id"); userID != "" {
		filters["user_id"] = userID
	}

	if yearStr := c.Query("year"); yearStr != "" {
		if year, err := strconv.Atoi(yearStr); err == nil {
			filters["year"] = year
		}
	}

	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}

	if setBy := c.Query("set_by"); setBy != "" {
		filters["set_by"] = setBy
	}

	if evaluatedStr := c.Query("evaluated"); evaluatedStr != "" {
		if evaluated, err := strconv.ParseBool(evaluatedStr); err == nil {
			filters["evaluated"] = evaluated
		}
	}

	if search := c.Query("search"); search != "" {
		filters["search"] = search
	}

	kras, err := h.kraService.ListKRAs(organizationID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to list KRAs",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": kras,
	})
}

// GetKRASummary handles GET /api/kras/user/:user_id/summary
func (h *KRAHandler) GetKRASummary(c *gin.Context) {
	userID := c.Param("user_id")
	organizationID := c.GetString("organization_id")

	yearStr := c.Query("year")
	if yearStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Year parameter is required",
		})
		return
	}

	year, err := strconv.Atoi(yearStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid year parameter",
		})
		return
	}

	summary, err := h.kraService.GetKRASummary(userID, organizationID, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get KRA summary",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": summary,
	})
}

// BulkEvaluateKRAs handles POST /api/kras/bulk-evaluate
func (h *KRAHandler) BulkEvaluateKRAs(c *gin.Context) {
	var req services.BulkEvaluateKRAsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Set evaluator from auth context
	req.EvaluatedBy = c.GetString("user_id")

	response, err := h.kraService.BulkEvaluateKRAs(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to evaluate KRAs",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Bulk evaluation completed",
		"data":    response,
	})
}

// BulkSelfAssessKRAs handles POST /api/kras/bulk-self-assess
func (h *KRAHandler) BulkSelfAssessKRAs(c *gin.Context) {
	var req services.BulkSelfAssessKRAsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	response, err := h.kraService.BulkSelfAssessKRAs(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to self-assess KRAs",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Bulk self-assessment completed",
		"data":    response,
	})
}
