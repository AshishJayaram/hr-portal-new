//go:build dev
// +build dev

package main

import (
	"fmt"
	"log"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	password := "password"
	storedHash := "$2a$10$ajwfOYUJSa1eh3fDWe0IduXkAHHtR7WsI7IaMfMgkrBI87YBy9bSS"

	// Test if the stored hash matches the password
	err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(password))
	if err != nil {
		fmt.Printf("Password verification failed: %v\n", err)
	} else {
		fmt.Println("Password verification successful!")
	}

	// Generate a new hash to compare
	newHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("Failed to generate hash:", err)
	}

	fmt.Printf("New hash: %s\n", string(newHash))
	fmt.Printf("Stored hash: %s\n", storedHash)
}
