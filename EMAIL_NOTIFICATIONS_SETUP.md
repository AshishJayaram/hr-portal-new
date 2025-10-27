# Email Notifications Setup Guide

## Overview
The HR Portal now includes a comprehensive email notification system that sends notifications for various events like leave requests, KRA assignments, document uploads, and more.

## Features Implemented

### 1. Notification Types
- **Leave Notifications**: Applied, Approved, Rejected
- **KRA Notifications**: Created, Evaluated, Due Reminders
- **Document Notifications**: Upload notifications
- **Salary Slip Notifications**: Available notifications
- **Off-site Notifications**: Created, Approved, Rejected
- **Reimbursement Notifications**: Submitted, Approved, Rejected
- **Holiday Notifications**: Announcements

### 2. Notification Channels
- **Email**: SMTP-based email notifications
- **WhatsApp**: Placeholder for WhatsApp Business API integration

## Manual Configuration Required

### 1. Environment Variables
You need to set the following environment variables in your `backend/.env` file or system environment:

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=the.aa.hr.team@gmail.com
SMTP_PASS=strongpassword
FROM_EMAIL=the.aa.hr.team@gmail.com

# Optional: WhatsApp Configuration (for future implementation)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### 2. Gmail Setup (Recommended)
1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password as `SMTP_PASS`

### 3. Alternative SMTP Providers
You can use any SMTP provider. Here are some common configurations:

#### Outlook/Hotmail
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
```

#### Yahoo Mail
```bash
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
```

#### Custom SMTP Server
```bash
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
```

## How It Works

### 1. Automatic Notifications
The system automatically sends notifications when:
- A leave request is submitted (to manager)
- A leave request is approved/rejected (to employee)
- A KRA is assigned to an employee
- A KRA is evaluated (to employee)
- A document is uploaded (to employee)
- A salary slip is uploaded (to employee)
- An off-site request is submitted/approved/rejected
- A reimbursement request is submitted/approved/rejected
- A holiday is announced (to all employees)

### 2. Notification Service Integration
The notification service is integrated into:
- `LeaveService`: Sends notifications for leave events
- `KRAService`: Sends notifications for KRA events
- `DocumentService`: Sends notifications for document uploads
- `SalarySlipService`: Sends notifications for salary slip uploads

### 3. Email Templates
Each notification type has a customized email template with:
- Professional formatting
- Relevant information (dates, amounts, descriptions)
- Clear call-to-action
- Company branding

## Testing the System

### 1. Test Email Sending
You can test the email functionality by:
1. Creating a leave request
2. Approving/rejecting a leave request
3. Creating a KRA
4. Uploading a document

### 2. Check Server Logs
The server will log email sending attempts:
```
Email notification sent to user@example.com
Failed to send email notification: [error details]
```

### 3. Verify Configuration
If emails are not being sent, check:
1. Environment variables are set correctly
2. SMTP credentials are valid
3. Network connectivity to SMTP server
4. Server logs for error messages

## Troubleshooting

### Common Issues

#### 1. "SMTP configuration not found"
- **Cause**: Environment variables not set
- **Solution**: Set all required SMTP environment variables

#### 2. "Authentication failed"
- **Cause**: Invalid SMTP credentials
- **Solution**: Verify username/password and use app passwords for Gmail

#### 3. "Connection timeout"
- **Cause**: Network issues or wrong SMTP host/port
- **Solution**: Check network connectivity and SMTP settings

#### 4. "TLS/SSL errors"
- **Cause**: SMTP server requires secure connection
- **Solution**: Ensure using port 587 (TLS) or 465 (SSL)

### Debug Mode
To enable debug logging, set:
```bash
GIN_MODE=debug
```

## Future Enhancements

### 1. WhatsApp Integration
The system is prepared for WhatsApp Business API integration:
- Placeholder methods already implemented
- Twilio WhatsApp API integration ready
- Phone number validation included

### 2. Email Templates Customization
- HTML email templates
- Company branding
- Customizable templates per organization

### 3. Notification Preferences
- User notification preferences
- Opt-in/opt-out functionality
- Notification frequency settings

### 4. Advanced Features
- Email scheduling
- Bulk notifications
- Notification history
- Delivery status tracking

## Security Considerations

### 1. SMTP Credentials
- Store credentials securely
- Use environment variables
- Rotate passwords regularly
- Use app-specific passwords

### 2. Email Content
- Sanitize user input
- Avoid sensitive information in emails
- Use secure email protocols (TLS/SSL)

### 3. Rate Limiting
- Implement rate limiting for email sending
- Monitor for abuse
- Set daily email limits

## Support

If you encounter issues with the email notification system:

1. Check the server logs for error messages
2. Verify SMTP configuration
3. Test with a simple email client first
4. Contact your system administrator

## Implementation Status

✅ **Completed**:
- Email notification service
- SMTP integration
- Notification templates
- Integration with existing services
- Error handling and logging

🔄 **In Progress**:
- WhatsApp Business API integration
- HTML email templates
- User notification preferences

📋 **Planned**:
- Email scheduling
- Bulk notifications
- Delivery tracking
- Advanced customization
