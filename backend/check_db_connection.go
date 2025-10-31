//go:build dev
// +build dev

package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"hr-portal-backend/internal/config"
	"hr-portal-backend/internal/database"
	"hr-portal-backend/internal/models"

	"gorm.io/gorm"
)

func main() {
	fmt.Println("=== Database Connection Diagnostic ===\n")

	// 1. Check what DB path the API would use
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	dbPath := cfg.Database.SQLitePath
	if dbPath == "" {
		dbPath = "./hr_portal.db"
	}
	fmt.Printf("1. Configured DB path: %s\n", dbPath)

	// 2. Check if that file exists
	if _, err := os.Stat(dbPath); err == nil {
		fmt.Printf("   ✓ File exists\n")
		info, _ := os.Stat(dbPath)
		fmt.Printf("   File size: %d bytes\n", info.Size())
	} else {
		fmt.Printf("   ✗ File does NOT exist\n")
		
		// Check fallback path
		fallback := filepath.Join(".", "cmd", "server", "hr_portal.db")
		if _, err2 := os.Stat(fallback); err2 == nil {
			fmt.Printf("   But fallback exists: %s\n", fallback)
		}
	}

	// 3. Try to connect using the same logic as the API
	fmt.Printf("\n2. Testing API connection logic:\n")
	db, err := database.Initialize(cfg.Database)
	if err != nil {
		log.Fatalf("   ✗ Failed to connect: %v\n", err)
	}
	fmt.Printf("   ✓ Connected successfully\n")

	// 4. Test the connection
	if _, err := db.DB(); err != nil {
		fmt.Printf("   ✗ Failed to get underlying DB: %v\n", err)
	} else {
		fmt.Printf("   Using DB file: %s\n", dbPath)
	}

	// 5. Check if Zeus user exists
	fmt.Printf("\n3. Checking for Zeus user:\n")
	var zeus models.User
	err = db.Where("username = ?", "Zeus").First(&zeus).Error
	if err == gorm.ErrRecordNotFound {
		fmt.Printf("   ✗ Zeus user NOT found\n")
	} else if err != nil {
		fmt.Printf("   ✗ Error querying: %v\n", err)
	} else {
		fmt.Printf("   ✓ Zeus found!\n")
		fmt.Printf("      ID: %d\n", zeus.ID)
		fmt.Printf("      Username: %s\n", zeus.Username)
		fmt.Printf("      Email: %s\n", zeus.Email)
		fmt.Printf("      Role: %s\n", zeus.Role)
		fmt.Printf("      IsActive: %t\n", zeus.IsActive)
		fmt.Printf("      OrganizationID: %d\n", zeus.OrganizationID)
		if len(zeus.PasswordHash) > 0 {
			fmt.Printf("      PasswordHash: [%d chars] ...%s\n", len(zeus.PasswordHash), zeus.PasswordHash[len(zeus.PasswordHash)-10:])
		}
	}

	// 6. List all users with God role
	fmt.Printf("\n4. All God users in database:\n")
	var godUsers []models.User
	if err := db.Where("role = ?", "God").Find(&godUsers).Error; err != nil {
		fmt.Printf("   Error: %v\n", err)
	} else {
		fmt.Printf("   Found %d God user(s):\n", len(godUsers))
		for _, u := range godUsers {
			fmt.Printf("      - %s (ID: %d, Org: %d, Active: %t)\n", u.Username, u.ID, u.OrganizationID, u.IsActive)
		}
	}

	// 7. Check which DB files exist in common locations
	fmt.Printf("\n5. Scanning for hr_portal.db files:\n")
	searchPaths := []string{
		"./hr_portal.db",
		"./backend/hr_portal.db",
		"./cmd/server/hr_portal.db",
		"../hr_portal.db",
		"../backend/hr_portal.db",
	}
	for _, p := range searchPaths {
		if abs, err := filepath.Abs(p); err == nil {
			if _, err := os.Stat(p); err == nil {
				info, _ := os.Stat(p)
				fmt.Printf("   ✓ %s (%d bytes)\n", abs, info.Size())
			}
		}
	}

	fmt.Println("\n=== Diagnostic Complete ===")
}

