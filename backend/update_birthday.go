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

	novemberBirthday, _ := time.Parse("2006-01-02", "2025-11-10")
	result := db.Model(&models.User{}).Where("id = ? AND organization_id = ?", 33, 4).Update("birthday", novemberBirthday)
	if result.Error != nil {
		fmt.Printf("Error: %v\n", result.Error)
	} else {
		fmt.Printf("Updated Pooja birthday to: %v\n", novemberBirthday)
	}
}
