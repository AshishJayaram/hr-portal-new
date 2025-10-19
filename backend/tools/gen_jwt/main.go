package main

import (
	"flag"
	"fmt"
	"os"
	"time"

	jwt "github.com/golang-jwt/jwt/v5"
)

func main() {
	userID := flag.String("user_id", "", "user id as string")
	orgID := flag.String("org_id", "", "organization id as string")
	role := flag.String("role", "Employee", "role: Employee|HR|Admin|God")
	secret := flag.String("secret", os.Getenv("JWT_SECRET"), "JWT secret (optional; defaults to env JWT_SECRET)")
	hours := flag.Int("hours", 24, "expiry in hours")
	flag.Parse()

	if *userID == "" || *orgID == "" || *secret == "" {
		fmt.Fprintln(os.Stderr, "usage: gen_jwt -user_id <id> -org_id <id> -role <Role> [-secret <secret>] [-hours <h>]")
		os.Exit(2)
	}

	claims := jwt.MapClaims{
		"user_id":         *userID,
		"organization_id": *orgID,
		"role":            *role,
		"exp":             time.Now().Add(time.Duration(*hours) * time.Hour).Unix(),
		"iat":             time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	s, err := token.SignedString([]byte(*secret))
	if err != nil {
		fmt.Fprintln(os.Stderr, "sign error:", err)
		os.Exit(1)
	}
	fmt.Println(s)
}
