package main

import (
	"fmt"
	"log"
	"strconv"
	"time"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func main() {
	// Initialize database
    db, err := gorm.Open(sqlite.Open("../hr_portal.db"), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Initialize repositories
	repos := repositories.New(db, nil)

	// Get all organizations
	orgs, err := repos.Organization.List()
	if err != nil {
		log.Fatalf("Failed to get organizations: %v", err)
	}

	fmt.Printf("Found %d organizations\n", len(orgs))

	// Check each organization
	for _, org := range orgs {
		fmt.Printf("\nProcessing organization: %s (ID: %d)\n", org.Name, org.ID)

		// Get all users in this organization
		users, err := repos.User.List(strconv.FormatUint(uint64(org.ID), 10), nil)
		if err != nil {
			fmt.Printf("Failed to get users for organization %s: %v\n", org.Name, err)
			continue
		}

		fmt.Printf("Found %d users in organization %s\n", len(users), org.Name)

		// Check each user for leave allocations
		for _, user := range users {
			// Get leave allocations for current year
			currentYear := time.Now().Year()
			allocations, err := repos.LeaveAllocation.List(strconv.FormatUint(uint64(org.ID), 10), map[string]interface{}{
				"user_id": strconv.FormatUint(uint64(user.ID), 10),
			})
			if err != nil {
				fmt.Printf("Error getting allocations for user %s: %v\n", user.Name, err)
				continue
			}

			// Check if user has allocations for current year
			hasCurrentYearAllocations := false
			for _, alloc := range allocations {
				if alloc.Year == currentYear {
					hasCurrentYearAllocations = true
					break
				}
			}

			if !hasCurrentYearAllocations {
				fmt.Printf("User %s (ID: %d) missing leave allocations for %d\n", user.Name, user.ID, currentYear)

				// Get leave categories for this organization
				categories, err := repos.LeaveCategory.List(strconv.FormatUint(uint64(org.ID), 10))
				if err != nil {
					fmt.Printf("Failed to get leave categories for organization %s: %v\n", org.Name, err)
					continue
				}

				// Create default leave allocations
				defaultAllocations := []struct {
					categoryName string
					totalDays    int
				}{
					{"Sick Leave", 12},
					{"Casual Leave", 12},
					{"Professional Leave", 5},
					{"Annual Leave", 21},
				}

				for _, alloc := range defaultAllocations {
					// Find matching category
					var categoryID uint = 0
					for _, cat := range categories {
						if cat.Name == alloc.categoryName {
							categoryID = cat.ID
							break
						}
					}

					allocation := &models.LeaveAllocation{
						UserID:         user.ID,
						OrganizationID: user.OrganizationID,
						CategoryID:     categoryID,
						CategoryName:   alloc.categoryName,
						TotalDays:      alloc.totalDays,
						UsedDays:       0,
						RemainingDays:  alloc.totalDays,
						Year:           currentYear,
					}

					if err := repos.LeaveAllocation.Create(allocation); err != nil {
						fmt.Printf("Failed to create leave allocation %s for user %s: %v\n", alloc.categoryName, user.Name, err)
					} else {
						fmt.Printf("Created %s allocation for user %s (Category ID: %d)\n", alloc.categoryName, user.Name, categoryID)
					}
				}
			} else {
				fmt.Printf("User %s already has leave allocations for %d\n", user.Name, currentYear)

				// Check if existing allocations have proper category IDs
				needsUpdate := false
				for _, alloc := range allocations {
					if alloc.Year == currentYear && alloc.CategoryID == 0 {
						needsUpdate = true
						break
					}
				}

				if needsUpdate {
					fmt.Printf("Updating leave allocations for user %s to fix category IDs\n", user.Name)

					// Get leave categories for this organization
					categories, err := repos.LeaveCategory.List(strconv.FormatUint(uint64(org.ID), 10))
					if err != nil {
						fmt.Printf("Failed to get leave categories for organization %s: %v\n", org.Name, err)
						continue
					}

					// Update existing allocations
					for _, alloc := range allocations {
						if alloc.Year == currentYear && alloc.CategoryID == 0 {
							// Find matching category
							for _, cat := range categories {
								if cat.Name == alloc.CategoryName {
									alloc.CategoryID = cat.ID
									if err := repos.LeaveAllocation.Update(&alloc); err != nil {
										fmt.Printf("Failed to update leave allocation %s for user %s: %v\n", alloc.CategoryName, user.Name, err)
									} else {
										fmt.Printf("Updated %s allocation for user %s (Category ID: %d)\n", alloc.CategoryName, user.Name, cat.ID)
									}
									break
								}
							}
						}
					}
				}
			}
		}
	}

	fmt.Println("Leave allocation fix completed!")
}
