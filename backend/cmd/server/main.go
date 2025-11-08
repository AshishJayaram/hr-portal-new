package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"hr-portal-backend/internal/config"
	"hr-portal-backend/internal/database"
	"hr-portal-backend/internal/handlers"
	"hr-portal-backend/internal/middleware"
	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
	"hr-portal-backend/internal/services"

	_ "hr-portal-backend/cmd/server/docs"

	"github.com/gin-contrib/requestid"
	"github.com/gin-contrib/timeout"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/sirupsen/logrus"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// @title HR Portal API
// @version 1.0
// @description A comprehensive HR management system API
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url http://www.swagger.io/support
// @contact.email support@swagger.io

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:8080
// @BasePath /api

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

// @securityDefinitions.apikey OrganizationAuth
// @in header
// @name X-Organization-ID
// @description Organization ID for multi-tenant access

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Setup logging
	setupLogging(cfg)

	// Initialize database
	db, err := database.Initialize(cfg.Database)
	if err != nil {
		logrus.Fatalf("Failed to initialize database: %v", err)
	}

	// Initialize Redis (disabled for now)
	// rdb := redis.NewClient(&redis.Options{
	// 	Addr:     fmt.Sprintf("%s:%d", cfg.Redis.Host, cfg.Redis.Port),
	// 	Password: cfg.Redis.Password,
	// 	DB:       cfg.Redis.DB,
	// 	PoolSize: cfg.Redis.PoolSize,
	// })

	// Test Redis connection
	// ctx := context.Background()
	// if err := rdb.Ping(ctx).Err(); err != nil {
	// 	logrus.Fatalf("Failed to connect to Redis: %v", err)
	// }

	// Initialize repositories (without Redis for now)
	repos := repositories.New(db, nil)

	// Initialize services
	services := services.New(repos, cfg, db, nil)

	// Initialize handlers
	handlers := handlers.New(services, repos, cfg)

	// Setup Gin router
	router := setupRouter(cfg, handlers)

	// Start server
	startServer(router, cfg.Server.Port, repos, services.Notification)
}

func setupLogging(cfg *config.Config) {
	// Set log level
	level, err := logrus.ParseLevel(cfg.Logging.Level)
	if err != nil {
		level = logrus.InfoLevel
	}
	logrus.SetLevel(level)

	// Set log format
	if cfg.Logging.Format == "json" {
		logrus.SetFormatter(&logrus.JSONFormatter{
			TimestampFormat: time.RFC3339,
		})
	} else {
		logrus.SetFormatter(&logrus.TextFormatter{
			FullTimestamp:   true,
			TimestampFormat: time.RFC3339,
		})
	}

	// Set Gin mode
	gin.SetMode(cfg.Server.GinMode)
}

func setupRouter(cfg *config.Config, handlers *handlers.Handlers) *gin.Engine {
	router := gin.New()

	// CORS configuration - more permissive for file uploads (must be first)
	router.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin == "" {
			origin = "*"
		}

		c.Header("Access-Control-Allow-Origin", origin)
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Organization-ID, X-Requested-With")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "86400") // Cache preflight requests for 24 hours

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(requestid.New())
	router.Use(timeout.New(
		timeout.WithTimeout(30*time.Second),
		timeout.WithHandler(func(c *gin.Context) {
			c.Next()
		}),
		timeout.WithResponse(func(c *gin.Context) {
			c.JSON(http.StatusRequestTimeout, gin.H{
				"error": "Request timeout",
			})
		}),
	))

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"timestamp": time.Now().UTC(),
			"version":   "1.0.0",
		})
	})

	// Metrics endpoint
	if cfg.Monitoring.MetricsEnabled {
		router.GET("/metrics", gin.WrapH(promhttp.Handler()))
	}

	// API routes
	api := router.Group("/api")
	{
		// Authentication routes
		auth := api.Group("/auth")
		{
			auth.POST("/login", handlers.Auth.Login)
			auth.POST("/logout", middleware.AuthRequired(cfg.JWT.Secret), handlers.Auth.Logout)
			auth.POST("/refresh", handlers.Auth.RefreshToken)
			auth.GET("/me", middleware.AuthRequired(cfg.JWT.Secret), handlers.Auth.GetCurrentUser)
			auth.POST("/send-otp", handlers.Auth.SendOTP)
			auth.POST("/verify-otp", handlers.Auth.VerifyOTP)
			auth.POST("/forgot-password", handlers.Auth.ForgotPassword)
			auth.POST("/reset-password", handlers.Auth.ResetPassword)
		}

		// User routes
		users := api.Group("/users")
		users.Use(middleware.AuthRequired(cfg.JWT.Secret))
		users.Use(middleware.OrganizationRequired())
		{
			users.GET("", handlers.User.ListUsers)
			users.GET("/:id", handlers.User.GetUser)
			users.POST("", middleware.RoleRequired("HR", "Admin"), handlers.User.CreateUser)
			users.PATCH("/:id", handlers.User.UpdateUser)
			users.DELETE("/:id", middleware.RoleRequired("HR", "Admin", "God"), handlers.User.DeleteUser)
			users.POST("/change-password", handlers.User.ChangePassword)
		}

		// Team routes
		team := api.Group("/team")
		team.Use(middleware.AuthRequired(cfg.JWT.Secret))
		team.Use(middleware.OrganizationRequired())
		{
			team.GET("", handlers.Team.GetTeam)
		}

		// Leave routes
		leaves := api.Group("/leaves")
		leaves.Use(middleware.AuthRequired(cfg.JWT.Secret))
		leaves.Use(middleware.OrganizationRequired())
		{
			leaves.GET("", handlers.Leave.ListLeaves)
			leaves.POST("", handlers.Leave.ApplyLeave)
			leaves.POST("/calculate-spillover", handlers.Leave.CalculateSpillover)
			leaves.GET("/team-balances", handlers.Leave.GetTeamLeaveBalances)
			leaves.GET("/:id", handlers.Leave.GetLeave)
			leaves.PATCH("/:id", handlers.Leave.UpdateLeave)
			// Note: Authorization is checked in the handler itself (HR/Admin/God OR manager of the leave requester)
			leaves.POST("/:id/approve", handlers.Leave.ApproveLeave)
			leaves.POST("/:id/reject", handlers.Leave.RejectLeave)
			leaves.PUT("/:id/edit", handlers.Leave.EditLeave)
			leaves.POST("/:id/cancel", handlers.Leave.CancelLeave)
			leaves.GET("/balance/:user_id", handlers.Leave.GetLeaveBalance)
		}

		// Document routes
		documents := api.Group("/documents")
		documents.Use(middleware.AuthRequired(cfg.JWT.Secret))
		documents.Use(middleware.OrganizationRequired())
		{
			documents.GET("", handlers.Document.ListDocuments)
			documents.POST("", handlers.Document.UploadDocument)
			documents.GET("/:id", handlers.Document.GetDocument)
			documents.DELETE("/:id", handlers.Document.DeleteDocument)
			documents.GET("/:id/download", handlers.Document.DownloadDocument)
		}

		// File serving routes (no auth required for file access)
		files := api.Group("/files")
		{
			files.GET("/documents/:id", handlers.Document.ServeDocumentFile)
			files.GET("/salary-slips/:id", handlers.SalarySlip.ServeSalarySlipFile)
			files.GET("/reimbursement-bills/:id", handlers.Reimbursement.ServeReimbursementBill)
			files.GET("/logos/:filename", handlers.God.ServeLogoFile)
		}

		// Static file serving for uploads
		router.Static("/api/uploads", "./uploads")
		router.Static("/api/files/private-docs", "./uploads/private_docs")

		// Salary slip routes
		salarySlips := api.Group("/salary-slips")
		salarySlips.Use(middleware.AuthRequired(cfg.JWT.Secret))
		salarySlips.Use(middleware.OrganizationRequired())
		{
			salarySlips.GET("", handlers.SalarySlip.ListSalarySlips)
			salarySlips.POST("", handlers.SalarySlip.AddSalarySlip)
			salarySlips.GET("/:id", handlers.SalarySlip.GetSalarySlip)
			salarySlips.DELETE("/:id", handlers.SalarySlip.DeleteSalarySlip)
			salarySlips.GET("/:id/download", handlers.SalarySlip.DownloadSalarySlip)
			salarySlips.GET("/:id/pdf", middleware.RoleRequired("HR", "Admin", "God"), handlers.PayslipPDF.GeneratePayslipPDF)
			salarySlips.POST("/generate", middleware.RoleRequired("HR", "Admin", "God"), handlers.PayslipPDF.GenerateCustomPayslipPDF)
		}

		// Company settings routes
		company := api.Group("/company")
		company.Use(middleware.AuthRequired(cfg.JWT.Secret))
		company.Use(middleware.OrganizationRequired())
		company.Use(middleware.RoleRequired("HR", "Admin"))
		{
			settings := company.Group("/settings")
			{
				settings.GET("", handlers.Company.GetSettings)
				settings.PATCH("", handlers.Company.UpdateSettings)
				settings.GET("/kra", handlers.Company.GetKRASettings)
				settings.PATCH("/kra", handlers.Company.UpdateKRASettings)
			}
			company.POST("/logo", handlers.Company.UpdateOrganizationLogo)
		}

		// Leave category routes
		leaveCategories := api.Group("/leave-categories")
		leaveCategories.Use(middleware.AuthRequired(cfg.JWT.Secret))
		leaveCategories.Use(middleware.OrganizationRequired())
		leaveCategories.Use(middleware.RoleRequired("HR", "Admin"))
		{
			leaveCategories.GET("", handlers.LeaveCategory.ListLeaveCategories)
			leaveCategories.POST("", handlers.LeaveCategory.CreateLeaveCategory)
			leaveCategories.GET("/:id", handlers.LeaveCategory.GetLeaveCategory)
			leaveCategories.PATCH("/:id", handlers.LeaveCategory.UpdateLeaveCategory)
			leaveCategories.DELETE("/:id", handlers.LeaveCategory.DeleteLeaveCategory)
		}

		// Leave allocation routes
		leaveAllocations := api.Group("/leave-allocations")
		leaveAllocations.Use(middleware.AuthRequired(cfg.JWT.Secret))
		leaveAllocations.Use(middleware.OrganizationRequired())
		{
			leaveAllocations.GET("/:user_id", handlers.LeaveAllocation.GetLeaveAllocations)
			leaveAllocations.POST("", middleware.RoleRequired("HR", "Admin"), handlers.LeaveAllocation.CreateLeaveAllocation)
			leaveAllocations.PATCH("/:id", middleware.RoleRequired("HR", "Admin"), handlers.LeaveAllocation.UpdateLeaveAllocation)
			leaveAllocations.DELETE("/:id", middleware.RoleRequired("HR", "Admin"), handlers.LeaveAllocation.DeleteLeaveAllocation)
		}

		// Holiday routes
		holidays := api.Group("/holidays")
		holidays.Use(middleware.AuthRequired(cfg.JWT.Secret))
		holidays.Use(middleware.OrganizationRequired())
		{
			holidays.GET("", handlers.Holiday.ListHolidays)
			holidays.GET("/upcoming", handlers.Holiday.GetUpcomingHolidaysAndEvents)
			holidays.GET("/years", handlers.Holiday.GetAvailableYears)
			holidays.POST("", middleware.RoleRequired("HR", "Admin"), handlers.Holiday.CreateHoliday)
			holidays.GET("/:id", handlers.Holiday.GetHoliday)
			holidays.PATCH("/:id", middleware.RoleRequired("HR", "Admin"), handlers.Holiday.UpdateHoliday)
			holidays.DELETE("/:id", middleware.RoleRequired("HR", "Admin"), handlers.Holiday.DeleteHoliday)
		}

		// Dashboard routes
		dashboard := api.Group("/dashboard")
		dashboard.Use(middleware.AuthRequired(cfg.JWT.Secret))
		dashboard.Use(middleware.OrganizationRequired())
		{
			dashboard.GET("/stats", handlers.Dashboard.GetStats)
		}

		// God routes - Platform-wide administration
		god := api.Group("/god")
		god.Use(middleware.AuthRequired(cfg.JWT.Secret))
		god.Use(middleware.RoleRequired("God"))
		{
			// Get platform statistics
			god.GET("/stats", handlers.God.GetPlatformStats)

			// Organization management for God users
			god.GET("/organizations", handlers.God.ListOrganizations)
			god.GET("/organizations/:id", handlers.God.GetOrganization)
			god.POST("/organizations", handlers.God.CreateOrganization)
			god.PATCH("/organizations/:id", handlers.God.UpdateOrganization)
			god.POST("/organizations/:id/logo", handlers.God.UploadOrganizationLogo)
			god.DELETE("/organizations/:id", handlers.God.DeleteOrganization)

			// User management for God users (platform-wide)
			god.GET("/users", handlers.God.ListUsers)
			god.POST("/users", handlers.God.CreateUser)
			god.PATCH("/users/:id", handlers.God.UpdateUser)
			god.DELETE("/users/:id", handlers.God.DeleteUser)
		}

		// Audit routes (for Admin, HR, and God roles)
		audit := api.Group("/audit")
		audit.Use(middleware.AuthRequired(cfg.JWT.Secret))
		audit.Use(middleware.OrganizationRequired())
		{
			audit.GET("/logs", handlers.Audit.GetAuditLogs)
			audit.GET("/logs/user/:user_id", handlers.Audit.GetUserAuditLogs)
			audit.GET("/logs/entity", handlers.Audit.GetEntityAuditLogs)
			audit.DELETE("/logs/entity", handlers.Audit.DeleteEntityAuditLogs)
			audit.POST("/dummy-logs", handlers.Audit.AddDummyLogs)
		}

		// Off-site routes
		offSites := api.Group("/off-sites")
		offSites.Use(middleware.AuthRequired(cfg.JWT.Secret))
		offSites.Use(middleware.OrganizationRequired())
		{
			offSites.GET("", handlers.OffSite.ListOffSites)
			offSites.POST("", handlers.OffSite.CreateOffSite)
			offSites.GET("/:id", handlers.OffSite.GetOffSite)
			offSites.PATCH("/:id", handlers.OffSite.UpdateOffSite)
			offSites.DELETE("/:id", handlers.OffSite.DeleteOffSite)
			offSites.GET("/date-range", handlers.OffSite.GetOffSitesByDateRange)
		}

		// Reimbursement routes
		reimbursements := api.Group("/reimbursements")
		reimbursements.Use(middleware.AuthRequired(cfg.JWT.Secret))
		reimbursements.Use(middleware.OrganizationRequired())
		{
			reimbursements.GET("", handlers.Reimbursement.GetReimbursements)
			reimbursements.POST("", handlers.Reimbursement.CreateReimbursement)
			reimbursements.GET("/:id", handlers.Reimbursement.GetReimbursementByID)
			reimbursements.PATCH("/:id", handlers.Reimbursement.UpdateReimbursement)
			reimbursements.GET("/:id/bills", handlers.Reimbursement.GetReimbursementBills)
			reimbursements.POST("/:id/approve", middleware.RoleRequired("HR", "Admin"), handlers.Reimbursement.ApproveReimbursement)
			reimbursements.POST("/:id/reject", middleware.RoleRequired("HR", "Admin"), handlers.Reimbursement.RejectReimbursement)
			reimbursements.POST("/:id/return", middleware.RoleRequired("HR", "Admin"), handlers.Reimbursement.ReturnReimbursement)
			reimbursements.DELETE("/:id", handlers.Reimbursement.DeleteReimbursement)
		}

		// Feedback routes
		feedback := api.Group("/feedback")
		feedback.Use(middleware.AuthRequired(cfg.JWT.Secret))
		feedback.Use(middleware.OrganizationRequired())
		{
			feedback.GET("", handlers.Feedback.GetFeedback)
			feedback.POST("", handlers.Feedback.CreateFeedback)
			feedback.GET("/stats", handlers.Feedback.GetFeedbackStats)
			// Specific routes must come before parameterized routes
			feedback.GET("/archived", handlers.Feedback.GetArchivedFeedback)
			feedback.GET("/:id", handlers.Feedback.GetFeedbackByID)
			feedback.PATCH("/:id", middleware.RoleRequired("HR", "Admin", "God"), handlers.Feedback.UpdateFeedbackStatus)
			feedback.POST("/:id/archive", middleware.RoleRequired("HR", "Admin", "God"), handlers.Feedback.ArchiveFeedback)
			feedback.DELETE("/:id", middleware.RoleRequired("HR", "Admin", "God"), handlers.Feedback.DeleteFeedback)
		}

		// Employee growth routes
		employeeGrowth := api.Group("/employee-growth")
		employeeGrowth.Use(middleware.AuthRequired(cfg.JWT.Secret))
		employeeGrowth.Use(middleware.OrganizationRequired())
		{
			employeeGrowth.GET("/:user_id", handlers.EmployeeGrowth.GetEmployeeGrowth)
			employeeGrowth.POST("", handlers.EmployeeGrowth.CreateGrowthRecord)
			employeeGrowth.GET("/stats/:user_id", handlers.EmployeeGrowth.GetGrowthStats)
			employeeGrowth.GET("/record/:id", handlers.EmployeeGrowth.GetGrowthRecordByID)
			employeeGrowth.PATCH("/record/:id", handlers.EmployeeGrowth.UpdateGrowthRecord)
			employeeGrowth.DELETE("/record/:id", handlers.EmployeeGrowth.DeleteGrowthRecord)
		}

		// Document acknowledgment routes
		documentAcknowledgment := api.Group("/document-acknowledgments")
		documentAcknowledgment.Use(middleware.AuthRequired(cfg.JWT.Secret))
		documentAcknowledgment.Use(middleware.OrganizationRequired())
		{
			documentAcknowledgment.POST("/:id", handlers.DocumentAcknowledgment.AcknowledgeDocument)
			documentAcknowledgment.GET("/document/:id", handlers.DocumentAcknowledgment.GetDocumentAcknowledgments)
			documentAcknowledgment.GET("/user", handlers.DocumentAcknowledgment.GetUserAcknowledgments)
			documentAcknowledgment.GET("/document/:id/users", handlers.DocumentAcknowledgment.GetAcknowledgedUsersForDocument)
		}

		// Designation routes
		designations := api.Group("/designations")
		designations.Use(middleware.AuthRequired(cfg.JWT.Secret))
		designations.Use(middleware.OrganizationRequired())
		{
			designations.GET("", handlers.Designation.ListDesignations)
			designations.POST("", middleware.RoleRequired("HR", "Admin"), handlers.Designation.CreateDesignation)
			designations.GET("/:id", handlers.Designation.GetDesignation)
			designations.PATCH("/:id", middleware.RoleRequired("HR", "Admin"), handlers.Designation.UpdateDesignation)
			designations.DELETE("/:id", middleware.RoleRequired("HR", "Admin"), handlers.Designation.DeleteDesignation)
		}

		// Department routes
		departments := api.Group("/departments")
		departments.Use(middleware.AuthRequired(cfg.JWT.Secret))
		departments.Use(middleware.OrganizationRequired())
		{
			departments.GET("", handlers.Department.ListDepartments)
			departments.POST("", middleware.RoleRequired("HR", "Admin"), handlers.Department.CreateDepartment)
			departments.GET("/:id", handlers.Department.GetDepartment)
			departments.PATCH("/:id", middleware.RoleRequired("HR", "Admin"), handlers.Department.UpdateDepartment)
			departments.DELETE("/:id", middleware.RoleRequired("HR", "Admin"), handlers.Department.DeleteDepartment)
		}

		// Notification routes
		notifications := api.Group("/notifications")
		notifications.Use(middleware.AuthRequired(cfg.JWT.Secret))
		notifications.Use(middleware.OrganizationRequired())
		{
			notifications.GET("", handlers.Notification.GetNotifications)
			notifications.GET("/unread-count", handlers.Notification.GetUnreadCount)
			notifications.PUT("/:id/read", handlers.Notification.MarkAsRead)
			notifications.PUT("/read-all", handlers.Notification.MarkAllAsRead)
		}

		// KRA routes
		kras := api.Group("/kras")
		kras.Use(middleware.AuthRequired(cfg.JWT.Secret))
		kras.Use(middleware.OrganizationRequired())
		{
			kras.GET("", handlers.KRA.ListKRAs)
			kras.POST("", handlers.KRA.CreateKRA)
			kras.POST("/bulk-evaluate", handlers.KRA.BulkEvaluateKRAs)
			kras.POST("/bulk-self-assess", handlers.KRA.BulkSelfAssessKRAs)
			kras.GET("/user/:user_id", handlers.KRA.GetUserKRAs)
			kras.GET("/user/:user_id/all", handlers.KRA.GetAllUserKRAs)
			kras.GET("/user/:user_id/summary", handlers.KRA.GetKRASummary)
			kras.GET("/team", handlers.KRA.GetTeamKRAs)
			kras.GET("/reportees", handlers.KRA.GetReporteesKRAs)
			kras.GET("/:id", handlers.KRA.GetKRA)
			kras.PUT("/:id", handlers.KRA.UpdateKRA)
			kras.DELETE("/:id", handlers.KRA.DeleteKRA)
			kras.POST("/:id/evaluate", handlers.KRA.EvaluateKRA)
			kras.POST("/:id/self-assess", handlers.KRA.SelfAssessKRA)
		}

		// Private document routes (for salary slips page)
		privateDocuments := api.Group("/private-documents")
		privateDocuments.Use(middleware.AuthRequired(cfg.JWT.Secret))
		privateDocuments.Use(middleware.OrganizationRequired())
		{
			privateDocuments.POST("", handlers.PrivateDocument.Upload)
			privateDocuments.GET("/user/:user_id", handlers.PrivateDocument.ListByUser)
			privateDocuments.GET("/:id/download", handlers.PrivateDocument.Download)
			privateDocuments.DELETE("/:id", handlers.PrivateDocument.Delete)
		}
	}

	// Swagger documentation
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	return router
}

// startBirthdayNotifications starts a goroutine that triggers at local midnight daily
// and sends birthday notifications only on the birthday date (no advance wishes).
func startBirthdayNotifications(repos *repositories.Repositories, notificationService services.NotificationService) {
	go func() {
		for {
			now := time.Now()
			// Compute next local midnight
			nextMidnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
			delay := nextMidnight.Sub(now)
			time.Sleep(delay)
			sendBirthdayNotifications(repos, notificationService)
		}
	}()
}

// sendBirthdayNotifications checks for birthdays today and sends notifications at midnight
func sendBirthdayNotifications(repos *repositories.Repositories, notificationService services.NotificationService) {
	logrus.Info("Checking for birthday notifications...")

	// Get all organizations
	organizations, err := repos.Organization.List()
	if err != nil {
		logrus.Errorf("Failed to get organizations for birthday notifications: %v", err)
		return
	}

	now := time.Now()

	for _, org := range organizations {
		// Get all users in the organization with visible birthdays
		users, err := repos.User.List(strconv.FormatUint(uint64(org.ID), 10), map[string]interface{}{})
		if err != nil {
			logrus.Errorf("Failed to get users for organization %d: %v", org.ID, err)
			continue
		}

		// Check organization settings → notifications.birthday.enabled
		orgIDStr := strconv.FormatUint(uint64(org.ID), 10)
		settings, err := repos.CompanySettings.GetByOrganizationID(orgIDStr)
		if err == nil && settings != nil && settings.Settings != "" {
			var m map[string]interface{}
			if err := json.Unmarshal([]byte(settings.Settings), &m); err == nil {
				if notifRaw, ok := m["notifications"].(map[string]interface{}); ok {
					if bdayRaw, ok := notifRaw["birthday"].(map[string]interface{}); ok {
						if en, ok := bdayRaw["enabled"].(bool); ok && !en {
							// Disabled at org level - skip this organization entirely
							continue
						}
					}
				}
			}
		}

		var birthdayUsers []models.User
		var adminRecipients []*models.User
		for idx := range users {
			u := &users[idx]
			if u.Role == "HR" || u.Role == "Admin" {
				adminRecipients = append(adminRecipients, u)
			}
		}

		for _, user := range users {
			if user.Birthday != nil && user.BirthdayVisible {
				// Calculate this year's birthday
				birthdayThisYear := time.Date(
					now.Year(),
					user.Birthday.Month(),
					user.Birthday.Day(),
					0, 0, 0, 0,
					user.Birthday.Location(),
				)

				// If birthday has passed this year, check next year's birthday
				if birthdayThisYear.Before(now) {
					birthdayThisYear = birthdayThisYear.AddDate(1, 0, 0)
				}

				daysUntilBirthday := int(birthdayThisYear.Sub(now).Hours() / 24)

				// Only send wishes exactly on the birthday (no advance/reminder)
				if daysUntilBirthday == 0 {
					birthdayUsers = append(birthdayUsers, user)
				}
			}
		}

		// 1) Send email to each birthday employee
		for _, birthdayUser := range birthdayUsers {
			if err := notificationService.SendBirthdayEmployee(&birthdayUser, org.Name); err != nil {
				logrus.WithError(err).WithFields(logrus.Fields{
					"user_id":  birthdayUser.ID,
					"org_id":   org.ID,
					"org_name": org.Name,
				}).Error("Failed to send employee birthday email")
			}
		}

		// 2) Send today's birthdays list to HR/Admin
		if len(birthdayUsers) > 0 && len(adminRecipients) > 0 {
			var items []services.BirthdayItem
			for _, u := range birthdayUsers {
				items = append(items, services.BirthdayItem{
					Name:     u.Name,
					Email:    u.Email,
					Birthday: *u.Birthday,
				})
			}
			if err := notificationService.SendBirthdayAdminToday(adminRecipients, org.Name, items); err != nil {
				logrus.WithError(err).WithFields(logrus.Fields{
					"org_id": org.ID,
				}).Error("Failed to send today's birthday admin email")
			}
		}

		// 3) On 1st of the month, send monthly birthday digest to HR/Admin
		if now.Day() == 1 && len(adminRecipients) > 0 {
			month := now.Month()
			year := now.Year()
			var monthItems []services.BirthdayItem
			for idx := range users {
				u := &users[idx]
				if u.Birthday == nil || !u.BirthdayVisible {
					continue
				}
				b := u.Birthday.In(now.Location())
				if b.Month() == month {
					monthItems = append(monthItems, services.BirthdayItem{
						Name:     u.Name,
						Email:    u.Email,
						Birthday: *u.Birthday,
					})
				}
			}
			if err := notificationService.SendBirthdayAdminMonthlyDigest(adminRecipients, org.Name, month, year, monthItems); err != nil {
				logrus.WithError(err).WithFields(logrus.Fields{
					"org_id": org.ID,
				}).Error("Failed to send monthly birthday digest to admin")
			}
		}
	}

	logrus.Info("Birthday notification check completed")
}

func startServer(router *gin.Engine, port int, repos *repositories.Repositories, notificationService services.NotificationService) {
	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", port),
		Handler: router,
	}

	// Start birthday notification service
	startBirthdayNotifications(repos, notificationService)
	// Start work anniversary notification service (daily + monthly digest on 1st)
	startWorkAnniversaryNotifications(repos, notificationService)

	// Start server in a goroutine
	go func() {
		logrus.Infof("Starting server on port %d", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logrus.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logrus.Info("Shutting down server...")

	// Give outstanding requests 30 seconds to complete
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logrus.Fatal("Server forced to shutdown:", err)
	}

	logrus.Info("Server exited")
}

// startWorkAnniversaryNotifications triggers at local midnight daily to:
// - Send congratulations emails to employees celebrating their work anniversary today
// - Notify HR/Admin with today's anniversary list
// - On the 1st of each month, send a monthly digest of all anniversaries for that month to HR/Admin
func startWorkAnniversaryNotifications(repos *repositories.Repositories, notificationService services.NotificationService) {
	go func() {
		for {
			now := time.Now()
			// Compute next local midnight
			nextMidnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
			delay := nextMidnight.Sub(now)
			time.Sleep(delay)
			sendWorkAnniversaryNotifications(repos, notificationService)
		}
	}()
}

func sendWorkAnniversaryNotifications(repos *repositories.Repositories, notificationService services.NotificationService) {
	logrus.Info("Checking for work anniversary notifications...")

	// Get all organizations
	organizations, err := repos.Organization.List()
	if err != nil {
		logrus.Errorf("Failed to get organizations for work anniversary notifications: %v", err)
		return
	}

	now := time.Now()
	todayMonth := now.Month()
	todayDay := now.Day()
	isFirstOfMonth := todayDay == 1

	for _, org := range organizations {
		users, err := repos.User.List(strconv.FormatUint(uint64(org.ID), 10), map[string]interface{}{})
		if err != nil {
			logrus.Errorf("Failed to get users for organization %d: %v", org.ID, err)
			continue
		}

		// Collect HR/Admin recipients
		var adminRecipients []*models.User
		for idx := range users {
			u := &users[idx]
			if u.Role == "HR" || u.Role == "Admin" {
				adminRecipients = append(adminRecipients, u)
			}
		}

		// Today's anniversaries
		var todayItems []services.WorkAnniversaryItem
		for idx := range users {
			u := &users[idx]
			if u.JoiningDate == nil {
				continue
			}
			j := u.JoiningDate.In(now.Location())
			if j.Month() == todayMonth && j.Day() == todayDay {
				years := now.Year() - j.Year()
				// Send to employee
				if err := notificationService.SendWorkAnniversaryEmployee(u, org.Name, years); err != nil {
					logrus.WithError(err).WithFields(logrus.Fields{
						"user_id":  u.ID,
						"org_id":   org.ID,
						"years":    years,
						"org_name": org.Name,
					}).Error("Failed to send employee work anniversary email")
				}
				todayItems = append(todayItems, services.WorkAnniversaryItem{
					Name:        u.Name,
					Email:       u.Email,
					Years:       years,
					JoiningDate: *u.JoiningDate,
				})
			}
		}
		// Notify HR/Admin for today's anniversaries
		if len(todayItems) > 0 && len(adminRecipients) > 0 {
			if err := notificationService.SendWorkAnniversaryAdminToday(adminRecipients, org.Name, todayItems); err != nil {
				logrus.WithError(err).WithFields(logrus.Fields{
					"org_id": org.ID,
				}).Error("Failed to send today's work anniversary admin email")
			}
		}

		// On 1st of month, send monthly digest for the month
		if isFirstOfMonth && len(adminRecipients) > 0 {
			var monthItems []services.WorkAnniversaryItem
			for idx := range users {
				u := &users[idx]
				if u.JoiningDate == nil {
					continue
				}
				j := u.JoiningDate.In(now.Location())
				if j.Month() == todayMonth {
					years := now.Year() - j.Year()
					monthItems = append(monthItems, services.WorkAnniversaryItem{
						Name:        u.Name,
						Email:       u.Email,
						Years:       years,
						JoiningDate: *u.JoiningDate,
					})
				}
			}
			if err := notificationService.SendWorkAnniversaryAdminMonthlyDigest(adminRecipients, org.Name, todayMonth, now.Year(), monthItems); err != nil {
				logrus.WithError(err).WithFields(logrus.Fields{
					"org_id": org.ID,
				}).Error("Failed to send monthly work anniversary digest to admin")
			}
		}
	}

	logrus.Info("Work anniversary notification check completed")
}
