//go:build dev
// +build dev

package main

import (
	"fmt"
	"log"
	"path/filepath"
	"time"

	"hr-portal-backend/internal/config"
	"hr-portal-backend/internal/database"
	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/utils"

	"gorm.io/gorm"
)

func main() {
	// Use the exact same config and connection logic as the API server
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect using the exact same method as the API
	db, err := database.Initialize(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	dbPath := cfg.Database.SQLitePath
	if dbPath == "" {
		dbPath = "./hr_portal.db"
	}
	absPath, _ := filepath.Abs(dbPath)
	fmt.Printf("Using DB (via API config): %s (abs: %s)\n", dbPath, absPath)

	// Ensure a default organization exists
	var org models.Organization
	err = db.Where("name = ?", "Default Org").First(&org).Error
	if err == gorm.ErrRecordNotFound {
		org = models.Organization{
			Name:     "Default Org",
			Domain:   "default.local",
			IsActive: true,
		}
		if err := db.Create(&org).Error; err != nil {
			log.Fatal("Failed to create default organization:", err)
		}
		fmt.Printf("Created organization: ID=%d, Name=%s\n", org.ID, org.Name)
	} else if err != nil {
		log.Fatal("Failed to query organization:", err)
	}

	// Desired God user credentials
	username := "Zeus"
	email := "zeus@default.local"
	name := "Zeus - Platform God"
	password := "God@1234!" // change after first login

	// Hash password
	hash, err := utils.HashPassword(password)
	if err != nil {
		log.Fatal("Failed to hash password:", err)
	}

	// Upsert God user in default org
	var user models.User
	err = db.Where("username = ? AND organization_id = ?", username, org.ID).First(&user).Error
	if err == gorm.ErrRecordNotFound {
		user = models.User{
			OrganizationID:  org.ID,
			Username:        username,
			Email:           email,
			PasswordHash:    hash,
			Name:            name,
			Designation:     "Super Admin",
			Department:      "Platform",
			Role:            "God",
			IsActive:        true,
			BirthdayVisible: false,
			JoiningDate:     ptrTime(time.Now()),
		}
		if err := db.Create(&user).Error; err != nil {
			log.Fatal("Failed to create God user:", err)
		}
		fmt.Printf("Created God user: ID=%d, Username=%s, Email=%s\n", user.ID, user.Username, user.Email)
	} else if err != nil {
		log.Fatal("Failed to lookup God user:", err)
	} else {
		// Ensure role and active status
		updates := map[string]interface{}{
			"role":          "God",
			"is_active":     true,
			"password_hash": hash, // force-reset password to known dev value
		}
		if err := db.Model(&user).Updates(updates).Error; err != nil {
			log.Fatal("Failed to update God user:", err)
		}
		fmt.Printf("God user already exists: ID=%d, Username=%s (password reset, ensured active & role)\n", user.ID, user.Username)
	}

	fmt.Println("Zeus God user ready. Use these dev creds:")
	fmt.Printf("  Org ID: %d\n", org.ID)
	fmt.Printf("  Username: %s\n", username)
	fmt.Printf("  Email: %s\n", email)
	fmt.Printf("  Password: %s\n", password)
}

func ptrTime(t time.Time) *time.Time { return &t }
