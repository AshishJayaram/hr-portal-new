#!/bin/bash

# Email Notification Setup Script
# This script helps you configure email notifications for the HR Portal

echo "📧 HR Portal Email Notification Setup"
echo "====================================="
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Creating .env file from env.example..."
    cp env.example .env
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "📋 Email Configuration Required:"
echo "================================"
echo ""
echo "You need to set the following variables in your .env file:"
echo ""
echo "SMTP_HOST=smtp.gmail.com"
echo "SMTP_PORT=587"
echo "SMTP_USER=your-email@gmail.com"
echo "SMTP_PASS=your-app-password"
echo "FROM_EMAIL=your-email@gmail.com"
echo ""

echo "🔧 Gmail Setup Instructions:"
echo "============================"
echo ""
echo "1. Enable 2-Factor Authentication on your Gmail account"
echo "2. Generate an App Password:"
echo "   - Go to Google Account settings"
echo "   - Security → 2-Step Verification → App passwords"
echo "   - Generate a new app password for 'Mail'"
echo "   - Use this password as SMTP_PASS"
echo ""

echo "📝 Alternative SMTP Providers:"
echo "============================="
echo ""
echo "Outlook/Hotmail:"
echo "SMTP_HOST=smtp-mail.outlook.com"
echo "SMTP_PORT=587"
echo ""
echo "Yahoo Mail:"
echo "SMTP_HOST=smtp.mail.yahoo.com"
echo "SMTP_PORT=587"
echo ""

echo "🧪 Testing Email Notifications:"
echo "==============================="
echo ""
echo "After setting up the configuration:"
echo "1. Restart the backend server"
echo "2. Create a leave request"
echo "3. Approve/reject a leave request"
echo "4. Create a KRA"
echo "5. Upload a document"
echo ""
echo "Check server logs for email sending status"
echo ""

echo "📚 For more details, see EMAIL_NOTIFICATIONS_SETUP.md"
echo ""
echo "Setup complete! Edit your .env file with your email credentials."
