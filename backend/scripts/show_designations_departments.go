//go:build show_designations_departments
// +build show_designations_departments

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

	fmt.Println("=" + string(make([]byte, 80)) + "=")
	fmt.Println("DESIGNATIONS TABLE")
	fmt.Println("=" + string(make([]byte, 80)) + "=")

	var designations []models.Designation
	if err := db.Preload("Organization").Find(&designations).Error; err != nil {
		log.Fatalf("Failed to fetch designations: %v", err)
	}

	if len(designations) == 0 {
		fmt.Println("No designations found.")
	} else {
		fmt.Printf("\nTotal Designations: %d\n\n", len(designations))
		for i, desig := range designations {
			fmt.Printf("%d. ID: %d\n", i+1, desig.ID)
			fmt.Printf("   Organization: %s (ID: %d)\n", desig.Organization.Name, desig.OrganizationID)
			fmt.Printf("   Name: %s\n", desig.Name)
			if desig.Description != "" {
				fmt.Printf("   Description: %s\n", desig.Description)
			}
			fmt.Printf("   Is Active: %v\n", desig.IsActive)
			fmt.Printf("   Created: %s\n", desig.CreatedAt.Format("2006-01-02 15:04:05"))
			fmt.Println()
		}
	}

	fmt.Println("\n" + "=" + string(make([]byte, 80)) + "=")
	fmt.Println("DEPARTMENTS TABLE")
	fmt.Println("=" + string(make([]byte, 80)) + "=")

	var departments []models.Department
	if err := db.Preload("Organization").Find(&departments).Error; err != nil {
		log.Fatalf("Failed to fetch departments: %v", err)
	}

	if len(departments) == 0 {
		fmt.Println("No departments found.")
	} else {
		fmt.Printf("\nTotal Departments: %d\n\n", len(departments))
		for i, dept := range departments {
			fmt.Printf("%d. ID: %d\n", i+1, dept.ID)
			fmt.Printf("   Organization: %s (ID: %d)\n", dept.Organization.Name, dept.OrganizationID)
			fmt.Printf("   Name: %s\n", dept.Name)
			if dept.Description != "" {
				fmt.Printf("   Description: %s\n", dept.Description)
			}
			fmt.Printf("   Is Active: %v\n", dept.IsActive)
			fmt.Printf("   Created: %s\n", dept.CreatedAt.Format("2006-01-02 15:04:05"))
			fmt.Println()
		}
	}

	fmt.Println("=" + string(make([]byte, 80)) + "=")
	fmt.Println("SUMMARY BY ORGANIZATION")
	fmt.Println("=" + string(make([]byte, 80)) + "=")

	// Group by organization
	orgDesignations := make(map[uint][]models.Designation)
	orgDepartments := make(map[uint][]models.Department)

	for _, desig := range designations {
		orgDesignations[desig.OrganizationID] = append(orgDesignations[desig.OrganizationID], desig)
	}

	for _, dept := range departments {
		orgDepartments[dept.OrganizationID] = append(orgDepartments[dept.OrganizationID], dept)
	}

	var organizations []models.Organization
	db.Find(&organizations)

	for _, org := range organizations {
		desigs := orgDesignations[org.ID]
		depts := orgDepartments[org.ID]

		fmt.Printf("\n%s (ID: %d)\n", org.Name, org.ID)
		fmt.Printf("  Designations: %d\n", len(desigs))
		if len(desigs) > 0 {
			for _, d := range desigs {
				fmt.Printf("    - %s%s\n", d.Name, func() string {
					if !d.IsActive {
						return " (INACTIVE)"
					}
					return ""
				}())
			}
		}
		fmt.Printf("  Departments: %d\n", len(depts))
		if len(depts) > 0 {
			for _, d := range depts {
				fmt.Printf("    - %s%s\n", d.Name, func() string {
					if !d.IsActive {
						return " (INACTIVE)"
					}
					return ""
				}())
			}
		}
	}
}
