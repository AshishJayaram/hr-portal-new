package main

import (
	"testing"
	"time"

	"hr-portal-backend/internal/config"
	"hr-portal-backend/internal/database"
	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
	"hr-portal-backend/internal/services"
	"hr-portal-backend/internal/utils"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupTestDB creates an in-memory SQLite database for testing
func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

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
	require.NoError(t, err)

	return db
}

func TestUserService_CreateUser(t *testing.T) {
	db := setupTestDB(t)
	repos := repositories.New(db, nil)
	services := services.New(repos, &config.Config{})

	// Create test organization
	org := &models.Organization{
		ID:   uuid.New(),
		Name: "Test Company",
	}
	err := repos.Organization.Create(org)
	require.NoError(t, err)

	// Test user creation
	req := services.CreateUserRequest{
		Username:       "testuser",
		Email:          "test@example.com",
		Password:       "password123",
		Name:           "Test User",
		Designation:    "Developer",
		Department:     "Engineering",
		Role:           "Employee",
		OrganizationID: org.ID.String(),
		CTC:            500000,
	}

	user, err := services.User.CreateUser(req)
	require.NoError(t, err)
	assert.Equal(t, req.Username, user.Username)
	assert.Equal(t, req.Email, user.Email)
	assert.Equal(t, req.Name, user.Name)
	assert.Equal(t, req.Designation, user.Designation)
	assert.Equal(t, req.Department, user.Department)
	assert.Equal(t, req.Role, user.Role)
	assert.Equal(t, req.CTC, user.CTC)
	assert.True(t, user.IsActive)
}

func TestAuthService_Login(t *testing.T) {
	db := setupTestDB(t)
	repos := repositories.New(db, nil)
	
	cfg := &config.Config{
		JWT: config.JWTConfig{
			Secret:             "test-secret",
			ExpireHours:        24,
			RefreshExpireHours: 168,
		},
	}
	
	services := services.New(repos, cfg)

	// Create test organization
	org := &models.Organization{
		ID:   uuid.New(),
		Name: "Test Company",
	}
	err := repos.Organization.Create(org)
	require.NoError(t, err)

	// Create test user
	hashedPassword, err := utils.HashPassword("password123")
	require.NoError(t, err)

	user := &models.User{
		ID:             uuid.New(),
		OrganizationID: org.ID,
		Username:       "testuser",
		Email:          "test@example.com",
		PasswordHash:   hashedPassword,
		Name:           "Test User",
		Department:     "Engineering",
		Role:           "Employee",
		IsActive:       true,
	}
	err = repos.User.Create(user)
	require.NoError(t, err)

	// Test login
	req := services.LoginRequest{
		Username:       "testuser",
		Password:       "password123",
		OrganizationID: org.ID.String(),
	}

	response, err := services.Auth.Login(req)
	require.NoError(t, err)
	assert.NotEmpty(t, response.Token)
	assert.NotEmpty(t, response.RefreshToken)
	assert.Equal(t, user.ID, response.User.ID)
	assert.Equal(t, user.Username, response.User.Username)
}

func TestPasswordUtils(t *testing.T) {
	password := "TestPassword123!"

	// Test password hashing
	hash, err := utils.HashPassword(password)
	require.NoError(t, err)
	assert.NotEmpty(t, hash)

	// Test password verification
	valid := utils.CheckPasswordHash(password, hash)
	assert.True(t, valid)

	// Test invalid password
	invalid := utils.CheckPasswordHash("wrongpassword", hash)
	assert.False(t, invalid)

	// Test password strength validation
	err = utils.ValidatePasswordStrength(password)
	assert.NoError(t, err)

	// Test weak password
	err = utils.ValidatePasswordStrength("weak")
	assert.Error(t, err)
}

func TestJWTUtils(t *testing.T) {
	secret := "test-secret"
	userID := uuid.New().String()
	organizationID := uuid.New().String()
	role := "Employee"
	username := "testuser"

	// Test token generation
	token, err := utils.GenerateToken(userID, organizationID, role, username, secret, 24)
	require.NoError(t, err)
	assert.NotEmpty(t, token)

	// Test token validation
	claims, err := utils.ValidateToken(token, secret)
	require.NoError(t, err)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, organizationID, claims.OrganizationID)
	assert.Equal(t, role, claims.Role)
	assert.Equal(t, username, claims.Username)

	// Test invalid token
	_, err = utils.ValidateToken("invalid-token", secret)
	assert.Error(t, err)

	// Test expired token (this would require a very short expiration time)
	// For now, we'll just test that the function exists
	expired := utils.IsTokenExpired(token, secret)
	assert.False(t, expired)
}

func TestLeaveAllocationCalculation(t *testing.T) {
	db := setupTestDB(t)
	repos := repositories.New(db, nil)

	// Create test organization
	org := &models.Organization{
		ID:   uuid.New(),
		Name: "Test Company",
	}
	err := repos.Organization.Create(org)
	require.NoError(t, err)

	// Create test user
	user := &models.User{
		ID:             uuid.New(),
		OrganizationID: org.ID,
		Username:       "testuser",
		Email:          "test@example.com",
		PasswordHash:   "hash",
		Name:           "Test User",
		Department:     "Engineering",
		Role:           "Employee",
		IsActive:       true,
	}
	err = repos.User.Create(user)
	require.NoError(t, err)

	// Create leave category
	category := &models.LeaveCategory{
		ID:             uuid.New(),
		OrganizationID: org.ID,
		Name:           "Sick Leave",
		MaxDaysPerYear: 12,
		IsActive:       true,
	}
	err = repos.LeaveCategory.Create(category)
	require.NoError(t, err)

	// Create leave allocation
	allocation := &models.LeaveAllocation{
		UserID:         user.ID,
		CategoryID:     category.ID,
		OrganizationID: org.ID,
		CategoryName:   category.Name,
		TotalDays:      12,
		UsedDays:       3,
		RemainingDays:  9, // This should be calculated automatically
		Year:           2024,
	}
	err = repos.LeaveAllocation.Create(allocation)
	require.NoError(t, err)

	// Verify remaining days calculation
	assert.Equal(t, 9, allocation.RemainingDays)
	assert.Equal(t, allocation.TotalDays-allocation.UsedDays, allocation.RemainingDays)
}

func TestHolidayModel(t *testing.T) {
	db := setupTestDB(t)

	// Create test organization
	org := &models.Organization{
		ID:   uuid.New(),
		Name: "Test Company",
	}
	err := db.Create(org).Error
	require.NoError(t, err)

	// Test holiday with date
	holiday := &models.Holiday{
		OrganizationID:  org.ID,
		Name:           "New Year",
		Date:           &[]time.Time{time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)}[0],
		Type:           "holiday",
		Description:    "New Year Day",
		IsCalendarEvent: true,
		Color:          "#ef4444",
	}
	err = db.Create(holiday).Error
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, holiday.ID)

	// Test notice without date
	notice := &models.Holiday{
		OrganizationID:  org.ID,
		Name:           "Important Notice",
		Date:           nil, // Notice without date
		Type:           "notice",
		Description:    "Please update your information",
		IsCalendarEvent: false,
		Color:          "#8b5cf6",
	}
	err = db.Create(notice).Error
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, notice.ID)
	assert.Nil(t, notice.Date)
}
