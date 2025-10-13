package main

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	hash, err := bcrypt.GenerateFromPassword([]byte("password"), 12)
	if err != nil {
		fmt.Printf("Error generating hash: %v\n", err)
		return
	}
	fmt.Println(string(hash))
}
