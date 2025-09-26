package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"hr-portal-backend/internal/config"
	"hr-portal-backend/internal/database"
	"hr-portal-backend/internal/handlers"
	"hr-portal-backend/internal/middleware"
	"hr-portal-backend/internal/repositories"
	"hr-portal-backend/internal/services"

	_ "hr-portal-backend/cmd/server/docs"

	"github.com/gin-contrib/cors"
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
	services := services.New(repos, cfg)

	// Initialize handlers
	handlers := handlers.New(services, cfg)

	// Setup Gin router
	router := setupRouter(cfg, handlers)

	// Start server
	startServer(router, cfg.Server.Port)
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

	// CORS configuration
	corsConfig := cors.Config{
		AllowOrigins:     cfg.CORS.AllowedOrigins,
		AllowMethods:     cfg.CORS.AllowedMethods,
		AllowHeaders:     cfg.CORS.AllowedHeaders,
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	router.Use(cors.New(corsConfig))

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

		// Leave routes
		leaves := api.Group("/leaves")
		leaves.Use(middleware.AuthRequired(cfg.JWT.Secret))
		leaves.Use(middleware.OrganizationRequired())
		{
			leaves.GET("", handlers.Leave.ListLeaves)
			leaves.POST("", handlers.Leave.ApplyLeave)
			leaves.GET("/:id", handlers.Leave.GetLeave)
			leaves.PATCH("/:id", handlers.Leave.UpdateLeave)
			leaves.POST("/:id/approve", middleware.RoleRequired("Manager", "HR", "Admin"), handlers.Leave.ApproveLeave)
			leaves.POST("/:id/reject", middleware.RoleRequired("Manager", "HR", "Admin"), handlers.Leave.RejectLeave)
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

		// Salary slip routes
		salarySlips := api.Group("/salary-slips")
		salarySlips.Use(middleware.AuthRequired(cfg.JWT.Secret))
		salarySlips.Use(middleware.OrganizationRequired())
		{
			salarySlips.GET("", handlers.SalarySlip.ListSalarySlips)
			salarySlips.POST("", handlers.SalarySlip.UploadSalarySlip)
			salarySlips.GET("/:id", handlers.SalarySlip.GetSalarySlip)
			salarySlips.DELETE("/:id", handlers.SalarySlip.DeleteSalarySlip)
			salarySlips.GET("/:id/download", handlers.SalarySlip.DownloadSalarySlip)
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
			}
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
			god.DELETE("/organizations/:id", handlers.God.DeleteOrganization)

			// User management for God users (platform-wide)
			god.GET("/users", handlers.God.ListUsers)
			god.POST("/users", handlers.God.CreateUser)
			god.PATCH("/users/:id", handlers.God.UpdateUser)
			god.DELETE("/users/:id", handlers.God.DeleteUser)
		}
	}

	// Swagger documentation
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	return router
}

func startServer(router *gin.Engine, port int) {
	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", port),
		Handler: router,
	}

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
