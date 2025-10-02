package handlers

import (
	"hr-portal-backend/internal/config"
	"hr-portal-backend/internal/services"
)

// Handlers holds all HTTP handlers
type Handlers struct {
	Auth            *AuthHandler
	User            *UserHandler
	Leave           *LeaveHandler
	LeaveCategory   *LeaveCategoryHandler
	LeaveAllocation *LeaveAllocationHandler
	Document        *DocumentHandler
	SalarySlip      *SalarySlipHandler
	Holiday         *HolidayHandler
	Company         *CompanyHandler
	Dashboard       *DashboardHandler
	God             *GodHandler
	Audit           *AuditHandler
}

// New creates a new instance of Handlers
func New(services *services.Services, cfg *config.Config) *Handlers {
	return &Handlers{
		Auth:            NewAuthHandler(services.Auth),
		User:            NewUserHandler(services.User),
		Leave:           NewLeaveHandler(services.Leave, services.Audit),
		LeaveCategory:   NewLeaveCategoryHandler(services.LeaveCategory),
		LeaveAllocation: NewLeaveAllocationHandler(services.LeaveAllocation),
		Document:        NewDocumentHandler(services.Document),
		SalarySlip:      NewSalarySlipHandler(services.SalarySlip),
		Holiday:         NewHolidayHandler(services.Holiday),
		Company:         NewCompanyHandler(services.CompanySettings),
		Dashboard:       NewDashboardHandler(services.Dashboard),
		God:             NewGodHandler(services),
		Audit:           NewAuditHandler(services.Audit),
	}
}
