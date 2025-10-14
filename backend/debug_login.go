package main

import (
	"fmt"
	"log"

	"hr-portal-backend/internal/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func main() {
	// Connect to database
	db, err := gorm.Open(sqlite.Open("hr_portal.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Test GetByUsernameAcrossOrgs
	var user models.User
	err = db.Where("username = ?", "pooja").
		Preload("Organization").
		First(&user).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			fmt.Println("User 'pooja' not found")
		} else {
			fmt.Printf("Error: %v\n", err)
		}
	} else {
		fmt.Printf("Found user: ID=%d, Username=%s, Name=%s, OrganizationID=%d, IsActive=%t\n",
			user.ID, user.Username, user.Name, user.OrganizationID, user.IsActive)
	}

	// Test with capital P
	err = db.Where("username = ?", "Pooja").
		Preload("Organization").
		First(&user).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			fmt.Println("User 'Pooja' not found")
		} else {
			fmt.Printf("Error: %v\n", err)
		}
	} else {
		fmt.Printf("Found user: ID=%d, Username=%s, Name=%s, OrganizationID=%d, IsActive=%t\n",
			user.ID, user.Username, user.Name, user.OrganizationID, user.IsActive)
	}

	// List all users with pooja in username
	var users []models.User
	err = db.Where("username LIKE ?", "%pooja%").Find(&users).Error
	if err != nil {
		fmt.Printf("Error listing users: %v\n", err)
	} else {
		fmt.Printf("Found %d users with 'pooja' in username:\n", len(users))
		for _, u := range users {
			fmt.Printf("  ID=%d, Username=%s, Name=%s, OrganizationID=%d, IsActive=%t\n",
				u.ID, u.Username, u.Name, u.OrganizationID, u.IsActive)
		}
	}
}
