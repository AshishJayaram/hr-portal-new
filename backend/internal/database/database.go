package database

import (
	"fmt"
	"time"

	"hr-portal-backend/internal/config"
	"hr-portal-backend/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Initialize sets up the database connection and runs migrations
func Initialize(cfg config.DatabaseConfig) (*gorm.DB, error) {
	// Build DSN
	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.Name, cfg.SSLMode)

	// Configure GORM
	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	}

	// Connect to database
	db, err := gorm.Open(postgres.Open(dsn), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Configure connection pool
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(cfg.ConnMaxLifetime)

	// Test connection
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Run migrations
	if err := migrate(db); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	return db, nil
}

// migrate runs database migrations
func migrate(db *gorm.DB) error {
	// Enable UUID extension
	if err := db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"").Error; err != nil {
		return fmt.Errorf("failed to create uuid extension: %w", err)
	}

	// Enable gen_random_uuid function
	if err := db.Exec("CREATE EXTENSION IF NOT EXISTS \"pgcrypto\"").Error; err != nil {
		return fmt.Errorf("failed to create pgcrypto extension: %w", err)
	}

	// Auto-migrate all models
	err := db.AutoMigrate(
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
		return fmt.Errorf("failed to auto-migrate: %w", err)
	}

	// Create indexes for better performance
	if err := createIndexes(db); err != nil {
		return fmt.Errorf("failed to create indexes: %w", err)
	}

	return nil
}

// createIndexes creates additional indexes for better performance
func createIndexes(db *gorm.DB) error {
	indexes := []string{
		// User indexes
		"CREATE INDEX IF NOT EXISTS idx_users_organization_role ON users(organization_id, role) WHERE deleted_at IS NULL",
		"CREATE INDEX IF NOT EXISTS idx_users_manager ON users(manager_id) WHERE deleted_at IS NULL",
		"CREATE INDEX IF NOT EXISTS idx_users_department ON users(organization_id, department) WHERE deleted_at IS NULL",
		
		// Leave indexes
		"CREATE INDEX IF NOT EXISTS idx_leaves_user_status ON leaves(user_id, status) WHERE deleted_at IS NULL",
		"CREATE INDEX IF NOT EXISTS idx_leaves_organization ON leaves(organization_id) WHERE deleted_at IS NULL",
		"CREATE INDEX IF NOT EXISTS idx_leaves_date_range ON leaves(from_date, to_date) WHERE deleted_at IS NULL",
		"CREATE INDEX IF NOT EXISTS idx_leaves_approver ON leaves(approved_by) WHERE deleted_at IS NULL",
		
		// Leave allocation indexes
		"CREATE INDEX IF NOT EXISTS idx_leave_allocations_user_year ON leave_allocations(user_id, year) WHERE deleted_at IS NULL",
		"CREATE INDEX IF NOT EXISTS idx_leave_allocations_category ON leave_allocations(category_id) WHERE deleted_at IS NULL",
		
		// Document indexes
		"CREATE INDEX IF NOT EXISTS idx_documents_user_category ON documents(user_id, category) WHERE deleted_at IS NULL",
		"CREATE INDEX IF NOT EXISTS idx_documents_organization ON documents(organization_id) WHERE deleted_at IS NULL",
		"CREATE INDEX IF NOT EXISTS idx_documents_public ON documents(is_public) WHERE deleted_at IS NULL",
		
		// Salary slip indexes
		"CREATE INDEX IF NOT EXISTS idx_salary_slips_user_month_year ON salary_slips(user_id, month, year) WHERE deleted_at IS NULL",
		"CREATE INDEX IF NOT EXISTS idx_salary_slips_organization ON salary_slips(organization_id) WHERE deleted_at IS NULL",
		
		// Holiday indexes
		"CREATE INDEX IF NOT EXISTS idx_holidays_organization_date ON holidays(organization_id, date) WHERE deleted_at IS NULL",
		"CREATE INDEX IF NOT EXISTS idx_holidays_type ON holidays(type) WHERE deleted_at IS NULL",
		"CREATE INDEX IF NOT EXISTS idx_holidays_calendar_event ON holidays(is_calendar_event) WHERE deleted_at IS NULL",
		
		// Leave category indexes
		"CREATE INDEX IF NOT EXISTS idx_leave_categories_organization ON leave_categories(organization_id) WHERE deleted_at IS NULL",
		"CREATE INDEX IF NOT EXISTS idx_leave_categories_active ON leave_categories(is_active) WHERE deleted_at IS NULL",
	}

	for _, indexSQL := range indexes {
		if err := db.Exec(indexSQL).Error; err != nil {
			return fmt.Errorf("failed to create index: %w", err)
		}
	}

	return nil
}

// Close closes the database connection
func Close(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
