//go:build dev
// +build dev

package main

import (
	"fmt"
	"log"
	"time"

	"hr-portal-backend/internal/config"
	"hr-portal-backend/internal/database"
	"hr-portal-backend/internal/models"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	db, err := database.Initialize(cfg.Database)
	if err != nil {
		log.Fatal(err)
	}

	var users []models.User
	db.Where("birthday IS NOT NULL").Find(&users)

	fmt.Printf("Found %d users with birthdays:\n", len(users))
	for _, u := range users {
		fmt.Printf("- %s (ID: %d): Birthday: %v, Visible: %v, Organization: %d\n", u.Name, u.ID, u.Birthday, u.BirthdayVisible, u.OrganizationID)
	}

	// Also check total users
	var totalUsers int64
	db.Model(&models.User{}).Count(&totalUsers)
	fmt.Printf("\nTotal users in database: %d\n", totalUsers)

	// Check users in organization 1 specifically
	var org1Users []models.User
	db.Where("organization_id = ? AND birthday IS NOT NULL", 1).Find(&org1Users)
	fmt.Printf("\nUsers in organization 1 with birthdays: %d\n", len(org1Users))
	for _, u := range org1Users {
		fmt.Printf("- %s (ID: %d): Birthday: %v, Visible: %v\n", u.Name, u.ID, u.Birthday, u.BirthdayVisible)
	}

	// Update Test User's birthday to November 5, 2025 (within 30 days of Oct 29, 2025)
	novemberBirthday, _ := time.Parse("2006-01-02", "2025-11-05")
	result := db.Model(&models.User{}).Where("id = ? AND organization_id = ?", 34, 1).Update("birthday", novemberBirthday)
	if result.Error != nil {
		fmt.Printf("Error updating birthday: %v\n", result.Error)
	} else {
		fmt.Printf("Updated Test User (ID: 34) birthday to: %v\n", novemberBirthday)
	}
}
