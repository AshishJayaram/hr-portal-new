package main

import (
    "fmt"
    "os"

    "hr-portal-backend/internal/database"
    "hr-portal-backend/internal/config"
    "hr-portal-backend/internal/models"
    "hr-portal-backend/internal/utils"
)

func main() {
    if len(os.Args) < 3 {
        fmt.Println("usage: set_password <username> <new_password>")
        os.Exit(1)
    }
    username := os.Args[1]
    newPassword := os.Args[2]

    cfg, err := config.Load()
    if err != nil {
        fmt.Println("config load error:", err)
        os.Exit(1)
    }
    db, err := database.Initialize(cfg.Database)
    if err != nil {
        fmt.Println("db init error:", err)
        os.Exit(1)
    }

    var user models.User
    if err := db.Where("username = ?", username).First(&user).Error; err != nil {
        fmt.Println("user fetch error:", err)
        os.Exit(1)
    }

    hash, err := utils.HashPassword(newPassword)
    if err != nil {
        fmt.Println("hash error:", err)
        os.Exit(1)
    }
    user.PasswordHash = hash
    if err := db.Save(&user).Error; err != nil {
        fmt.Println("save error:", err)
        os.Exit(1)
    }
    fmt.Println("password updated for", username)
}


