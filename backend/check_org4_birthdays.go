//go:build dev
// +build dev

package main

import (
	"fmt"
	"log"

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
	db.Where("organization_id = ? AND birthday IS NOT NULL", 4).Find(&users)
	fmt.Printf("Users in organization 4 with birthdays: %d\n", len(users))
	for _, u := range users {
		fmt.Printf("- %s (ID: %d): Birthday: %v, Visible: %v\n", u.Name, u.ID, u.Birthday, u.BirthdayVisible)
	}
}
