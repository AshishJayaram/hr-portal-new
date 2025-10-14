package main

import (
	"fmt"
	"log"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Reset passwords for Shvani and Pooja users
	users := []struct {
		id       int
		username string
		name     string
	}{
		{22, "Pooja", "Pooja Sharma"},
		{26, "pooja", "Pooja Gowda"},
		{28, "pooja.g", "Pooja Gowda"},
		{33, "Pooja", "Pooja"},
		{36, "Shivani", "Shivani"},
	}

	password := "password"
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("Failed to hash password:", err)
	}

	fmt.Printf("Password hash for 'password': %s\n", string(hashedPassword))
	fmt.Println("Use this hash to update the users in the database:")

	for _, user := range users {
		fmt.Printf("UPDATE users SET password_hash = '%s' WHERE id = %d; -- %s (%s)\n",
			string(hashedPassword), user.id, user.name, user.username)
	}
}
