package main

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	passwords := []string{"smr123", "password123", "admin123", "password", "admin", "god", "test", "123456"}
	hash := "$2a$12$9q4chjmVrktiXx.bhC.1S.gV/YYUNdgEbIzwV8f2qeEMWtXoaUAU2"

	for _, password := range passwords {
		err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
		if err == nil {
			fmt.Printf("Password matches: %s\n", password)
			return
		}
	}
	fmt.Println("No password matches found")
}

