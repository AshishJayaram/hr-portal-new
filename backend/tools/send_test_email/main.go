package main

import (
    "flag"
    "fmt"
    "log"
    "net/smtp"
    "os"

    "github.com/joho/godotenv"
)

func main() {
    // Load .env if present
    _ = godotenv.Load(".env")
    _ = godotenv.Load("../.env")
    _ = godotenv.Load("../../.env")

    to := flag.String("to", "", "Recipient email address")
    subject := flag.String("subject", "HR Portal Test Email", "Email subject")
    body := flag.String("body", "This is a test email from HR Portal.", "Email body")
    flag.Parse()

    if *to == "" {
        log.Fatal("missing --to recipient email")
    }

    smtpHost := os.Getenv("SMTP_HOST")
    smtpPort := os.Getenv("SMTP_PORT")
    smtpUser := os.Getenv("SMTP_USER")
    smtpPass := os.Getenv("SMTP_PASS")
    fromEmail := os.Getenv("FROM_EMAIL")

    if smtpHost == "" || smtpPort == "" || smtpUser == "" || smtpPass == "" || fromEmail == "" {
        log.Fatal("SMTP env not set. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL in backend/.env")
    }

    msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s", fromEmail, *to, *subject, *body)
    auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)

    if err := smtp.SendMail(smtpHost+":"+smtpPort, auth, fromEmail, []string{*to}, []byte(msg)); err != nil {
        log.Fatalf("failed to send email: %v", err)
    }

    log.Printf("Email sent to %s via %s:%s", *to, smtpHost, smtpPort)
}


