# SMTP Email Setup Guide - Simplest Way

This guide will help you set up email notifications for the HR Portal in the simplest way possible.

## Option 1: Gmail (Recommended - Easiest)

### Step 1: Create or Use a Gmail Account
- Use an existing Gmail account or create a new one (e.g., `your-company@gmail.com`)

### Step 2: Enable 2-Step Verification
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click on **Security** (left sidebar)
3. Under "Signing in to Google", click **2-Step Verification**
4. Follow the prompts to enable it (you'll need a phone number)

### Step 3: Generate an App Password
1. Still in **Security** → **2-Step Verification**
2. Scroll down and click **App passwords**
3. Select app: **Mail**
4. Select device: **Other (Custom name)**
5. Enter name: **HR Portal**
6. Click **Generate**
7. **Copy the 16-character password** (it will look like: `abcd efgh ijkl mnop`)

### Step 4: Add to Your Backend `.env` File
Open `backend/.env` and add these lines:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
FROM_EMAIL=your-email@gmail.com
```

**Important:** Use the **App Password** (16 characters) you generated, NOT your regular Gmail password.

### Step 5: Restart Your Backend Server
```bash
cd backend
# Stop the server (Ctrl+C) and restart it
go run cmd/server/main.go
```

## Option 2: Outlook/Hotmail (Alternative)

### Steps:
1. Go to [Microsoft Account Security](https://account.microsoft.com/security)
2. Enable **Two-step verification**
3. Go to **Security** → **Advanced security options**
4. Click **Create a new app password**
5. Copy the generated password

### Add to `.env`:
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@outlook.com
```

## Testing Your Setup

### Option A: Test via User Creation
1. Create a new user in the HR Portal
2. Check if they receive a welcome email

### Option B: Check Server Logs
When you start the backend server, look for these messages:
- ✅ **Good:** `Email notification sent to user@example.com`
- ❌ **Problem:** `SMTP configuration not found, skipping email notification` (means env vars are missing)

## Troubleshooting

### "Authentication failed"
- Make sure you're using the **App Password**, not your regular password
- Ensure 2-Step Verification is enabled

### "Connection timeout"
- Check your internet connection
- Try port `465` instead of `587` (change `SMTP_PORT=465`)

### "SMTP configuration not found"
- Make sure your `.env` file is in the `backend/` directory
- Restart the server after adding env variables

## Quick Checklist

- [ ] Gmail account with 2-Step Verification enabled
- [ ] App Password generated (16 characters)
- ] Added env vars to `backend/.env`
- [ ] Restarted backend server
- [ ] Tested by creating a user

## Example Complete `.env` File

```bash
# ... other existing variables ...

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-company@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
FROM_EMAIL=your-company@gmail.com
```

That's it! Your HR Portal will now send welcome emails, password reset emails, and OTP emails automatically.

