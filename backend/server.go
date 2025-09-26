package main

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// Organization model
type Organization struct {
	ID          uint      `json:"id" gorm:"primarykey"`
	Name        string    `json:"name" gorm:"unique"`
	Domain      string    `json:"domain"`
	Description string    `json:"description"`
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	UserCount   int       `json:"user_count" gorm:"-"` // Virtual field for API response
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Leave model
type Leave struct {
	ID             uint      `json:"id" gorm:"primarykey"`
	UserID         uint      `json:"user_id"`
	OrganizationID uint      `json:"organization_id"`
	Type           string    `json:"type"`
	From           string    `json:"from"`
	To             string    `json:"to"`
	Reason         string    `json:"reason"`
	Status         string    `json:"status" gorm:"default:'pending'"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// User model
type User struct {
	ID             uint         `json:"id" gorm:"primarykey"`
	OrganizationID uint         `json:"organization_id"`
	Organization   Organization `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
	ManagerID      *uint        `json:"manager_id"`
	Manager        *User        `json:"manager,omitempty" gorm:"foreignKey:ManagerID"`
	Username       string       `json:"username" gorm:"unique"`
	Email          string       `json:"email" gorm:"unique"`
	PasswordHash   string       `json:"-"` // Never return password in JSON
	Name           string       `json:"name"`
	Role           string       `json:"role"`
	Department     string       `json:"department"`
	Designation    string       `json:"designation"`
	CTC            float64      `json:"ctc"`
	IsActive       bool         `json:"is_active" gorm:"default:true"`
	CreatedAt      time.Time    `json:"created_at"`
	UpdatedAt      time.Time    `json:"updated_at"`
}

// Holiday model
type Holiday struct {
	ID              uint      `json:"id" gorm:"primarykey"`
	OrganizationID  uint      `json:"organization_id"`
	Name            string    `json:"name"`
	Date            *string   `json:"date"` // Optional for notices
	Type            string    `json:"type"` // holiday, event, notice
	Description     string    `json:"description"`
	IsCalendarEvent bool      `json:"is_calendar_event" gorm:"default:true"`
	Color           string    `json:"color" gorm:"default:'#ef4444'"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// Password utilities
func hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	return string(bytes), err
}

func checkPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

func main() {
	fmt.Println("🚀 HR Portal Backend")
	fmt.Println("====================")

	// Initialize database
	db, err := gorm.Open(sqlite.Open("hr_portal.db"), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto-migrate
	db.AutoMigrate(&Organization{}, &User{}, &Leave{}, &Holiday{})

	// Create God accounts (hardcoded, no API creation allowed)
	var godCount int64
	db.Model(&User{}).Where("role = ?", "God").Count(&godCount)
	if godCount == 0 {
		fmt.Println("👑 Creating God accounts...")

		god1Hash, _ := hashPassword("god123")
		god2Hash, _ := hashPassword("supreme123")

		godUsers := []User{
			{
				OrganizationID: 0, // God has no organization
				Username:       "god",
				Email:          "god@system.com",
				PasswordHash:   god1Hash,
				Name:           "System God",
				Role:           "God",
				Department:     "System",
				Designation:    "Supreme Administrator",
				CTC:            0,
			},
			{
				OrganizationID: 0, // God has no organization
				Username:       "supreme",
				Email:          "supreme@system.com",
				PasswordHash:   god2Hash,
				Name:           "Supreme Administrator",
				Role:           "God",
				Department:     "System",
				Designation:    "System God",
				CTC:            0,
			},
		}

		for _, user := range godUsers {
			db.Create(&user)
		}

		fmt.Println("✅ God accounts created")
		fmt.Println("🔑 God Login Credentials:")
		fmt.Println("   👑 God:      username: god,      password: god123")
		fmt.Println("   👑 Supreme:  username: supreme, password: supreme123")
	}

	// Create sample organization and users if none exist
	var orgCount int64
	db.Model(&Organization{}).Count(&orgCount)
	if orgCount == 0 {
		fmt.Println("🏢 Creating comprehensive demo organization...")

		// Create demo organization
		org := Organization{
			Name:        "InnovateTech Solutions",
			Domain:      "innovatetech.com",
			Description: "A comprehensive technology company with multiple departments including Engineering, Sales, Marketing, and Operations.",
		}
		db.Create(&org)

		fmt.Println("📝 Creating hierarchical user structure...")

		// Hash passwords
		adminHash, _ := hashPassword("admin123")
		hrHash, _ := hashPassword("hr123")
		ceoHash, _ := hashPassword("ceo123")
		ctoHash, _ := hashPassword("cto123")
		engMgrHash, _ := hashPassword("engmgr123")
		salesMgrHash, _ := hashPassword("salesmgr123")
		marketingMgrHash, _ := hashPassword("marketingmgr123")
		dev1Hash, _ := hashPassword("dev123")
		dev2Hash, _ := hashPassword("dev2123")
		dev3Hash, _ := hashPassword("dev3123")
		sales1Hash, _ := hashPassword("sales123")
		sales2Hash, _ := hashPassword("sales2123")
		marketing1Hash, _ := hashPassword("marketing123")
		qaHash, _ := hashPassword("qa123")

		// Create users with hierarchical structure
		users := []User{
			// Admin
			{
				OrganizationID: org.ID,
				Username:       "admin",
				Email:          "admin@innovatetech.com",
				PasswordHash:   adminHash,
				Name:           "Sarah Johnson",
				Role:           "Admin",
				Department:     "IT",
				Designation:    "System Administrator",
				CTC:            1200000,
			},
			// HR
			{
				OrganizationID: org.ID,
				Username:       "hr",
				Email:          "hr@innovatetech.com",
				PasswordHash:   hrHash,
				Name:           "Michael Chen",
				Role:           "HR",
				Department:     "Human Resources",
				Designation:    "HR Manager",
				CTC:            900000,
			},
			// CEO (Top level)
			{
				OrganizationID: org.ID,
				Username:       "ceo",
				Email:          "ceo@innovatetech.com",
				PasswordHash:   ceoHash,
				Name:           "David Wilson",
				Role:           "Admin",
				Department:     "Executive",
				Designation:    "Chief Executive Officer",
				CTC:            2500000,
			},
			// CTO (Reports to CEO)
			{
				OrganizationID: org.ID,
				ManagerID:      nil, // Will be set after CEO is created
				Username:       "cto",
				Email:          "cto@innovatetech.com",
				PasswordHash:   ctoHash,
				Name:           "Lisa Anderson",
				Role:           "Manager",
				Department:     "Engineering",
				Designation:    "Chief Technology Officer",
				CTC:            1800000,
			},
			// Engineering Manager (Reports to CTO)
			{
				OrganizationID: org.ID,
				ManagerID:      nil, // Will be set after CTO is created
				Username:       "engmgr",
				Email:          "engmgr@innovatetech.com",
				PasswordHash:   engMgrHash,
				Name:           "Emily Rodriguez",
				Role:           "Manager",
				Department:     "Engineering",
				Designation:    "Engineering Manager",
				CTC:            1100000,
			},
			// Sales Manager (Reports to CEO)
			{
				OrganizationID: org.ID,
				ManagerID:      nil, // Will be set after CEO is created
				Username:       "salesmgr",
				Email:          "salesmgr@innovatetech.com",
				PasswordHash:   salesMgrHash,
				Name:           "Robert Kim",
				Role:           "Manager",
				Department:     "Sales",
				Designation:    "Sales Manager",
				CTC:            1000000,
			},
			// Marketing Manager (Reports to CEO)
			{
				OrganizationID: org.ID,
				ManagerID:      nil, // Will be set after CEO is created
				Username:       "marketingmgr",
				Email:          "marketingmgr@innovatetech.com",
				PasswordHash:   marketingMgrHash,
				Name:           "Jennifer Lee",
				Role:           "Manager",
				Department:     "Marketing",
				Designation:    "Marketing Manager",
				CTC:            950000,
			},
			// Developers (Report to Engineering Manager)
			{
				OrganizationID: org.ID,
				ManagerID:      nil, // Will be set after Engineering Manager is created
				Username:       "dev1",
				Email:          "dev1@innovatetech.com",
				PasswordHash:   dev1Hash,
				Name:           "Alex Thompson",
				Role:           "Employee",
				Department:     "Engineering",
				Designation:    "Senior Software Developer",
				CTC:            800000,
			},
			{
				OrganizationID: org.ID,
				ManagerID:      nil, // Will be set after Engineering Manager is created
				Username:       "dev2",
				Email:          "dev2@innovatetech.com",
				PasswordHash:   dev2Hash,
				Name:           "Maria Garcia",
				Role:           "Employee",
				Department:     "Engineering",
				Designation:    "Software Developer",
				CTC:            650000,
			},
			{
				OrganizationID: org.ID,
				ManagerID:      nil, // Will be set after Engineering Manager is created
				Username:       "dev3",
				Email:          "dev3@innovatetech.com",
				PasswordHash:   dev3Hash,
				Name:           "James Wilson",
				Role:           "Employee",
				Department:     "Engineering",
				Designation:    "Junior Software Developer",
				CTC:            500000,
			},
			// QA Engineer (Reports to Engineering Manager)
			{
				OrganizationID: org.ID,
				ManagerID:      nil, // Will be set after Engineering Manager is created
				Username:       "qa",
				Email:          "qa@innovatetech.com",
				PasswordHash:   qaHash,
				Name:           "Sophie Brown",
				Role:           "Employee",
				Department:     "Engineering",
				Designation:    "QA Engineer",
				CTC:            550000,
			},
			// Sales Representatives (Report to Sales Manager)
			{
				OrganizationID: org.ID,
				ManagerID:      nil, // Will be set after Sales Manager is created
				Username:       "sales1",
				Email:          "sales1@innovatetech.com",
				PasswordHash:   sales1Hash,
				Name:           "Tom Davis",
				Role:           "Employee",
				Department:     "Sales",
				Designation:    "Senior Sales Representative",
				CTC:            700000,
			},
			{
				OrganizationID: org.ID,
				ManagerID:      nil, // Will be set after Sales Manager is created
				Username:       "sales2",
				Email:          "sales2@innovatetech.com",
				PasswordHash:   sales2Hash,
				Name:           "Rachel Green",
				Role:           "Employee",
				Department:     "Sales",
				Designation:    "Sales Representative",
				CTC:            600000,
			},
			// Marketing Specialist (Reports to Marketing Manager)
			{
				OrganizationID: org.ID,
				ManagerID:      nil, // Will be set after Marketing Manager is created
				Username:       "marketing1",
				Email:          "marketing1@innovatetech.com",
				PasswordHash:   marketing1Hash,
				Name:           "Kevin Park",
				Role:           "Employee",
				Department:     "Marketing",
				Designation:    "Digital Marketing Specialist",
				CTC:            580000,
			},
		}

		// Create users and set up manager relationships
		for i, user := range users {
			db.Create(&user)
			users[i] = user // Update with the created user's ID
		}

		// Set up manager relationships
		ceo := users[2]          // CEO
		cto := users[3]          // CTO
		engMgr := users[4]       // Engineering Manager
		salesMgr := users[5]     // Sales Manager
		marketingMgr := users[6] // Marketing Manager

		// CTO reports to CEO
		db.Model(&cto).Update("manager_id", ceo.ID)

		// Engineering Manager reports to CTO
		db.Model(&engMgr).Update("manager_id", cto.ID)

		// Sales Manager reports to CEO
		db.Model(&salesMgr).Update("manager_id", ceo.ID)

		// Marketing Manager reports to CEO
		db.Model(&marketingMgr).Update("manager_id", ceo.ID)

		// Developers report to Engineering Manager
		for i := 7; i <= 10; i++ { // dev1, dev2, dev3, qa
			db.Model(&users[i]).Update("manager_id", engMgr.ID)
		}

		// Sales reps report to Sales Manager
		for i := 11; i <= 12; i++ { // sales1, sales2
			db.Model(&users[i]).Update("manager_id", salesMgr.ID)
		}

		// Marketing specialist reports to Marketing Manager
		db.Model(&users[13]).Update("manager_id", marketingMgr.ID)

		fmt.Println("✅ Comprehensive organization structure created")
		fmt.Println("🔑 InnovateTech Login Credentials:")
		fmt.Println("   👑 Admin:      username: admin,      password: admin123")
		fmt.Println("   👥 HR:         username: hr,         password: hr123")
		fmt.Println("   👑 CEO:        username: ceo,        password: ceo123")
		fmt.Println("   👔 CTO:        username: cto,        password: cto123")
		fmt.Println("   👔 Eng Mgr:    username: engmgr,     password: engmgr123")
		fmt.Println("   👔 Sales Mgr:  username: salesmgr,   password: salesmgr123")
		fmt.Println("   👔 Marketing:  username: marketingmgr, password: marketingmgr123")
		fmt.Println("   👤 Dev1:       username: dev1,       password: dev123")
		fmt.Println("   👤 Dev2:       username: dev2,       password: dev2123")
		fmt.Println("   👤 Dev3:       username: dev3,       password: dev3123")
		fmt.Println("   👤 QA:         username: qa,         password: qa123")
		fmt.Println("   👤 Sales1:     username: sales1,     password: sales123")
		fmt.Println("   👤 Sales2:     username: sales2,     password: sales2123")
		fmt.Println("   👤 Marketing1: username: marketing1, password: marketing123")
	}

	// Setup Gin
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(gin.Recovery())

	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "http://localhost:3000")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Organization-ID")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Simple auth middleware to extract user info from token
	authMiddleware := func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>"
		token := strings.TrimPrefix(authHeader, "Bearer ")
		if token == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
			c.Abort()
			return
		}

		// For now, we'll use a simple approach - extract username from token
		// In production, you'd want proper JWT parsing
		var username string
		if strings.HasPrefix(token, "auth-token-") {
			parts := strings.Split(token, "-")
			if len(parts) >= 3 {
				username = parts[2]
			}
		}

		if username == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Find user by username to get organization
		var user User
		if err := db.Where("username = ?", username).First(&user).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			c.Abort()
			return
		}

		// Store user info in context
		c.Set("user", user)
		c.Set("organization_id", user.OrganizationID)
		c.Set("is_god", user.OrganizationID == 0) // God users have OrganizationID 0
		c.Next()
	}

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"timestamp": time.Now().UTC(),
			"version":   "1.0.0",
		})
	})

	// API routes
	api := router.Group("/api")
	{
		// Welcome
		api.GET("/", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"message": "🎉 HR Portal Backend API",
				"version": "1.0.0",
				"credentials": gin.H{
					"admin":    "username: admin, password: admin123",
					"hr":       "username: hr, password: hr123",
					"employee": "username: employee, password: employee123",
				},
			})
		})

		// Login
		api.POST("/auth/login", func(c *gin.Context) {
			var req struct {
				Username string `json:"username" binding:"required"`
				Password string `json:"password" binding:"required"`
			}

			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Username and password required"})
				return
			}

			var user User
			result := db.Where("username = ? AND is_active = ?", req.Username, true).First(&user)
			if result.Error != nil {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
				return
			}

			if !checkPasswordHash(req.Password, user.PasswordHash) {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
				return
			}

			token := fmt.Sprintf("auth-token-%s-%d", user.Username, time.Now().Unix())

			c.JSON(http.StatusOK, gin.H{
				"message": "Login successful",
				"token":   token,
				"user":    user,
			})
		})

		// Get users (filtered by organization, except for God users)
		api.GET("/users", authMiddleware, func(c *gin.Context) {
			organizationID := c.GetUint("organization_id")
			user := c.MustGet("user").(User)
			isGod := user.OrganizationID == 0 // God users have OrganizationID 0

			var users []User
			if isGod {
				// God users can see all users
				db.Find(&users)
			} else {
				// Regular users only see users from their organization
				db.Where("organization_id = ?", organizationID).Find(&users)
			}
			c.JSON(http.StatusOK, gin.H{"data": users})
		})

		// Get team hierarchy (filtered by organization, except for God users)
		api.GET("/team", authMiddleware, func(c *gin.Context) {
			organizationID := c.GetUint("organization_id")
			user := c.MustGet("user").(User)
			isGod := user.OrganizationID == 0 // God users have OrganizationID 0

			var users []User
			if isGod {
				// God users can see all users
				db.Preload("Manager").Find(&users)
			} else {
				// Regular users only see users from their organization
				db.Where("organization_id = ?", organizationID).Preload("Manager").Find(&users)
			}
			c.JSON(http.StatusOK, gin.H{"data": users})
		})

		// Leave management endpoints
		api.GET("/leaves", authMiddleware, func(c *gin.Context) {
			organizationID := c.GetUint("organization_id")
			user := c.MustGet("user").(User)
			isGod := user.OrganizationID == 0

			var leaves []Leave
			if isGod {
				// God users can see all leaves
				db.Find(&leaves)
			} else {
				// Regular users only see leaves from their organization
				db.Where("organization_id = ?", organizationID).Find(&leaves)
			}
			c.JSON(http.StatusOK, gin.H{"data": leaves})
		})

		api.POST("/leaves", authMiddleware, func(c *gin.Context) {
			var req struct {
				Type   string `json:"type" binding:"required"`
				From   string `json:"from" binding:"required"`
				To     string `json:"to" binding:"required"`
				Reason string `json:"reason"`
			}

			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			user := c.MustGet("user").(User)
			leave := Leave{
				UserID:         user.ID,
				OrganizationID: user.OrganizationID,
				Type:           req.Type,
				From:           req.From,
				To:             req.To,
				Reason:         req.Reason,
				Status:         "pending",
			}

			if err := db.Create(&leave).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create leave request"})
				return
			}

			c.JSON(http.StatusCreated, gin.H{"data": leave})
		})

		api.PUT("/leaves/:id/approve", authMiddleware, func(c *gin.Context) {
			leaveID := c.Param("id")
			user := c.MustGet("user").(User)

			// Check if user can approve leaves (Manager, HR, Admin, God)
			if !(user.Role == "Manager" || user.Role == "HR" || user.Role == "Admin" || user.Role == "God") {
				c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
				return
			}

			var leave Leave
			if err := db.First(&leave, leaveID).Error; err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "Leave request not found"})
				return
			}

			// Check organization access
			if user.OrganizationID != 0 && leave.OrganizationID != user.OrganizationID {
				c.JSON(http.StatusForbidden, gin.H{"error": "Cannot approve leave from different organization"})
				return
			}

			leave.Status = "approved"
			if err := db.Save(&leave).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to approve leave"})
				return
			}

			c.JSON(http.StatusOK, gin.H{"data": leave})
		})

		api.PUT("/leaves/:id/reject", authMiddleware, func(c *gin.Context) {
			leaveID := c.Param("id")
			user := c.MustGet("user").(User)

			// Check if user can approve leaves (Manager, HR, Admin, God)
			if !(user.Role == "Manager" || user.Role == "HR" || user.Role == "Admin" || user.Role == "God") {
				c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
				return
			}

			var req struct {
				Reason string `json:"reason"`
			}
			c.ShouldBindJSON(&req)

			var leave Leave
			if err := db.First(&leave, leaveID).Error; err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "Leave request not found"})
				return
			}

			// Check organization access
			if user.OrganizationID != 0 && leave.OrganizationID != user.OrganizationID {
				c.JSON(http.StatusForbidden, gin.H{"error": "Cannot reject leave from different organization"})
				return
			}

			leave.Status = "rejected"
			leave.Reason = req.Reason
			if err := db.Save(&leave).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject leave"})
				return
			}

			c.JSON(http.StatusOK, gin.H{"data": leave})
		})

		// Create user
		api.POST("/users", func(c *gin.Context) {
			var req struct {
				Username    string  `json:"username" binding:"required"`
				Email       string  `json:"email" binding:"required"`
				Password    string  `json:"password" binding:"required"`
				Name        string  `json:"name" binding:"required"`
				Role        string  `json:"role" binding:"required"`
				Department  string  `json:"department" binding:"required"`
				Designation string  `json:"designation"`
				CTC         float64 `json:"ctc"`
			}

			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
				return
			}

			if len(req.Password) < 6 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be at least 6 characters"})
				return
			}

			hashedPassword, err := hashPassword(req.Password)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process password"})
				return
			}

			user := User{
				OrganizationID: 1,
				Username:       req.Username,
				Email:          req.Email,
				PasswordHash:   hashedPassword,
				Name:           req.Name,
				Role:           req.Role,
				Department:     req.Department,
				Designation:    req.Designation,
				CTC:            req.CTC,
			}

			result := db.Create(&user)
			if result.Error != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to create user"})
				return
			}

			c.JSON(http.StatusCreated, gin.H{
				"data":    user,
				"message": "User created successfully",
			})
		})

		// Dashboard stats endpoint
		api.GET("/dashboard/stats", authMiddleware, func(c *gin.Context) {
			organizationID := c.GetUint("organization_id")
			user := c.MustGet("user").(User)
			isGod := user.OrganizationID == 0

			var totalEmployees int64
			var pendingLeaves int64
			var approvedLeaves int64
			var totalDocuments int64

			if isGod {
				// God users see platform-wide stats
				db.Model(&User{}).Count(&totalEmployees)
				db.Model(&Leave{}).Where("status = ?", "pending").Count(&pendingLeaves)
				db.Model(&Leave{}).Where("status = ?", "approved").Count(&approvedLeaves)
				// Documents not implemented yet, so return 0
				totalDocuments = 0
			} else {
				// Regular users see organization-specific stats
				db.Model(&User{}).Where("organization_id = ?", organizationID).Count(&totalEmployees)
				db.Model(&Leave{}).Where("organization_id = ? AND status = ?", organizationID, "pending").Count(&pendingLeaves)
				db.Model(&Leave{}).Where("organization_id = ? AND status = ?", organizationID, "approved").Count(&approvedLeaves)
				// Documents not implemented yet, so return 0
				totalDocuments = 0
			}

			c.JSON(http.StatusOK, gin.H{
				"data": gin.H{
					"total_employees": totalEmployees,
					"pending_leaves":  pendingLeaves,
					"approved_leaves": approvedLeaves,
					"total_documents": totalDocuments,
					"team_members":    totalEmployees, // Same as total employees for now
				},
			})
		})

		// Documents endpoints (placeholder)
		documents := api.Group("/documents")
		documents.Use(authMiddleware)
		{
			documents.GET("", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"data": []gin.H{}})
			})
			documents.POST("", func(c *gin.Context) {
				c.JSON(http.StatusCreated, gin.H{"message": "Document upload not implemented yet"})
			})
		}

		// Salary slips endpoints (placeholder)
		salarySlips := api.Group("/salary-slips")
		salarySlips.Use(authMiddleware)
		{
			salarySlips.GET("", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"data": []gin.H{}})
			})
			salarySlips.POST("", func(c *gin.Context) {
				c.JSON(http.StatusCreated, gin.H{"message": "Salary slip upload not implemented yet"})
			})
		}

		// God-only endpoints
		god := api.Group("/god")
		{
			// Get platform statistics
			god.GET("/stats", func(c *gin.Context) {
				var totalOrgs int64
				var totalUsers int64
				var activeOrgs int64

				db.Model(&Organization{}).Count(&totalOrgs)
				db.Model(&User{}).Count(&totalUsers)
				db.Model(&Organization{}).Where("is_active = ?", true).Count(&activeOrgs)

				c.JSON(http.StatusOK, gin.H{
					"data": gin.H{
						"total_organizations":  totalOrgs,
						"active_organizations": activeOrgs,
						"total_users":          totalUsers,
					},
				})
			})

			// Get all organizations with user counts
			god.GET("/organizations", func(c *gin.Context) {
				var orgs []Organization
				db.Find(&orgs)

				// Add user count for each organization
				for i := range orgs {
					var userCount int64
					db.Model(&User{}).Where("organization_id = ?", orgs[i].ID).Count(&userCount)
					orgs[i].UserCount = int(userCount)
				}

				c.JSON(http.StatusOK, gin.H{"data": orgs})
			})

			// Create organization with admin
			god.POST("/organizations", func(c *gin.Context) {
				var req struct {
					Name        string `json:"name" binding:"required"`
					Domain      string `json:"domain" binding:"required"`
					Description string `json:"description"`
					AdminUser   struct {
						Username string `json:"username" binding:"required"`
						Email    string `json:"email" binding:"required"`
						Password string `json:"password" binding:"required"`
						Name     string `json:"name" binding:"required"`
					} `json:"admin_user" binding:"required"`
				}

				if err := c.ShouldBindJSON(&req); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
					return
				}

				// Create organization
				org := Organization{
					Name:        req.Name,
					Domain:      req.Domain,
					Description: req.Description,
				}

				result := db.Create(&org)
				if result.Error != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to create organization"})
					return
				}

				// Create admin user for the organization
				hashedPassword, err := hashPassword(req.AdminUser.Password)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process password"})
					return
				}

				adminUser := User{
					OrganizationID: org.ID,
					Username:       req.AdminUser.Username,
					Email:          req.AdminUser.Email,
					PasswordHash:   hashedPassword,
					Name:           req.AdminUser.Name,
					Role:           "Admin",
					Department:     "Administration",
					Designation:    "Organization Administrator",
					CTC:            0,
				}

				result = db.Create(&adminUser)
				if result.Error != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to create admin user"})
					return
				}

				c.JSON(http.StatusCreated, gin.H{
					"organization": org,
					"admin_user":   adminUser,
					"message":      "Organization and admin created successfully",
				})
			})

			// Get organization details with users
			god.GET("/organizations/:id", func(c *gin.Context) {
				var org Organization
				result := db.Preload("Users").First(&org, c.Param("id"))
				if result.Error != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": "Organization not found"})
					return
				}
				c.JSON(http.StatusOK, gin.H{"data": org})
			})

			// Update organization
			god.PUT("/organizations/:id", func(c *gin.Context) {
				var org Organization
				result := db.First(&org, c.Param("id"))
				if result.Error != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": "Organization not found"})
					return
				}

				var req struct {
					Name        string `json:"name"`
					Domain      string `json:"domain"`
					Description string `json:"description"`
					IsActive    *bool  `json:"is_active"`
				}

				if err := c.ShouldBindJSON(&req); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
					return
				}

				if req.Name != "" {
					org.Name = req.Name
				}
				if req.Domain != "" {
					org.Domain = req.Domain
				}
				if req.Description != "" {
					org.Description = req.Description
				}
				if req.IsActive != nil {
					org.IsActive = *req.IsActive
				}

				db.Save(&org)
				c.JSON(http.StatusOK, gin.H{
					"data":    org,
					"message": "Organization updated successfully",
				})
			})

			// Delete organization (soft delete)
			god.DELETE("/organizations/:id", func(c *gin.Context) {
				var org Organization
				result := db.First(&org, c.Param("id"))
				if result.Error != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": "Organization not found"})
					return
				}

				org.IsActive = false
				db.Save(&org)

				c.JSON(http.StatusOK, gin.H{"message": "Organization deactivated successfully"})
			})
		}

		// Holidays endpoints
		holidays := api.Group("/holidays")
		holidays.Use(authMiddleware)
		{
			// Get all holidays for organization
			holidays.GET("", func(c *gin.Context) {
				organizationID := c.GetUint("organization_id")
				user := c.MustGet("user").(User)
				isGod := user.OrganizationID == 0

				var holidays []Holiday
				if isGod {
					// God users can see all holidays
					db.Find(&holidays)
				} else {
					// Regular users only see holidays from their organization
					db.Where("organization_id = ?", organizationID).Find(&holidays)
				}

				c.JSON(http.StatusOK, gin.H{"data": holidays})
			})

			// Create holiday (HR and Admin only)
			holidays.POST("", func(c *gin.Context) {
				user := c.MustGet("user").(User)
				if user.Role != "HR" && user.Role != "Admin" && user.Role != "God" {
					c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
					return
				}

				var req struct {
					Name            string  `json:"name" binding:"required"`
					Date            *string `json:"date"`
					Type            string  `json:"type" binding:"required"`
					Description     string  `json:"description"`
					IsCalendarEvent bool    `json:"is_calendar_event"`
					Color           string  `json:"color"`
				}

				if err := c.ShouldBindJSON(&req); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}

				organizationID := c.GetUint("organization_id")

				// Parse date if provided (handle YYYY-MM-DD format)
				var datePtr *string
				if req.Date != nil && *req.Date != "" {
					// Validate date format
					if _, err := time.Parse("2006-01-02", *req.Date); err != nil {
						c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format, expected YYYY-MM-DD"})
						return
					}
					datePtr = req.Date
				}

				holiday := Holiday{
					OrganizationID:  organizationID,
					Name:            req.Name,
					Date:            datePtr,
					Type:            req.Type,
					Description:     req.Description,
					IsCalendarEvent: req.IsCalendarEvent,
					Color:           req.Color,
				}

				if err := db.Create(&holiday).Error; err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create holiday"})
					return
				}

				c.JSON(http.StatusCreated, gin.H{"data": holiday})
			})

			// Get specific holiday
			holidays.GET("/:id", func(c *gin.Context) {
				var holiday Holiday
				result := db.First(&holiday, c.Param("id"))
				if result.Error != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": "Holiday not found"})
					return
				}

				c.JSON(http.StatusOK, gin.H{"data": holiday})
			})

			// Update holiday (HR and Admin only)
			holidays.PATCH("/:id", func(c *gin.Context) {
				user := c.MustGet("user").(User)
				if user.Role != "HR" && user.Role != "Admin" && user.Role != "God" {
					c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
					return
				}

				var holiday Holiday
				result := db.First(&holiday, c.Param("id"))
				if result.Error != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": "Holiday not found"})
					return
				}

				var req struct {
					Name            *string `json:"name"`
					Date            *string `json:"date"`
					Type            *string `json:"type"`
					Description     *string `json:"description"`
					IsCalendarEvent *bool   `json:"is_calendar_event"`
					Color           *string `json:"color"`
				}

				if err := c.ShouldBindJSON(&req); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}

				// Update fields if provided
				if req.Name != nil {
					holiday.Name = *req.Name
				}
				if req.Date != nil {
					if *req.Date != "" {
						// Validate date format
						if _, err := time.Parse("2006-01-02", *req.Date); err != nil {
							c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format, expected YYYY-MM-DD"})
							return
						}
					}
					holiday.Date = req.Date
				}
				if req.Type != nil {
					holiday.Type = *req.Type
				}
				if req.Description != nil {
					holiday.Description = *req.Description
				}
				if req.IsCalendarEvent != nil {
					holiday.IsCalendarEvent = *req.IsCalendarEvent
				}
				if req.Color != nil {
					holiday.Color = *req.Color
				}

				if err := db.Save(&holiday).Error; err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update holiday"})
					return
				}

				c.JSON(http.StatusOK, gin.H{"data": holiday})
			})

			// Delete holiday (HR and Admin only)
			holidays.DELETE("/:id", func(c *gin.Context) {
				user := c.MustGet("user").(User)
				if user.Role != "HR" && user.Role != "Admin" && user.Role != "God" {
					c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
					return
				}

				var holiday Holiday
				result := db.First(&holiday, c.Param("id"))
				if result.Error != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": "Holiday not found"})
					return
				}

				if err := db.Delete(&holiday).Error; err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete holiday"})
					return
				}

				c.JSON(http.StatusOK, gin.H{"message": "Holiday deleted successfully"})
			})
		}
	}

	// Start server
	fmt.Printf("\n🌟 Server starting on port 8080\n")
	fmt.Printf("🔗 API: http://localhost:8080/api/\n")
	fmt.Printf("🔑 Login: POST http://localhost:8080/api/auth/login\n")
	fmt.Printf("\nPress Ctrl+C to stop\n")

	if err := router.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
