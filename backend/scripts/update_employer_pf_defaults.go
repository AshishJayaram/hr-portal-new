//go:build update_employer_pf_defaults
// +build update_employer_pf_defaults

package main

import (
	"encoding/json"
	"fmt"
	"log"

	"hr-portal-backend/internal/config"
	"hr-portal-backend/internal/database"
	"hr-portal-backend/internal/models"
)

type EmployerPFField struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Value float64 `json:"value"`
	Type  string `json:"type"`
}

type EmployerPFConfig struct {
	EmployerPFPercentOfBasic float64           `json:"employerPFPercentOfBasic"`
	EPSPercentOfBasic       float64           `json:"epsPercentOfBasic"`
	EPSCap                  float64           `json:"epsCap"`
	Enabled                 bool              `json:"enabled"`
	Fields                  []EmployerPFField `json:"fields"`
	ConditionalEarnings     []interface{}     `json:"conditionalEarnings"`
	ConditionalDeductions   []interface{}     `json:"conditionalDeductions"`
}

type PayrollSettings struct {
	Earnings         interface{}      `json:"earnings"`
	Deductions       interface{}      `json:"deductions"`
	EmployerPF       EmployerPFConfig `json:"employerPF"`
	Lop              interface{}      `json:"lop"`
	Overtime         interface{}      `json:"overtime"`
}

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize database
	db, err := database.Initialize(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Enable foreign keys
	if err := db.Exec("PRAGMA foreign_keys = ON").Error; err != nil {
		log.Fatalf("Failed to enable foreign keys: %v", err)
	}

	fmt.Println("Starting to update employer PF defaults for all organizations...")

	// Default employer PF fields
	defaultEmployerPFFields := []EmployerPFField{
		{
			ID:    "total_pf",
			Label: "Total PF",
			Value: 12,
			Type:  "PERCENTAGE",
		},
		{
			ID:    "eps",
			Label: "EPS",
			Value: 8.33,
			Type:  "PERCENTAGE",
		},
		{
			ID:    "epf",
			Label: "EPF",
			Value: 3.67,
			Type:  "PERCENTAGE",
		},
		{
			ID:    "admin_charges",
			Label: "Administration Charges",
			Value: 0.5,
			Type:  "PERCENTAGE",
		},
		{
			ID:    "edli",
			Label: "EDLI",
			Value: 0.5,
			Type:  "PERCENTAGE",
		},
		{
			ID:    "inspection_charges",
			Label: "Inspection Charges",
			Value: 5,
			Type:  "FIXED_AMOUNT",
		},
	}

	// Get all organizations
	var organizations []models.Organization
	if err := db.Find(&organizations).Error; err != nil {
		log.Fatalf("Failed to fetch organizations: %v", err)
	}

	updatedCount := 0

	// Process each organization
	for _, org := range organizations {
		fmt.Printf("\nProcessing Organization: %s (ID: %d)\n", org.Name, org.ID)

		// Parse existing settings
		var settings PayrollSettings
		if org.Settings != "" {
			if err := json.Unmarshal([]byte(org.Settings), &settings); err != nil {
				log.Printf("Failed to parse settings for organization %d: %v", org.ID, err)
				continue
			}
		} else {
			// Initialize empty settings if none exist
			settings = PayrollSettings{
				EmployerPF: EmployerPFConfig{
					EmployerPFPercentOfBasic: 12,
					EPSPercentOfBasic:       8.33,
					EPSCap:                  1250,
					Enabled:                 true,
					ConditionalEarnings:     []interface{}{},
					ConditionalDeductions:   []interface{}{},
				},
			}
		}

		// Check if employer PF fields are already set
		if len(settings.EmployerPF.Fields) > 0 {
			fmt.Printf("  Organization already has employer PF fields configured, skipping...\n")
			continue
		}

		// Update employer PF configuration with default fields
		settings.EmployerPF.Fields = defaultEmployerPFFields

		// Convert back to JSON
		settingsJSON, err := json.Marshal(settings)
		if err != nil {
			log.Printf("Failed to marshal settings for organization %d: %v", org.ID, err)
			continue
		}

		// Update organization settings
		if err := db.Model(&org).Update("settings", string(settingsJSON)).Error; err != nil {
			log.Printf("Failed to update organization %d: %v", org.ID, err)
			continue
		}

		fmt.Printf("  ✓ Updated employer PF fields for organization: %s\n", org.Name)
		updatedCount++
	}

	fmt.Printf("\n=== Migration Complete ===\n")
	fmt.Printf("Total organizations updated: %d\n", updatedCount)
	fmt.Println("Done!")
}
