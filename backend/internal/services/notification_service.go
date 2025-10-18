package services

import (
	"fmt"
	"net/smtp"
	"os"
	"strings"
	"time"

	"hr-portal-backend/internal/models"
)

// NotificationService interface for sending notifications
type NotificationService interface {
	SendLeaveRequestNotification(leave *models.Leave, recipient *models.User, notificationType string) error
	SendDocumentUploadNotification(document *models.Document, recipient *models.User) error
	SendSalarySlipUploadNotification(salarySlip *models.SalarySlip, recipient *models.User) error
	SendKRANotification(kra *models.KRA, recipient *models.User, notificationType string) error
	SendOffSiteNotification(offSite *models.OffSite, recipient *models.User, notificationType string) error
	SendReimbursementNotification(reimbursement *models.Reimbursement, recipient *models.User, notificationType string) error
	SendHolidayNotification(holiday *models.Holiday, recipient *models.User) error
}

// notificationService implements NotificationService interface
type notificationService struct {
	// Add any dependencies here if needed
}

// NewNotificationService creates a new notification service
func NewNotificationService() NotificationService {
	return &notificationService{}
}

// SendLeaveRequestNotification sends notification for leave request updates
func (s *notificationService) SendLeaveRequestNotification(leave *models.Leave, recipient *models.User, notificationType string) error {
	// Get leave category name
	categoryName := "Leave"
	if leave.Category.Name != "" {
		categoryName = leave.Category.Name
	}

	// Get applicant name
	applicantName := "Employee"
	if leave.User.Name != "" {
		applicantName = leave.User.Name
	}

	var subject, message string
	switch notificationType {
	case "applied":
		subject = fmt.Sprintf("Leave Request Submitted - %s", categoryName)
		message = fmt.Sprintf("Dear %s,\n\n%s has submitted a %s leave request from %s to %s.\n\nReason: %s\n\nPlease review and take appropriate action.\n\nBest regards,\nHR Portal System",
			recipient.Name, applicantName, categoryName,
			leave.FromDate.Format("2006-01-02"), leave.ToDate.Format("2006-01-02"), leave.Reason)
	case "approved":
		subject = fmt.Sprintf("Leave Request Approved - %s", categoryName)
		message = fmt.Sprintf("Dear %s,\n\nYour %s leave request from %s to %s has been approved.\n\nReason: %s\n\nBest regards,\nHR Portal System",
			recipient.Name, categoryName,
			leave.FromDate.Format("2006-01-02"), leave.ToDate.Format("2006-01-02"), leave.Reason)
	case "rejected":
		subject = fmt.Sprintf("Leave Request Rejected - %s", categoryName)
		message = fmt.Sprintf("Dear %s,\n\nYour %s leave request from %s to %s has been rejected.\n\nReason: %s\n\nBest regards,\nHR Portal System",
			recipient.Name, categoryName,
			leave.FromDate.Format("2006-01-02"), leave.ToDate.Format("2006-01-02"), leave.Reason)
	}

	// Send email notification
	if err := s.sendEmail(recipient.Email, subject, message); err != nil {
		fmt.Printf("Failed to send email notification: %v\n", err)
	}

	// Send WhatsApp notification (placeholder - implement actual WhatsApp Business API)
	if err := s.sendWhatsApp(recipient.Phone, message); err != nil {
		fmt.Printf("Failed to send WhatsApp notification: %v\n", err)
	}

	return nil
}

// SendDocumentUploadNotification sends notification for document uploads
func (s *notificationService) SendDocumentUploadNotification(document *models.Document, recipient *models.User) error {
	subject := "New Document Uploaded"
	message := fmt.Sprintf("Dear %s,\n\nA new document '%s' has been uploaded for you.\n\nCategory: %s\nUploaded on: %s\n\nPlease check your documents section for more details.\n\nBest regards,\nHR Portal System",
		recipient.Name, document.Title, document.Category,
		document.CreatedAt.Format("2006-01-02 15:04:05"))

	// Send email notification
	if err := s.sendEmail(recipient.Email, subject, message); err != nil {
		fmt.Printf("Failed to send email notification: %v\n", err)
	}

	// Send WhatsApp notification
	if err := s.sendWhatsApp(recipient.Phone, message); err != nil {
		fmt.Printf("Failed to send WhatsApp notification: %v\n", err)
	}

	return nil
}

// SendSalarySlipUploadNotification sends notification for salary slip uploads
func (s *notificationService) SendSalarySlipUploadNotification(salarySlip *models.SalarySlip, recipient *models.User) error {
	subject := "Salary Slip Available"
	message := fmt.Sprintf("Dear %s,\n\nYour salary slip for %s %d is now available.\n\nPlease check your salary slips section to download.\n\nBest regards,\nHR Portal System",
		recipient.Name, time.Month(salarySlip.Month).String(), salarySlip.Year)

	// Send email notification
	if err := s.sendEmail(recipient.Email, subject, message); err != nil {
		fmt.Printf("Failed to send email notification: %v\n", err)
	}

	// Send WhatsApp notification
	if err := s.sendWhatsApp(recipient.Phone, message); err != nil {
		fmt.Printf("Failed to send WhatsApp notification: %v\n", err)
	}

	return nil
}

// sendEmail sends email notification
func (s *notificationService) sendEmail(to, subject, body string) error {
	// Get SMTP configuration from environment variables
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")
	fromEmail := os.Getenv("FROM_EMAIL")

	if smtpHost == "" || smtpPort == "" || smtpUser == "" || smtpPass == "" || fromEmail == "" {
		fmt.Println("SMTP configuration not found, skipping email notification")
		return nil
	}

	// Create message
	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s", fromEmail, to, subject, body)

	// Send email
	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)
	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, fromEmail, []string{to}, []byte(msg))
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	fmt.Printf("Email notification sent to %s\n", to)
	return nil
}

// sendWhatsApp sends WhatsApp notification (placeholder implementation)
func (s *notificationService) sendWhatsApp(phone, message string) error {
	// This is a placeholder implementation
	// In a real implementation, you would integrate with WhatsApp Business API
	// For now, we'll just log the message

	if phone == "" {
		fmt.Println("No phone number provided, skipping WhatsApp notification")
		return nil
	}

	// Remove any non-digit characters from phone number
	phone = strings.ReplaceAll(phone, "+", "")
	phone = strings.ReplaceAll(phone, "-", "")
	phone = strings.ReplaceAll(phone, " ", "")
	phone = strings.ReplaceAll(phone, "(", "")
	phone = strings.ReplaceAll(phone, ")", "")

	fmt.Printf("WhatsApp notification would be sent to %s: %s\n", phone, message)

	// TODO: Implement actual WhatsApp Business API integration
	// Example with Twilio WhatsApp API:
	// accountSid := os.Getenv("TWILIO_ACCOUNT_SID")
	// authToken := os.Getenv("TWILIO_AUTH_TOKEN")
	// from := os.Getenv("TWILIO_WHATSAPP_FROM")
	//
	// client := twilio.NewRestClient(accountSid, authToken)
	// params := &twilio.CreateMessageParams{}
	// params.SetFrom(from)
	// params.SetTo("whatsapp:" + phone)
	// params.SetBody(message)
	//
	// _, err := client.Api.CreateMessage(params)
	// return err

	return nil
}

// SendKRANotification sends notification for KRA updates
func (s *notificationService) SendKRANotification(kra *models.KRA, recipient *models.User, notificationType string) error {
	var subject, message string
	switch notificationType {
	case "created":
		subject = fmt.Sprintf("New KRA Assigned - %s", kra.Title)
		message = fmt.Sprintf("Dear %s,\n\nA new KRA '%s' has been assigned to you for %d.\n\nDescription: %s\nTarget Value: %s %s\nWeight: %.1f%%\n\nPlease review and start working on this KRA.\n\nBest regards,\nHR Portal System",
			recipient.Name, kra.Title, kra.Year, kra.Description, kra.TargetValue, kra.MeasurementUnit, kra.Weight)
	case "evaluated":
		subject = fmt.Sprintf("KRA Evaluated - %s", kra.Title)
		message = fmt.Sprintf("Dear %s,\n\nYour KRA '%s' for %d has been evaluated.\n\nActual Value: %s %s\nRating: %.1f/5\nComments: %s\n\nPlease review the evaluation and provide your feedback.\n\nBest regards,\nHR Portal System",
			recipient.Name, kra.Title, kra.Year, kra.ActualValue, kra.MeasurementUnit, kra.Rating, kra.Comments)
	case "due_reminder":
		subject = fmt.Sprintf("KRA Evaluation Due Soon - %s", kra.Title)
		message = fmt.Sprintf("Dear %s,\n\nYour KRA '%s' for %d is due for evaluation soon.\n\nPlease complete your self-assessment and submit it for review.\n\nBest regards,\nHR Portal System",
			recipient.Name, kra.Title, kra.Year)
	}

	// Send email notification
	if err := s.sendEmail(recipient.Email, subject, message); err != nil {
		fmt.Printf("Failed to send KRA email notification: %v\n", err)
	}

	// Send WhatsApp notification
	if err := s.sendWhatsApp(recipient.Phone, message); err != nil {
		fmt.Printf("Failed to send KRA WhatsApp notification: %v\n", err)
	}

	return nil
}

// SendOffSiteNotification sends notification for off-site updates
func (s *notificationService) SendOffSiteNotification(offSite *models.OffSite, recipient *models.User, notificationType string) error {
	var subject, message string
	switch notificationType {
	case "created":
		subject = fmt.Sprintf("Off-site Request Submitted - %s", offSite.Location)
		message = fmt.Sprintf("Dear %s,\n\n%s has submitted an off-site request for %s.\n\nLocation: %s\nFrom: %s\nTo: %s\nDescription: %s\n\nPlease review and take appropriate action.\n\nBest regards,\nHR Portal System",
			recipient.Name, offSite.User.Name, offSite.Location,
			offSite.Location, offSite.StartDate.Format("2006-01-02"), offSite.EndDate.Format("2006-01-02"), offSite.Description)
	case "approved":
		subject = fmt.Sprintf("Off-site Request Approved - %s", offSite.Location)
		message = fmt.Sprintf("Dear %s,\n\nYour off-site request for %s from %s to %s has been approved.\n\nDescription: %s\n\nBest regards,\nHR Portal System",
			recipient.Name, offSite.Location,
			offSite.StartDate.Format("2006-01-02"), offSite.EndDate.Format("2006-01-02"), offSite.Description)
	case "rejected":
		subject = fmt.Sprintf("Off-site Request Rejected - %s", offSite.Location)
		message = fmt.Sprintf("Dear %s,\n\nYour off-site request for %s from %s to %s has been rejected.\n\nDescription: %s\n\nBest regards,\nHR Portal System",
			recipient.Name, offSite.Location,
			offSite.StartDate.Format("2006-01-02"), offSite.EndDate.Format("2006-01-02"), offSite.Description)
	}

	// Send email notification
	if err := s.sendEmail(recipient.Email, subject, message); err != nil {
		fmt.Printf("Failed to send off-site email notification: %v\n", err)
	}

	// Send WhatsApp notification
	if err := s.sendWhatsApp(recipient.Phone, message); err != nil {
		fmt.Printf("Failed to send off-site WhatsApp notification: %v\n", err)
	}

	return nil
}

// SendReimbursementNotification sends notification for reimbursement updates
func (s *notificationService) SendReimbursementNotification(reimbursement *models.Reimbursement, recipient *models.User, notificationType string) error {
	var subject, message string
	switch notificationType {
	case "submitted":
		subject = fmt.Sprintf("Reimbursement Request Submitted - ₹%.2f", reimbursement.Amount)
		message = fmt.Sprintf("Dear %s,\n\n%s has submitted a reimbursement request.\n\nAmount: ₹%.2f\nReason: %s\nDescription: %s\nSubmitted on: %s\n\nPlease review and take appropriate action.\n\nBest regards,\nHR Portal System",
			recipient.Name, reimbursement.User.Name, reimbursement.Amount,
			reimbursement.Reason, reimbursement.Description, reimbursement.CreatedAt.Format("2006-01-02 15:04:05"))
	case "approved":
		subject = fmt.Sprintf("Reimbursement Request Approved - ₹%.2f", reimbursement.Amount)
		message = fmt.Sprintf("Dear %s,\n\nYour reimbursement request of ₹%.2f has been approved.\n\nReason: %s\nDescription: %s\n\nBest regards,\nHR Portal System",
			recipient.Name, reimbursement.Amount, reimbursement.Reason, reimbursement.Description)
	case "rejected":
		subject = fmt.Sprintf("Reimbursement Request Rejected - ₹%.2f", reimbursement.Amount)
		message = fmt.Sprintf("Dear %s,\n\nYour reimbursement request of ₹%.2f has been rejected.\n\nReason: %s\nDescription: %s\n\nBest regards,\nHR Portal System",
			recipient.Name, reimbursement.Amount, reimbursement.Reason, reimbursement.Description)
	}

	// Send email notification
	if err := s.sendEmail(recipient.Email, subject, message); err != nil {
		fmt.Printf("Failed to send reimbursement email notification: %v\n", err)
	}

	// Send WhatsApp notification
	if err := s.sendWhatsApp(recipient.Phone, message); err != nil {
		fmt.Printf("Failed to send reimbursement WhatsApp notification: %v\n", err)
	}

	return nil
}

// SendHolidayNotification sends notification for holiday announcements
func (s *notificationService) SendHolidayNotification(holiday *models.Holiday, recipient *models.User) error {
	subject := fmt.Sprintf("Holiday Announcement - %s", holiday.Name)
	message := fmt.Sprintf("Dear %s,\n\nA new holiday has been announced:\n\nHoliday: %s\nDate: %s\nType: %s\nDescription: %s\n\nPlease plan your work accordingly.\n\nBest regards,\nHR Portal System",
		recipient.Name, holiday.Name, holiday.Date.Format("2006-01-02"), holiday.Type, holiday.Description)

	// Send email notification
	if err := s.sendEmail(recipient.Email, subject, message); err != nil {
		fmt.Printf("Failed to send holiday email notification: %v\n", err)
	}

	// Send WhatsApp notification
	if err := s.sendWhatsApp(recipient.Phone, message); err != nil {
		fmt.Printf("Failed to send holiday WhatsApp notification: %v\n", err)
	}

	return nil
}
