package main

import (
	"fmt"
	"log"

	"hr-portal-backend/internal/config"
	"hr-portal-backend/internal/database"
	"hr-portal-backend/internal/models"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize database
	db, err := database.Initialize(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Enable foreign keys
	if err := db.Exec("PRAGMA foreign_keys = ON").Error; err != nil {
		log.Fatalf("Failed to enable foreign keys: %v", err)
	}

	fmt.Println("Starting to populate designations and departments tables...")

	// Get all organizations
	var organizations []models.Organization
	if err := db.Find(&organizations).Error; err != nil {
		log.Fatalf("Failed to fetch organizations: %v", err)
	}

	totalDesignations := 0
	totalDepartments := 0

	// Process each organization
	for _, org := range organizations {
		fmt.Printf("\nProcessing Organization: %s (ID: %d)\n", org.Name, org.ID)

		// Get all users in this organization
		var users []models.User
		if err := db.Where("organization_id = ?", org.ID).Find(&users).Error; err != nil {
			log.Printf("Failed to fetch users for organization %d: %v", org.ID, err)
			continue
		}

		// Collect unique designations and departments
		designationSet := make(map[string]bool)
		departmentSet := make(map[string]bool)

		for _, user := range users {
			if user.Designation != "" {
				designationSet[user.Designation] = true
			}
			if user.Department != "" {
				departmentSet[user.Department] = true
			}
		}

		// Create designations
		designationCount := 0
		for designationName := range designationSet {
			// Check if designation already exists
			var existingDesignation models.Designation
			err := db.Where("organization_id = ? AND name = ?", org.ID, designationName).First(&existingDesignation).Error
			if err == nil {
				fmt.Printf("  Designation '%s' already exists, skipping...\n", designationName)
				continue
			}

			// Create new designation
			designation := models.Designation{
				OrganizationID: org.ID,
				Name:           designationName,
				Description:    fmt.Sprintf("Designation: %s", designationName),
				IsActive:       true,
			}

			if err := db.Create(&designation).Error; err != nil {
				log.Printf("  Failed to create designation '%s': %v", designationName, err)
				continue
			}

			fmt.Printf("  ✓ Created designation: %s\n", designationName)
			designationCount++
		}
		totalDesignations += designationCount

		// Create departments
		departmentCount := 0
		for departmentName := range departmentSet {
			// Check if department already exists
			var existingDepartment models.Department
			err := db.Where("organization_id = ? AND name = ?", org.ID, departmentName).First(&existingDepartment).Error
			if err == nil {
				fmt.Printf("  Department '%s' already exists, skipping...\n", departmentName)
				continue
			}

			// Create new department
			department := models.Department{
				OrganizationID: org.ID,
				Name:           departmentName,
				Description:    fmt.Sprintf("Department: %s", departmentName),
				IsActive:       true,
			}

			if err := db.Create(&department).Error; err != nil {
				log.Printf("  Failed to create department '%s': %v", departmentName, err)
				continue
			}

			fmt.Printf("  ✓ Created department: %s\n", departmentName)
			departmentCount++
		}
		totalDepartments += departmentCount

		fmt.Printf("  Summary: Created %d designations, %d departments\n", designationCount, departmentCount)
	}

	fmt.Printf("\n=== Migration Complete ===\n")
	fmt.Printf("Total designations created: %d\n", totalDesignations)
	fmt.Printf("Total departments created: %d\n", totalDepartments)
	fmt.Println("Done!")
}

