//go:build dev
// +build dev

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

func main() {
	fmt.Println("=== Testing God API Endpoints ===\n")

	baseURL := "http://localhost:8080"

	// 1. Test health endpoint
	fmt.Println("1. Testing health endpoint...")
	resp, err := http.Get(baseURL + "/health")
	if err != nil {
		fmt.Printf("   ✗ Backend server is NOT running: %v\n", err)
		fmt.Println("\n   Please start the backend server:")
		fmt.Println("   cd backend && go run cmd/server/main.go")
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("   ✓ Health check: %s\n", string(body))

	// 2. Test login with Zeus
	fmt.Println("\n2. Testing login with Zeus...")
	loginData := map[string]string{
		"username": "Zeus",
		"password": "God@1234!",
	}
	loginJSON, _ := json.Marshal(loginData)
	resp, err = http.Post(baseURL+"/api/auth/login", "application/json", bytes.NewBuffer(loginJSON))
	if err != nil {
		fmt.Printf("   ✗ Login failed: %v\n", err)
		return
	}
	defer resp.Body.Close()
	body, _ = io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		fmt.Printf("   ✗ Login failed (Status %d): %s\n", resp.StatusCode, string(body))
		return
	}

	var loginResp map[string]interface{}
	json.Unmarshal(body, &loginResp)
	token, ok := loginResp["token"].(string)
	if !ok {
		fmt.Printf("   ✗ No token in response: %s\n", string(body))
		return
	}
	fmt.Printf("   ✓ Login successful! Token: %s...\n", token[:20])

	// 3. Test God organizations endpoint (should fail without auth)
	fmt.Println("\n3. Testing /api/god/organizations without auth...")
	resp, err = http.Get(baseURL + "/api/god/organizations")
	if err == nil {
		defer resp.Body.Close()
		body, _ = io.ReadAll(resp.Body)
		if resp.StatusCode == 401 {
			fmt.Printf("   ✓ Correctly requires authentication (401)\n")
		} else {
			fmt.Printf("   ⚠ Unexpected status: %d\n", resp.StatusCode)
		}
	}

	// 4. Test God organizations endpoint with auth
	fmt.Println("\n4. Testing /api/god/organizations with auth...")
	req, _ := http.NewRequest("GET", baseURL+"/api/god/organizations", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err = client.Do(req)
	if err != nil {
		fmt.Printf("   ✗ Request failed: %v\n", err)
		return
	}
	defer resp.Body.Close()
	body, _ = io.ReadAll(resp.Body)
	if resp.StatusCode == 200 {
		fmt.Printf("   ✓ Successfully accessed God endpoint!\n")
	} else {
		fmt.Printf("   ✗ Failed (Status %d): %s\n", resp.StatusCode, string(body))
	}

	// 5. Test POST /api/god/organizations with auth
	fmt.Println("\n5. Testing POST /api/god/organizations...")
	testOrg := map[string]interface{}{
		"name":        "Test Organization",
		"domain":      "TEST",
		"description": "Test description",
		"admin_user": map[string]string{
			"username": "test_admin",
			"email":    "test@example.com",
			"password": "password123",
			"name":     "Test Admin",
		},
	}
	orgJSON, _ := json.Marshal(testOrg)
	req, _ = http.NewRequest("POST", baseURL+"/api/god/organizations", bytes.NewBuffer(orgJSON))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err = client.Do(req)
	if err != nil {
		fmt.Printf("   ✗ Request failed: %v\n", err)
		return
	}
	defer resp.Body.Close()
	body, _ = io.ReadAll(resp.Body)
	if resp.StatusCode == 201 {
		fmt.Printf("   ✓ Successfully created organization!\n")
		var result map[string]interface{}
		json.Unmarshal(body, &result)
		if org, ok := result["organization"].(map[string]interface{}); ok {
			fmt.Printf("      Organization ID: %v\n", org["id"])
			fmt.Printf("      Name: %v\n", org["name"])
		}
		if adminUser, ok := result["admin_user"].(map[string]interface{}); ok {
			fmt.Printf("      Admin User: %v (%v)\n", adminUser["username"], adminUser["email"])
		}
	} else {
		fmt.Printf("   ✗ Failed (Status %d): %s\n", resp.StatusCode, string(body))
	}

	fmt.Println("\n=== Test Complete ===")
	fmt.Println("\nIf all tests passed, your API is working correctly!")
	fmt.Println("The 401 error you're seeing is because:")
	fmt.Println("1. You need to log in first as Zeus")
	fmt.Println("2. The token needs to be stored in localStorage")
	fmt.Println("3. The frontend needs to send it in the Authorization header")
}

