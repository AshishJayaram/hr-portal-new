package main

import (
	"fmt"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	passwords := []string{"smr123", "password123", "admin123", "password", "admin"}
	hash := "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
	
	for _, password := range passwords {
		err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
		if err == nil {
			fmt.Printf("Password matches: %s\n", password)
			return
		}
	}
	fmt.Println("No password matches found")
}
