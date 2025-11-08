package services

import (
	"encoding/json"
	"fmt"
	"net/smtp"
	"os"
	"strings"
	"time"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"

	"github.com/sirupsen/logrus"
)

// NotificationService interface for sending notifications
type NotificationService interface {
	SendEmail(to, subject, body string) error
	SendLeaveRequestNotification(leave *models.Leave, recipient *models.User, notificationType string) error
	SendDocumentUploadNotification(document *models.Document, recipient *models.User) error
	SendSalarySlipUploadNotification(salarySlip *models.SalarySlip, recipient *models.User) error
	SendKRANotification(kra *models.KRA, recipient *models.User, notificationType string) error
	SendOffSiteNotification(offSite *models.OffSite, recipient *models.User, notificationType string) error
	SendReimbursementNotification(reimbursement *models.Reimbursement, recipient *models.User, notificationType string) error
	SendHolidayNotification(holiday *models.Holiday, recipient *models.User) error
	SendBirthdayNotification(user *models.User, recipient *models.User, notificationType string) error
	// Birthday emails aligned with templates
	SendBirthdayEmployee(user *models.User, orgName string) error
	SendBirthdayAdminToday(recipients []*models.User, orgName string, items []BirthdayItem) error
	SendBirthdayAdminMonthlyDigest(recipients []*models.User, orgName string, month time.Month, year int, items []BirthdayItem) error
	SendWelcomeEmail(user *models.User, senderName string, password string) error
	CreateNotification(notification *models.Notification) error
	// Work anniversary emails
	SendWorkAnniversaryEmployee(user *models.User, orgName string, years int) error
	SendWorkAnniversaryAdminToday(recipients []*models.User, orgName string, items []WorkAnniversaryItem) error
	SendWorkAnniversaryAdminMonthlyDigest(recipients []*models.User, orgName string, month time.Month, year int, items []WorkAnniversaryItem) error
}

// notificationService implements NotificationService interface
type notificationService struct {
	notificationRepo    repositories.NotificationRepository
	companySettingsRepo repositories.CompanySettingsRepository
}

// NewNotificationService creates a new notification service
func NewNotificationService() NotificationService {
	return &notificationService{}
}

// NewNotificationServiceWithRepo creates a new notification service with repository
func NewNotificationServiceWithRepo(notificationRepo repositories.NotificationRepository, companySettingsRepo repositories.CompanySettingsRepository) NotificationService {
	return &notificationService{
		notificationRepo:    notificationRepo,
		companySettingsRepo: companySettingsRepo,
	}
}

// CreateNotification creates a notification in the database
func (s *notificationService) CreateNotification(notification *models.Notification) error {
	if s.notificationRepo == nil {
		// If no repo, just log (for backward compatibility)
		logrus.WithFields(logrus.Fields{
			"user_id": notification.UserID,
			"type":    notification.Type,
			"title":   notification.Title,
		}).Info("Notification would be created (repository not available)")
		return nil
	}
	return s.notificationRepo.Create(notification)
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

		// Format days with half-day information
		var daysText string
		if leave.StartHalf != "FULL" || leave.EndHalf != "FULL" {
			if leave.StartHalf != "FULL" && leave.EndHalf != "FULL" {
				daysText = fmt.Sprintf("%.1f days (Half day on %s and %s)", leave.Days, leave.FromDate.Format("2006-01-02"), leave.ToDate.Format("2006-01-02"))
			} else if leave.StartHalf != "FULL" {
				daysText = fmt.Sprintf("%.1f days (Half day on %s)", leave.Days, leave.FromDate.Format("2006-01-02"))
			} else {
				daysText = fmt.Sprintf("%.1f days (Half day on %s)", leave.Days, leave.ToDate.Format("2006-01-02"))
			}
		} else {
			daysText = fmt.Sprintf("%.1f day(s)", leave.Days)
		}

		message = fmt.Sprintf("Dear %s,\n\n%s has submitted a %s leave request:\n\n• From: %s\n• To: %s\n• Number of Days: %s\n• Reason: %s\n\nPlease review and take appropriate action.\n\nBest regards,\nHR Portal System",
			recipient.Name, applicantName, categoryName,
			leave.FromDate.Format("2006-01-02"), leave.ToDate.Format("2006-01-02"), daysText, leave.Reason)
	case "approved":
		subject = fmt.Sprintf("Leave Request Approved - %s", categoryName)

		// Format days with half-day information
		var daysText string
		if leave.StartHalf != "FULL" || leave.EndHalf != "FULL" {
			if leave.StartHalf != "FULL" && leave.EndHalf != "FULL" {
				daysText = fmt.Sprintf("%.1f days (Half day on %s and %s)", leave.Days, leave.FromDate.Format("2006-01-02"), leave.ToDate.Format("2006-01-02"))
			} else if leave.StartHalf != "FULL" {
				daysText = fmt.Sprintf("%.1f days (Half day on %s)", leave.Days, leave.FromDate.Format("2006-01-02"))
			} else {
				daysText = fmt.Sprintf("%.1f days (Half day on %s)", leave.Days, leave.ToDate.Format("2006-01-02"))
			}
		} else {
			daysText = fmt.Sprintf("%.1f day(s)", leave.Days)
		}

		message = fmt.Sprintf("Dear %s,\n\nYour %s leave request has been approved:\n\n• From: %s\n• To: %s\n• Number of Days: %s\n• Reason: %s\n\nBest regards,\nHR Portal System",
			recipient.Name, categoryName,
			leave.FromDate.Format("2006-01-02"), leave.ToDate.Format("2006-01-02"), daysText, leave.Reason)
	case "rejected":
		subject = fmt.Sprintf("Leave Request Rejected - %s", categoryName)
		rejectionReasonText := ""
		if leave.RejectionReason != nil && *leave.RejectionReason != "" {
			rejectionReasonText = fmt.Sprintf("\n\nRejection Reason: %s", *leave.RejectionReason)
		}

		// Format days with half-day information
		var daysText string
		if leave.StartHalf != "FULL" || leave.EndHalf != "FULL" {
			if leave.StartHalf != "FULL" && leave.EndHalf != "FULL" {
				daysText = fmt.Sprintf("%.1f days (Half day on %s and %s)", leave.Days, leave.FromDate.Format("2006-01-02"), leave.ToDate.Format("2006-01-02"))
			} else if leave.StartHalf != "FULL" {
				daysText = fmt.Sprintf("%.1f days (Half day on %s)", leave.Days, leave.FromDate.Format("2006-01-02"))
			} else {
				daysText = fmt.Sprintf("%.1f days (Half day on %s)", leave.Days, leave.ToDate.Format("2006-01-02"))
			}
		} else {
			daysText = fmt.Sprintf("%.1f day(s)", leave.Days)
		}

		message = fmt.Sprintf("Dear %s,\n\nYour %s leave request has been rejected:%s\n\n• From: %s\n• To: %s\n• Number of Days: %s\n• Original Reason: %s\n\nBest regards,\nHR Portal System",
			recipient.Name, categoryName, rejectionReasonText,
			leave.FromDate.Format("2006-01-02"), leave.ToDate.Format("2006-01-02"), daysText, leave.Reason)
	case "cancelled":
		subject = fmt.Sprintf("Leave Request Cancelled - %s", categoryName)

		// Format days with half-day information
		var daysText string
		if leave.StartHalf != "FULL" || leave.EndHalf != "FULL" {
			if leave.StartHalf != "FULL" && leave.EndHalf != "FULL" {
				daysText = fmt.Sprintf("%.1f days (Half day on %s and %s)", leave.Days, leave.FromDate.Format("2006-01-02"), leave.ToDate.Format("2006-01-02"))
			} else if leave.StartHalf != "FULL" {
				daysText = fmt.Sprintf("%.1f days (Half day on %s)", leave.Days, leave.FromDate.Format("2006-01-02"))
			} else {
				daysText = fmt.Sprintf("%.1f days (Half day on %s)", leave.Days, leave.ToDate.Format("2006-01-02"))
			}
		} else {
			daysText = fmt.Sprintf("%.1f day(s)", leave.Days)
		}

		message = fmt.Sprintf("Dear %s,\n\nYour %s leave request has been cancelled:\n\n• From: %s\n• To: %s\n• Number of Days: %s\n• Reason: %s\n\nBest regards,\nHR Portal System",
			recipient.Name, categoryName,
			leave.FromDate.Format("2006-01-02"), leave.ToDate.Format("2006-01-02"), daysText, leave.Reason)
	}

	// Send email notification
	if err := s.sendEmail(recipient.Email, subject, message); err != nil {
		logrus.WithError(err).WithFields(logrus.Fields{
			"recipient":    recipient.Email,
			"recipient_id": recipient.ID,
			"leave_id":     leave.ID,
			"applicant":    leave.User.Name,
		}).Error("Failed to send leave request notification email")
	}

	// Send WhatsApp notification (placeholder - implement actual WhatsApp Business API)
	if err := s.sendWhatsApp(recipient.Phone, message); err != nil {
	}

	// Store notification in database
	leaveID := leave.ID
	notificationTypeDB := "leave_" + notificationType // leave_applied, leave_approval, leave_rejection, leave_cancelled
	notification := &models.Notification{
		OrganizationID: recipient.OrganizationID,
		UserID:         recipient.ID,
		Type:           notificationTypeDB,
		Title:          subject,
		Message:        message,
		IsRead:         false,
		RelatedID:      &leaveID,
		RelatedType:    "leave",
	}
	if err := s.CreateNotification(notification); err != nil {
		logrus.WithError(err).Error("Failed to create leave notification in database")
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
		logrus.WithError(err).WithFields(logrus.Fields{
			"recipient":    recipient.Email,
			"recipient_id": recipient.ID,
			"document_id":  document.ID,
		}).Error("Failed to send document upload notification email")
	}

	// Send WhatsApp notification
	if err := s.sendWhatsApp(recipient.Phone, message); err != nil {
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
		logrus.WithError(err).WithFields(logrus.Fields{
			"recipient":      recipient.Email,
			"recipient_id":   recipient.ID,
			"salary_slip_id": salarySlip.ID,
		}).Error("Failed to send salary slip upload notification email")
	}

	// Send WhatsApp notification
	if err := s.sendWhatsApp(recipient.Phone, message); err != nil {
	}

	return nil
}

// SendEmail sends email notification (public method for interface)
func (s *notificationService) SendEmail(to, subject, body string) error {
	// Get SMTP configuration from environment variables
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")
	fromEmail := os.Getenv("FROM_EMAIL")

	if smtpHost == "" || smtpPort == "" || smtpUser == "" || smtpPass == "" || fromEmail == "" {
		logrus.WithFields(logrus.Fields{
			"to":              to,
			"subject":         subject,
			"smtp_configured": smtpHost != "" && smtpPort != "" && smtpUser != "" && smtpPass != "" && fromEmail != "",
		}).Warn("Email not sent: SMTP configuration is incomplete")
		return fmt.Errorf("SMTP configuration is incomplete - check environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL")
	}

	// Create message
	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s", fromEmail, to, subject, body)

	// Send email
	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)
	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, fromEmail, []string{to}, []byte(msg))
	if err != nil {
		logrus.WithError(err).WithFields(logrus.Fields{
			"to":        to,
			"subject":   subject,
			"smtp_host": smtpHost,
			"smtp_port": smtpPort,
		}).Error("Failed to send email via SMTP")
		return fmt.Errorf("failed to send email: %w", err)
	}

	logrus.WithFields(logrus.Fields{
		"to":      to,
		"subject": subject,
	}).Info("Email notification sent successfully")

	return nil
}

// sendEmail is an alias for SendEmail for internal use
func (s *notificationService) sendEmail(to, subject, body string) error {
	return s.SendEmail(to, subject, body)
}

// sendWhatsApp sends WhatsApp notification (placeholder implementation)
func (s *notificationService) sendWhatsApp(phone, message string) error {
	// This is a placeholder implementation
	// In a real implementation, you would integrate with WhatsApp Business API
	// For now, we'll just log the message

	if phone == "" {
		return nil
	}

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

// WorkAnniversaryItem represents a single work anniversary entry for emails
type WorkAnniversaryItem struct {
	Name        string
	Email       string
	Years       int
	JoiningDate time.Time
}

// BirthdayItem represents a single birthday entry for emails
type BirthdayItem struct {
	Name     string
	Email    string
	Birthday time.Time
}

// SendWorkAnniversaryEmployee sends a congratulations email to the employee on their work anniversary
func (s *notificationService) SendWorkAnniversaryEmployee(user *models.User, orgName string, years int) error {
	if user == nil {
		return nil
	}
	// Try organization-specific template
	subject, body, ok := s.getTemplateForAnniversaryEmployee(user.OrganizationID, user, years, orgName)
	if !ok {
		subject = fmt.Sprintf("Happy Work Anniversary, %s! 🎉", user.Name)
		body = fmt.Sprintf("Dear %s,\n\nCongratulations on your %d-year work anniversary with %s!\n\nThank you for your dedication, contributions, and the positive impact you've made. We're grateful to have you on the team and look forward to many more milestones together.\n\nWarm regards,\n%s",
			user.Name, years, orgName, orgName)
	}
	return s.sendEmail(user.Email, subject, body)
}

// SendWorkAnniversaryAdminToday notifies HR/Admin recipients about today's work anniversaries
func (s *notificationService) SendWorkAnniversaryAdminToday(recipients []*models.User, orgName string, items []WorkAnniversaryItem) error {
	if len(recipients) == 0 || len(items) == 0 {
		return nil
	}
	dateStr := time.Now().Format("January 2, 2006")
	listStr := buildAnniversaryList(items)
	// Try to use template based on first recipient's organization
	var subject, body string
	if len(recipients) > 0 {
		if subj, b, ok := s.getTemplateForAnniversaryAdminToday(recipients[0].OrganizationID, orgName, dateStr, listStr); ok {
			subject = subj
			body = b
		}
	}
	if subject == "" {
		subject = fmt.Sprintf("Today's Work Anniversaries - %s", dateStr)
	}
	if body == "" {
		var lines []string
		lines = append(lines, fmt.Sprintf("Hello Team,\n\nHere are today's work anniversaries at %s:\n", orgName))
		lines = append(lines, listStr)
		lines = append(lines, "\nPlease take a moment to congratulate and appreciate their contributions.\n\nRegards,\nHR Portal System")
		body = strings.Join(lines, "\n")
	}
	for _, r := range recipients {
		_ = s.sendEmail(r.Email, subject, body)
	}
	return nil
}

// SendWorkAnniversaryAdminMonthlyDigest sends a monthly digest of all anniversaries in the month to HR/Admin
func (s *notificationService) SendWorkAnniversaryAdminMonthlyDigest(recipients []*models.User, orgName string, month time.Month, year int, items []WorkAnniversaryItem) error {
	if len(recipients) == 0 {
		return nil
	}
	listStr := buildAnniversaryDigestList(month, items)
	// Try to use template based on first recipient's organization
	var subject, body string
	if len(recipients) > 0 {
		if subj, b, ok := s.getTemplateForAnniversaryAdminMonthly(recipients[0].OrganizationID, orgName, month.String(), year, listStr); ok {
			subject = subj
			body = b
		}
	}
	if subject == "" {
		subject = fmt.Sprintf("Work Anniversaries — %s %d", month.String(), year)
	}
	if body == "" {
		var lines []string
		lines = append(lines, fmt.Sprintf("Hello Team,\n\nHere are the work anniversaries for %s %d at %s:\n", month.String(), year, orgName))
		if len(items) == 0 {
			lines = append(lines, "• No work anniversaries this month.")
		} else {
			lines = append(lines, listStr)
		}
		lines = append(lines, "\nPlease plan any acknowledgements or celebrations accordingly.\n\nRegards,\nHR Portal System")
		body = strings.Join(lines, "\n")
	}
	for _, r := range recipients {
		_ = s.sendEmail(r.Email, subject, body)
	}
	return nil
}

func buildAnniversaryList(items []WorkAnniversaryItem) string {
	var lines []string
	for _, it := range items {
		lines = append(lines, fmt.Sprintf("• %s — %d year(s) (Joined: %s)", it.Name, it.Years, it.JoiningDate.Format("January 2, 2006")))
	}
	return strings.Join(lines, "\n")
}

func buildAnniversaryDigestList(month time.Month, items []WorkAnniversaryItem) string {
	if len(items) == 0 {
		return ""
	}
	// Group by day
	byDay := map[int][]WorkAnniversaryItem{}
	for _, it := range items {
		day := it.JoiningDate.Day()
		byDay[day] = append(byDay[day], it)
	}
	var lines []string
	for day := 1; day <= 31; day++ {
		if dayItems, ok := byDay[day]; ok {
			lines = append(lines, fmt.Sprintf("\n%s %d:", month.String(), day))
			for _, it := range dayItems {
				lines = append(lines, fmt.Sprintf("  • %s — %d year(s) (Joined: %s)", it.Name, it.Years, it.JoiningDate.Format("January 2, 2006")))
			}
		}
	}
	return strings.Join(lines, "\n")
}

// Template helpers for anniversaries
func (s *notificationService) getTemplateForAnniversaryEmployee(orgID uint, user *models.User, years int, orgName string) (string, string, bool) {
	if s.companySettingsRepo == nil {
		return "", "", false
	}
	orgIDStr := fmt.Sprintf("%d", orgID)
	settings, err := s.companySettingsRepo.GetByOrganizationID(orgIDStr)
	if err != nil || settings == nil || settings.Settings == "" {
		return "", "", false
	}
	var m map[string]interface{}
	if err := json.Unmarshal([]byte(settings.Settings), &m); err != nil {
		return "", "", false
	}
	notif, _ := m["notifications"].(map[string]interface{})
	anniv, _ := notif["anniversary"].(map[string]interface{})
	templates, _ := anniv["templates"].(map[string]interface{})
	subj, _ := templates["employee_subject"].(string)
	body, _ := templates["employee_body"].(string)
	if subj == "" && body == "" {
		return "", "", false
	}
	replacements := map[string]string{
		"{{employee_name}}":     user.Name,
		"{{years}}":             fmt.Sprintf("%d", years),
		"{{organization_name}}": orgName,
	}
	for k, v := range replacements {
		subj = strings.ReplaceAll(subj, k, v)
		body = strings.ReplaceAll(body, k, v)
	}
	return subj, body, true
}

func (s *notificationService) getTemplateForAnniversaryAdminToday(orgID uint, orgName, dateStr, list string) (string, string, bool) {
	if s.companySettingsRepo == nil {
		return "", "", false
	}
	orgIDStr := fmt.Sprintf("%d", orgID)
	settings, err := s.companySettingsRepo.GetByOrganizationID(orgIDStr)
	if err != nil || settings == nil || settings.Settings == "" {
		return "", "", false
	}
	var m map[string]interface{}
	if err := json.Unmarshal([]byte(settings.Settings), &m); err != nil {
		return "", "", false
	}
	notif, _ := m["notifications"].(map[string]interface{})
	anniv, _ := notif["anniversary"].(map[string]interface{})
	templates, _ := anniv["templates"].(map[string]interface{})
	subj, _ := templates["admin_today_subject"].(string)
	body, _ := templates["admin_today_body"].(string)
	if subj == "" && body == "" {
		return "", "", false
	}
	replacements := map[string]string{
		"{{date}}":              dateStr,
		"{{organization_name}}": orgName,
		"{{list}}":              list,
	}
	for k, v := range replacements {
		subj = strings.ReplaceAll(subj, k, v)
		body = strings.ReplaceAll(body, k, v)
	}
	return subj, body, true
}

func (s *notificationService) getTemplateForAnniversaryAdminMonthly(orgID uint, orgName, month string, year int, list string) (string, string, bool) {
	if s.companySettingsRepo == nil {
		return "", "", false
	}
	orgIDStr := fmt.Sprintf("%d", orgID)
	settings, err := s.companySettingsRepo.GetByOrganizationID(orgIDStr)
	if err != nil || settings == nil || settings.Settings == "" {
		return "", "", false
	}
	var m map[string]interface{}
	if err := json.Unmarshal([]byte(settings.Settings), &m); err != nil {
		return "", "", false
	}
	notif, _ := m["notifications"].(map[string]interface{})
	anniv, _ := notif["anniversary"].(map[string]interface{})
	templates, _ := anniv["templates"].(map[string]interface{})
	subj, _ := templates["admin_monthly_subject"].(string)
	body, _ := templates["admin_monthly_body"].(string)
	if subj == "" && body == "" {
		return "", "", false
	}
	replacements := map[string]string{
		"{{month}}":             month,
		"{{year}}":              fmt.Sprintf("%d", year),
		"{{organization_name}}": orgName,
		"{{list}}":              list,
	}
	for k, v := range replacements {
		subj = strings.ReplaceAll(subj, k, v)
		body = strings.ReplaceAll(body, k, v)
	}
	return subj, body, true
}

// SendKRANotification sends notification for KRA updates
func (s *notificationService) SendKRANotification(kra *models.KRA, recipient *models.User, notificationType string) error {
	var subject, message string

	// Get employee name for manager notifications
	employeeName := "Employee"
	if kra.User.Name != "" {
		employeeName = kra.User.Name
	}

	switch notificationType {
	case "created":
		subject = fmt.Sprintf("New KRA Assigned - %s", kra.Title)
		message = fmt.Sprintf("Dear %s,\n\nA new KRA '%s' has been assigned to you for %d.\n\nDescription: %s\nTarget Value: %s %s\nWeight: %.1f%%\n\nPlease review and start working on this KRA.\n\nBest regards,\nHR Portal System",
			recipient.Name, kra.Title, kra.Year, kra.Description, kra.TargetValue, kra.MeasurementUnit, kra.Weight)
	case "evaluated":
		subject = fmt.Sprintf("KRA Evaluated - %s", kra.Title)
		actualValue := "N/A"
		if kra.ActualValue != nil {
			actualValue = *kra.ActualValue
		}
		rating := 0.0
		if kra.Rating != nil {
			rating = *kra.Rating
		}
		comments := "No comments provided"
		if kra.Comments != nil && *kra.Comments != "" {
			comments = *kra.Comments
		}
		message = fmt.Sprintf("Dear %s,\n\nYour KRA '%s' for %d has been evaluated.\n\nActual Value: %s %s\nRating: %.1f/5\nComments: %s\n\nPlease review the evaluation and provide your feedback.\n\nBest regards,\nHR Portal System",
			recipient.Name, kra.Title, kra.Year, actualValue, kra.MeasurementUnit, rating, comments)
	case "due_reminder":
		subject = fmt.Sprintf("KRA Evaluation Due Soon - %s", kra.Title)
		message = fmt.Sprintf("Dear %s,\n\nYour KRA '%s' for %d is due for evaluation soon.\n\nPlease complete your self-assessment and submit it for review.\n\nBest regards,\nHR Portal System",
			recipient.Name, kra.Title, kra.Year)
	case "assigned_to_reportee":
		subject = fmt.Sprintf("KRA Assigned to Your Reportee - %s", kra.Title)
		message = fmt.Sprintf("Dear %s,\n\nA new KRA '%s' has been assigned to your direct reportee %s for %d.\n\n• Employee: %s\n• Description: %s\n• Target Value: %s %s\n• Weight: %.1f%%\n\nPlease review and provide guidance as needed.\n\nBest regards,\nHR Portal System",
			recipient.Name, kra.Title, employeeName, kra.Year, employeeName, kra.Description, kra.TargetValue, kra.MeasurementUnit, kra.Weight)
	case "reportee_self_assessed":
		subject = fmt.Sprintf("Reportee Self-Assessment Completed - %s", kra.Title)
		employeeActualValue := "N/A"
		if kra.EmployeeActualValue != nil {
			employeeActualValue = *kra.EmployeeActualValue
		}
		employeeRating := 0.0
		if kra.EmployeeRating != nil {
			employeeRating = *kra.EmployeeRating
		}
		employeeComments := "No comments provided"
		if kra.EmployeeComments != nil && *kra.EmployeeComments != "" {
			employeeComments = *kra.EmployeeComments
		}
		message = fmt.Sprintf("Dear %s,\n\nYour direct reportee %s has completed self-assessment for KRA '%s' (%d):\n\n• Employee: %s\n• Employee's Actual Value: %s %s\n• Employee's Self-Rating: %.1f/5\n• Employee's Comments: %s\n\nPlease review and evaluate the KRA.\n\nBest regards,\nHR Portal System",
			recipient.Name, employeeName, kra.Title, kra.Year, employeeName, employeeActualValue, kra.MeasurementUnit, employeeRating, employeeComments)
	}

	// Send email notification
	if err := s.sendEmail(recipient.Email, subject, message); err != nil {
		logrus.WithError(err).WithFields(logrus.Fields{
			"recipient":    recipient.Email,
			"recipient_id": recipient.ID,
			"kra_id":       kra.ID,
		}).Error("Failed to send KRA notification email")
	}

	// Send WhatsApp notification
	if err := s.sendWhatsApp(recipient.Phone, message); err != nil {
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
		logrus.WithError(err).WithFields(logrus.Fields{
			"recipient":    recipient.Email,
			"recipient_id": recipient.ID,
			"offsite_id":   offSite.ID,
		}).Error("Failed to send off-site notification email")
	}

	// Send WhatsApp notification
	if err := s.sendWhatsApp(recipient.Phone, message); err != nil {
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
		logrus.WithError(err).WithFields(logrus.Fields{
			"recipient":        recipient.Email,
			"recipient_id":     recipient.ID,
			"reimbursement_id": reimbursement.ID,
		}).Error("Failed to send reimbursement notification email")
	}

	// Send WhatsApp notification
	if err := s.sendWhatsApp(recipient.Phone, message); err != nil {
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
		logrus.WithError(err).WithFields(logrus.Fields{
			"recipient":    recipient.Email,
			"recipient_id": recipient.ID,
			"holiday_id":   holiday.ID,
		}).Error("Failed to send holiday notification email")
	}

	// Send WhatsApp notification
	if err := s.sendWhatsApp(recipient.Phone, message); err != nil {
	}

	return nil
}

// SendBirthdayNotification sends notification for birthday reminders and celebrations
func (s *notificationService) SendBirthdayNotification(user *models.User, recipient *models.User, notificationType string) error {
	var subject, message string

	switch notificationType {
	case "reminder":
		subject = fmt.Sprintf("Birthday Reminder - %s", user.Name)
		message = fmt.Sprintf("Dear %s,\n\nThis is a friendly reminder that %s's birthday is coming up on %s.\n\nConsider sending birthday wishes or planning a small celebration.\n\nBest regards,\nHR Portal System",
			recipient.Name, user.Name, user.Birthday.Format("January 2, 2006"))
	case "today":
		// Try organization-specific template
		if recipient != nil {
			if subj, body, ok := s.getTemplateForBirthdayToday(recipient.OrganizationID, user, recipient); ok {
				subject = subj
				message = body
			}
		}
		if subject == "" {
			subject = fmt.Sprintf("Happy Birthday - %s! 🎂", user.Name)
		}
		if message == "" {
			message = fmt.Sprintf("Dear %s,\n\nToday is %s's birthday! 🎂\n\nLet's celebrate this special day and make %s feel appreciated.\n\nBest regards,\nHR Portal System",
				recipient.Name, user.Name, user.Name)
		}
	case "advance_wish":
		subject = fmt.Sprintf("Advance Birthday Wishes - %s", user.Name)
		message = fmt.Sprintf("Dear %s,\n\n%s's birthday is coming up soon on %s. 🎂\n\nSending advance birthday wishes to %s!\n\nHappy Birthday in advance! May this year bring you joy, success, and all the happiness you deserve.\n\nBest regards,\nHR Portal System",
			recipient.Name, user.Name, user.Birthday.Format("January 2, 2006"), user.Name)
	}

	// Send email notification
	if err := s.sendEmail(recipient.Email, subject, message); err != nil {
		logrus.WithError(err).WithFields(logrus.Fields{
			"recipient":         recipient.Email,
			"recipient_id":      recipient.ID,
			"birthday_user_id":  user.ID,
			"notification_type": notificationType,
		}).Error("Failed to send birthday notification email")
	}

	// Send WhatsApp notification
	if err := s.sendWhatsApp(recipient.Phone, message); err != nil {
	}

	// Store notification in database
	notification := &models.Notification{
		OrganizationID: recipient.OrganizationID,
		UserID:         recipient.ID,
		Type:           "birthday",
		Title:          subject,
		Message:        message,
		IsRead:         false,
		RelatedID:      &user.ID,
		RelatedType:    "user",
	}
	if err := s.CreateNotification(notification); err != nil {
		logrus.WithError(err).Error("Failed to create birthday notification in database")
	}

	return nil
}

// getTemplateForBirthdayToday returns organization-specific subject/body if configured
func (s *notificationService) getTemplateForBirthdayToday(orgID uint, birthdayUser *models.User, recipient *models.User) (string, string, bool) {
	if s.companySettingsRepo == nil {
		return "", "", false
	}
	orgIDStr := fmt.Sprintf("%d", orgID)
	settings, err := s.companySettingsRepo.GetByOrganizationID(orgIDStr)
	if err != nil || settings == nil || settings.Settings == "" {
		return "", "", false
	}
	var m map[string]interface{}
	if err := json.Unmarshal([]byte(settings.Settings), &m); err != nil {
		return "", "", false
	}
	notif, _ := m["notifications"].(map[string]interface{})
	bday, _ := notif["birthday"].(map[string]interface{})
	templates, _ := bday["templates"].(map[string]interface{})
	subj, _ := templates["today_subject"].(string)
	body, _ := templates["today_body"].(string)
	if subj == "" && body == "" {
		return "", "", false
	}
	// Simple placeholder replacement
	replacements := map[string]string{
		"{{recipient_name}}":    recipient.Name,
		"{{birthday_name}}":     birthdayUser.Name,
		"{{birthday_date}}":     birthdayUser.Birthday.Format("January 2, 2006"),
		"{{organization_name}}": "",
	}
	for k, v := range replacements {
		subj = strings.ReplaceAll(subj, k, v)
		body = strings.ReplaceAll(body, k, v)
	}
	return subj, body, true
}

// SendBirthdayEmployee sends a happy birthday email to the employee
func (s *notificationService) SendBirthdayEmployee(user *models.User, orgName string) error {
	if user == nil {
		return nil
	}
	var subject, body string
	if subj, b, ok := s.getTemplateForBirthdayEmployee(user.OrganizationID, user, orgName); ok {
		subject = subj
		body = b
	}
	if subject == "" {
		subject = fmt.Sprintf("Happy Birthday, %s! 🎂", user.Name)
	}
	if body == "" {
		body = fmt.Sprintf("Dear %s,\n\nWishing you a very Happy Birthday from all of us at %s! 🎉\n\nHave a wonderful day and a fantastic year ahead.\n\nWarm regards,\n%s", user.Name, orgName, orgName)
	}
	return s.sendEmail(user.Email, subject, body)
}

// SendBirthdayAdminToday sends today's birthdays list to HR/Admin
func (s *notificationService) SendBirthdayAdminToday(recipients []*models.User, orgName string, items []BirthdayItem) error {
	if len(recipients) == 0 || len(items) == 0 {
		return nil
	}
	dateStr := time.Now().Format("January 2, 2006")
	listStr := buildBirthdayList(items)
	var subject, body string
	if len(recipients) > 0 {
		if subj, b, ok := s.getTemplateForBirthdayAdminToday(recipients[0].OrganizationID, orgName, dateStr, listStr); ok {
			subject = subj
			body = b
		}
	}
	if subject == "" {
		subject = fmt.Sprintf("Today's Birthdays - %s", dateStr)
	}
	if body == "" {
		var lines []string
		lines = append(lines, fmt.Sprintf("Hello Team,\n\nHere are today's birthdays at %s:\n", orgName))
		lines = append(lines, listStr)
		lines = append(lines, "\nPlease take a moment to send your wishes.\n\nRegards,\nHR Portal System")
		body = strings.Join(lines, "\n")
	}
	for _, r := range recipients {
		_ = s.sendEmail(r.Email, subject, body)
	}
	return nil
}

// SendBirthdayAdminMonthlyDigest sends a monthly digest of birthdays to HR/Admin
func (s *notificationService) SendBirthdayAdminMonthlyDigest(recipients []*models.User, orgName string, month time.Month, year int, items []BirthdayItem) error {
	if len(recipients) == 0 {
		return nil
	}
	listStr := buildBirthdayDigestList(month, items)
	var subject, body string
	if len(recipients) > 0 {
		if subj, b, ok := s.getTemplateForBirthdayAdminMonthly(recipients[0].OrganizationID, orgName, month.String(), year, listStr); ok {
			subject = subj
			body = b
		}
	}
	if subject == "" {
		subject = fmt.Sprintf("Birthdays — %s %d", month.String(), year)
	}
	if body == "" {
		var lines []string
		lines = append(lines, fmt.Sprintf("Hello Team,\n\nHere are the birthdays for %s %d at %s:\n", month.String(), year, orgName))
		if len(items) == 0 {
			lines = append(lines, "• No birthdays this month.")
		} else {
			lines = append(lines, listStr)
		}
		lines = append(lines, "\nPlease plan any celebrations accordingly.\n\nRegards,\nHR Portal System")
		body = strings.Join(lines, "\n")
	}
	for _, r := range recipients {
		_ = s.sendEmail(r.Email, subject, body)
	}
	return nil
}

func (s *notificationService) getTemplateForBirthdayEmployee(orgID uint, user *models.User, orgName string) (string, string, bool) {
	if s.companySettingsRepo == nil {
		return "", "", false
	}
	orgIDStr := fmt.Sprintf("%d", orgID)
	settings, err := s.companySettingsRepo.GetByOrganizationID(orgIDStr)
	if err != nil || settings == nil || settings.Settings == "" {
		return "", "", false
	}
	var m map[string]interface{}
	if err := json.Unmarshal([]byte(settings.Settings), &m); err != nil {
		return "", "", false
	}
	notif, _ := m["notifications"].(map[string]interface{})
	bday, _ := notif["birthday"].(map[string]interface{})
	templates, _ := bday["templates"].(map[string]interface{})
	subj, _ := templates["employee_subject"].(string)
	body, _ := templates["employee_body"].(string)
	if subj == "" && body == "" {
		return "", "", false
	}
	replacements := map[string]string{
		"{{employee_name}}":     user.Name,
		"{{organization_name}}": orgName,
	}
	for k, v := range replacements {
		subj = strings.ReplaceAll(subj, k, v)
		body = strings.ReplaceAll(body, k, v)
	}
	return subj, body, true
}

func (s *notificationService) getTemplateForBirthdayAdminToday(orgID uint, orgName, dateStr, list string) (string, string, bool) {
	if s.companySettingsRepo == nil {
		return "", "", false
	}
	orgIDStr := fmt.Sprintf("%d", orgID)
	settings, err := s.companySettingsRepo.GetByOrganizationID(orgIDStr)
	if err != nil || settings == nil || settings.Settings == "" {
		return "", "", false
	}
	var m map[string]interface{}
	if err := json.Unmarshal([]byte(settings.Settings), &m); err != nil {
		return "", "", false
	}
	notif, _ := m["notifications"].(map[string]interface{})
	bday, _ := notif["birthday"].(map[string]interface{})
	templates, _ := bday["templates"].(map[string]interface{})
	subj, _ := templates["admin_today_subject"].(string)
	body, _ := templates["admin_today_body"].(string)
	if subj == "" && body == "" {
		return "", "", false
	}
	replacements := map[string]string{
		"{{date}}":              dateStr,
		"{{organization_name}}": orgName,
		"{{list}}":              list,
	}
	for k, v := range replacements {
		subj = strings.ReplaceAll(subj, k, v)
		body = strings.ReplaceAll(body, k, v)
	}
	return subj, body, true
}

func (s *notificationService) getTemplateForBirthdayAdminMonthly(orgID uint, orgName, month string, year int, list string) (string, string, bool) {
	if s.companySettingsRepo == nil {
		return "", "", false
	}
	orgIDStr := fmt.Sprintf("%d", orgID)
	settings, err := s.companySettingsRepo.GetByOrganizationID(orgIDStr)
	if err != nil || settings == nil || settings.Settings == "" {
		return "", "", false
	}
	var m map[string]interface{}
	if err := json.Unmarshal([]byte(settings.Settings), &m); err != nil {
		return "", "", false
	}
	notif, _ := m["notifications"].(map[string]interface{})
	bday, _ := notif["birthday"].(map[string]interface{})
	templates, _ := bday["templates"].(map[string]interface{})
	subj, _ := templates["admin_monthly_subject"].(string)
	body, _ := templates["admin_monthly_body"].(string)
	if subj == "" && body == "" {
		return "", "", false
	}
	replacements := map[string]string{
		"{{month}}":             month,
		"{{year}}":              fmt.Sprintf("%d", year),
		"{{organization_name}}": orgName,
		"{{list}}":              list,
	}
	for k, v := range replacements {
		subj = strings.ReplaceAll(subj, k, v)
		body = strings.ReplaceAll(body, k, v)
	}
	return subj, body, true
}

func buildBirthdayList(items []BirthdayItem) string {
	var lines []string
	for _, it := range items {
		lines = append(lines, fmt.Sprintf("• %s (Born: %s)", it.Name, it.Birthday.Format("January 2")))
	}
	return strings.Join(lines, "\n")
}

func buildBirthdayDigestList(month time.Month, items []BirthdayItem) string {
	if len(items) == 0 {
		return ""
	}
	byDay := map[int][]BirthdayItem{}
	for _, it := range items {
		day := it.Birthday.Day()
		byDay[day] = append(byDay[day], it)
	}
	var lines []string
	for day := 1; day <= 31; day++ {
		if dayItems, ok := byDay[day]; ok {
			lines = append(lines, fmt.Sprintf("\n%s %d:", month.String(), day))
			for _, it := range dayItems {
				lines = append(lines, fmt.Sprintf("  • %s", it.Name))
			}
		}
	}
	return strings.Join(lines, "\n")
}

// SendWelcomeEmail sends a welcome email to newly created users
func (s *notificationService) SendWelcomeEmail(user *models.User, senderName string, password string) error {
	subject := fmt.Sprintf("Welcome to HR Portal - %s", senderName)

	// Build welcome message
	message := fmt.Sprintf(
		"Dear %s,\n\n"+
			"Welcome to the HR Portal! We're excited to have you on board.\n\n"+
			"Your account has been successfully created with the following details:\n\n"+
			"Username: %s\n"+
			"Password: %s\n"+
			"Email: %s\n"+
			"Role: %s\n"+
			"Department: %s\n",
		user.Name,
		user.Username,
		password,
		user.Email,
		user.Role,
		user.Department,
	)

	// Add designation if available
	if user.Designation != "" {
		message += fmt.Sprintf("Designation: %s\n", user.Designation)
	}

	// Add joining date if available
	if user.JoiningDate != nil {
		message += fmt.Sprintf("Joining Date: %s\n", user.JoiningDate.Format("January 2, 2006"))
	}

	message += "\n" +
		"Please use the above credentials to log in to the HR Portal.\n\n" +
		"⚠️ IMPORTANT: For security reasons, please change your password after your first login.\n" +
		"You can change your password in the Profile page once you log in.\n\n"

	// Add role-specific information
	if user.Role == "Admin" || user.Role == "HR" {
		message += "As an administrator, you have access to manage users, leave requests, documents, and other administrative functions.\n\n"
	} else {
		message += "You can access your leave balances, submit leave requests, view documents, and manage your profile.\n\n"
	}

	message += "If you have any questions or need assistance, please don't hesitate to reach out to the HR team.\n\n" +
		"Best regards,\n" +
		senderName

	// Send email notification
	if err := s.sendEmail(user.Email, subject, message); err != nil {
		logrus.WithError(err).WithFields(logrus.Fields{
			"recipient":     user.Email,
			"recipient_id":  user.ID,
			"user_username": user.Username,
		}).Error("Failed to send welcome email")
		return fmt.Errorf("failed to send welcome email: %w", err)
	}

	// Send WhatsApp notification (optional)
	if user.Phone != "" {
		if err := s.sendWhatsApp(user.Phone, message); err != nil {
		}
	}

	return nil
}
