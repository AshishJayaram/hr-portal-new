package database

import (
	"fmt"
	"time"

	"hr-portal-backend/internal/config"
	"hr-portal-backend/internal/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Initialize sets up the database connection and runs migrations
func Initialize(cfg config.DatabaseConfig) (*gorm.DB, error) {
	// Use SQLite database file
	dsn := "./hr_portal.db"

	// Configure GORM
	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	}

	// Connect to database
	db, err := gorm.Open(sqlite.Open(dsn), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Enable foreign keys for SQLite (required for CASCADE deletes)
	if err := db.Exec("PRAGMA foreign_keys = ON").Error; err != nil {
		return nil, fmt.Errorf("failed to enable foreign keys: %w", err)
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
	// SQLite doesn't need UUID extensions, skip PostgreSQL-specific commands

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
		&models.AuditLog{},
		&models.EmployeePrivateDocument{},
		&models.DocumentAcknowledgment{},
		&models.KRA{},
		&models.Feedback{},
		&models.PasswordResetToken{},
		&models.OTPToken{},
		&models.Designation{},
		&models.Department{},
		&models.Notification{},
	)

	if err != nil {
		return fmt.Errorf("failed to auto-migrate: %w", err)
	}

	// One-time backfill: assign dummy birthdays where missing (SQLite syntax)
	if err := db.Exec(`UPDATE users SET birthday = DATE('1970-01-01','+' || (abs(random()) % 18250) || ' days') WHERE birthday IS NULL`).Error; err != nil {
		// Non-fatal; log and continue
		// Birthday backfill failed
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
		"CREATE INDEX IF NOT EXISTS idx_users_organization_role ON users(organization_id, role)",
		"CREATE INDEX IF NOT EXISTS idx_users_manager ON users(manager_id)",
		"CREATE INDEX IF NOT EXISTS idx_users_department ON users(organization_id, department)",
		// Unique constraint for employee_id per organization
		"CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_id_org ON users(organization_id, employee_id)",

		// Leave indexes
		"CREATE INDEX IF NOT EXISTS idx_leaves_user_status ON leaves(user_id, status)",
		"CREATE INDEX IF NOT EXISTS idx_leaves_organization ON leaves(organization_id)",
		"CREATE INDEX IF NOT EXISTS idx_leaves_date_range ON leaves(from_date, to_date)",
		"CREATE INDEX IF NOT EXISTS idx_leaves_approver ON leaves(approved_by)",

		// Leave allocation indexes
		"CREATE INDEX IF NOT EXISTS idx_leave_allocations_user_year ON leave_allocations(user_id, year)",
		"CREATE INDEX IF NOT EXISTS idx_leave_allocations_category ON leave_allocations(category_id)",

		// Document indexes
		"CREATE INDEX IF NOT EXISTS idx_documents_user_category ON documents(user_id, category)",
		"CREATE INDEX IF NOT EXISTS idx_documents_organization ON documents(organization_id)",
		"CREATE INDEX IF NOT EXISTS idx_documents_public ON documents(is_public)",

		// Salary slip indexes
		"CREATE INDEX IF NOT EXISTS idx_salary_slips_user_month_year ON salary_slips(user_id, month, year)",
		"CREATE INDEX IF NOT EXISTS idx_salary_slips_organization ON salary_slips(organization_id)",

		// Holiday indexes
		"CREATE INDEX IF NOT EXISTS idx_holidays_organization_date ON holidays(organization_id, date)",
		"CREATE INDEX IF NOT EXISTS idx_holidays_type ON holidays(type)",
		"CREATE INDEX IF NOT EXISTS idx_holidays_calendar_event ON holidays(is_calendar_event)",

		// Leave category indexes
		"CREATE INDEX IF NOT EXISTS idx_leave_categories_organization ON leave_categories(organization_id)",
		"CREATE INDEX IF NOT EXISTS idx_leave_categories_active ON leave_categories(is_active)",

		// Audit log indexes
		"CREATE INDEX IF NOT EXISTS idx_audit_logs_organization ON audit_logs(organization_id)",
		"CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)",
		"CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON audit_logs(changed_by)",
		"CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)",
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
