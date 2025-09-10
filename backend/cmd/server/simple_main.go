package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"hr-portal-backend/internal/config"
	"hr-portal-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// Simple version for quick testing without PostgreSQL/Redis
func main() {
	fmt.Println("🚀 Starting HR Portal Backend (Simple Version)")
	
	// Initialize SQLite database for testing
	db, err := gorm.Open(sqlite.Open("test.db"), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto-migrate all models
	err = db.AutoMigrate(
		&models.Organization{},
		&models.User{},
		&models.LeaveCategory{},
		&models.LeaveAllocation{},
		&models.Leave{},
		&models.Document{},
		&models.SalarySlip{},
		&models.Holiday{},
		&models.CompanySettings{},
	)
	if err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// Setup Gin router
	router := gin.Default()

	// Add CORS middleware
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Organization-ID")
		
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		
		c.Next()
	})

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"timestamp": time.Now().UTC(),
			"version":   "1.0.0",
			"database":  "sqlite",
		})
	})

	// Basic API routes
	api := router.Group("/api")
	{
		// Test endpoint
		api.GET("/test", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"message": "HR Portal Backend is running!",
				"features": []string{
					"User Management",
					"Leave Management", 
					"Document Management",
					"Payroll Management",
					"Company Settings",
					"Events & Notices",
				},
			})
		})

		// Basic auth endpoint (for testing)
		api.POST("/auth/test-login", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"message": "Test login successful",
				"token":   "test-jwt-token",
				"user": gin.H{
					"id":       "test-user-id",
					"username": "testuser",
					"email":    "test@example.com",
					"role":     "Admin",
				},
			})
		})

		// Database stats
		api.GET("/stats", func(c *gin.Context) {
			var orgCount, userCount, leaveCount int64
			db.Model(&models.Organization{}).Count(&orgCount)
			db.Model(&models.User{}).Count(&userCount)
			db.Model(&models.Leave{}).Count(&leaveCount)

			c.JSON(http.StatusOK, gin.H{
				"database_stats": gin.H{
					"organizations": orgCount,
					"users":         userCount,
					"leaves":        leaveCount,
				},
				"message": "Backend is ready for full implementation!",
			})
		})
	}

	// Start server
	port := 8080
	fmt.Printf("🌟 Server starting on port %d\n", port)
	fmt.Printf("📋 API endpoints:\n")
	fmt.Printf("   Health:     http://localhost:%d/health\n", port)
	fmt.Printf("   Test API:   http://localhost:%d/api/test\n", port)
	fmt.Printf("   Test Login: http://localhost:%d/api/auth/test-login\n", port)
	fmt.Printf("   Stats:      http://localhost:%d/api/stats\n", port)
	fmt.Printf("\n🚀 Ready to integrate with your frontend!\n")

	if err := router.Run(fmt.Sprintf(":%d", port)); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
