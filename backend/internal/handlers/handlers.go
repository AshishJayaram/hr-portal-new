package handlers

import (
	"hr-portal-backend/internal/config"
	"hr-portal-backend/internal/repositories"
	"hr-portal-backend/internal/services"
)

// Handlers holds all HTTP handlers
type Handlers struct {
	Auth                   *AuthHandler
	User                   *UserHandler
	Team                   *TeamHandler
	Leave                  *LeaveHandler
	LeaveCategory          *LeaveCategoryHandler
	LeaveAllocation        *LeaveAllocationHandler
	Document               *DocumentHandler
	SalarySlip             *SalarySlipHandler
	Holiday                *HolidayHandler
	Company                *CompanyHandler
	Dashboard              *DashboardHandler
	God                    *GodHandler
	Audit                  *AuditHandler
	OffSite                *OffSiteHandler
	Reimbursement          *ReimbursementHandler
	Feedback               *FeedbackHandler
	EmployeeGrowth         *EmployeeGrowthHandler
	DocumentAcknowledgment *DocumentAcknowledgmentHandler
	PrivateDocument        *PrivateDocumentHandler
	PayslipPDF             *PayslipPDFHandler
	KRA                    *KRAHandler
}

// New creates a new instance of Handlers
func New(services *services.Services, repos *repositories.Repositories, cfg *config.Config) *Handlers {
	return &Handlers{
		Auth:                   NewAuthHandler(services.Auth),
		User:                   NewUserHandler(services.User),
		Team:                   NewTeamHandler(services.User),
		Leave:                  NewLeaveHandler(services.Leave, services.LOP, services.Audit),
		LeaveCategory:          NewLeaveCategoryHandler(services.LeaveCategory),
		LeaveAllocation:        NewLeaveAllocationHandler(services.LeaveAllocation),
		Document:               NewDocumentHandler(services.Document),
		SalarySlip:             NewSalarySlipHandler(services.SalarySlip),
		Holiday:                NewHolidayHandler(services.Holiday),
		Company:                NewCompanyHandler(services.CompanySettings),
		Dashboard:              NewDashboardHandler(services.Dashboard),
		God:                    NewGodHandler(services, repos),
		Audit:                  NewAuditHandler(services.Audit),
		OffSite:                NewOffSiteHandler(services.OffSite),
		Reimbursement:          NewReimbursementHandler(services.Reimbursement),
		Feedback:               NewFeedbackHandler(services.Feedback),
		EmployeeGrowth:         NewEmployeeGrowthHandler(services.EmployeeGrowth),
		DocumentAcknowledgment: NewDocumentAcknowledgmentHandler(services.DocumentAcknowledgment),
		PrivateDocument:        NewPrivateDocumentHandler(services.EmployeePrivateDocument),
		PayslipPDF:             NewPayslipPDFHandler(services.PayslipPDF, services.SalarySlip, services.User, services.CompanySettings),
		KRA:                    NewKRAHandler(services.KRA),
	}
}
