package services

import (
	"fmt"
	"strconv"
	"time"

	"hr-portal-backend/internal/models"

	"github.com/jung-kurt/gofpdf/v2"
)

type PayslipPDFService interface {
	GeneratePayslipPDF(salarySlip *models.SalarySlip, user *models.User, companySettings *models.CompanySettings) ([]byte, error)
}

type payslipPDFService struct {
	uploadDir string
}

func NewPayslipPDFService(uploadDir string) PayslipPDFService {
	return &payslipPDFService{
		uploadDir: uploadDir,
	}
}

func (s *payslipPDFService) GeneratePayslipPDF(salarySlip *models.SalarySlip, user *models.User, companySettings *models.CompanySettings) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")

	// Set margins
	pdf.SetMargins(20, 20, 20)
	pdf.SetAutoPageBreak(true, 20)

	// Company header
	s.addCompanyHeader(pdf, companySettings, salarySlip)

	// Payslip title
	pdf.Ln(10)
	pdf.SetFont("Arial", "B", 18)
	pdf.Cell(0, 10, "PAYSLIP")
	pdf.Ln(15)

	// Employee information
	s.addEmployeeInfo(pdf, user, salarySlip)

	// Use CTC from user if available, otherwise use a default value
	ctc := user.CTC
	if ctc == 0 {
		ctc = 600000 // Default CTC if not set
	}

	// Earnings section
	basicSalary := ctc * 0.4 // Assuming 40% of CTC is basic
	hra := basicSalary * 0.5
	medical := 1250.0
	conveyance := 1600.0
	special := ctc - basicSalary - hra - medical - conveyance
	totalEarnings := basicSalary + hra + medical + conveyance + special

	s.addEarningsSection(pdf, basicSalary, hra, medical, conveyance, special, totalEarnings)

	// Deductions section
	s.addDeductionsSection(pdf, basicSalary, ctc, salarySlip)

	// Net pay section
	s.addNetPaySection(pdf, totalEarnings, basicSalary, ctc, salarySlip)

	// Footer with signatures
	s.addSignaturesSection(pdf)

	// Generate PDF bytes
	var buf []byte
	bufWriter := &ByteBuffer{}
	pdf.Output(bufWriter)
	buf = bufWriter.Bytes()

	return buf, nil
}

func (s *payslipPDFService) addCompanyHeader(pdf *gofpdf.Fpdf, companySettings *models.CompanySettings, salarySlip *models.SalarySlip) {
	// Company logo placeholder (left side)
	pdf.SetXY(20, 20)
	pdf.SetFont("Arial", "B", 14)
	pdf.Cell(0, 8, "HR PORTAL")
	pdf.Ln(6)

	// Company details (right side)
	pdf.SetXY(120, 20)
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(0, 5, "Pay Period: "+s.formatMonth(salarySlip.Month, salarySlip.Year))
	pdf.Ln(5)
	pdf.Cell(0, 5, "Payslip Date: "+time.Now().Format("2006-01-02"))
}

func (s *payslipPDFService) addEmployeeInfo(pdf *gofpdf.Fpdf, user *models.User, salarySlip *models.SalarySlip) {
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(0, 8, "Employee Information")
	pdf.Ln(10)

	pdf.SetFont("Arial", "", 10)
	pdf.Cell(40, 6, "Employee ID:")
	pdf.Cell(0, 6, strconv.FormatUint(uint64(user.ID), 10))
	pdf.Ln(6)

	pdf.Cell(40, 6, "Name:")
	pdf.Cell(0, 6, user.Name)
	pdf.Ln(6)

	pdf.Cell(40, 6, "Department:")
	pdf.Cell(0, 6, user.Department)
	pdf.Ln(6)

	pdf.Cell(40, 6, "Designation:")
	pdf.Cell(0, 6, user.Designation)
	pdf.Ln(10)
}

func (s *payslipPDFService) addEarningsSection(pdf *gofpdf.Fpdf, basicSalary, hra, medical, conveyance, special, totalEarnings float64) {
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(0, 8, "Earnings")
	pdf.Ln(8)

	pdf.SetFont("Arial", "", 10)
	pdf.SetFillColor(240, 240, 240)

	// Header
	pdf.Cell(80, 8, "Component")
	pdf.Cell(40, 8, "Amount")
	pdf.Ln(8)

	// Basic Salary
	pdf.Cell(80, 6, "Basic Salary")
	pdf.Cell(40, 6, s.formatCurrency(basicSalary))
	pdf.Ln(6)

	// HRA (50% of Basic)
	pdf.Cell(80, 6, "HRA")
	pdf.Cell(40, 6, s.formatCurrency(hra))
	pdf.Ln(6)

	// Medical Allowance
	pdf.Cell(80, 6, "Medical Allowance")
	pdf.Cell(40, 6, s.formatCurrency(medical))
	pdf.Ln(6)

	// Conveyance Allowance
	pdf.Cell(80, 6, "Conveyance Allowance")
	pdf.Cell(40, 6, s.formatCurrency(conveyance))
	pdf.Ln(6)

	// Special Allowance
	pdf.Cell(80, 6, "Special Allowance")
	pdf.Cell(40, 6, s.formatCurrency(special))
	pdf.Ln(8)

	// Total Earnings
	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(80, 6, "Total Earnings")
	pdf.Cell(40, 6, s.formatCurrency(totalEarnings))
	pdf.Ln(12)
}

func (s *payslipPDFService) addDeductionsSection(pdf *gofpdf.Fpdf, basicSalary, ctc float64, salarySlip *models.SalarySlip) {
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(0, 8, "Deductions")
	pdf.Ln(8)

	pdf.SetFont("Arial", "", 10)
	pdf.SetFillColor(240, 240, 240)

	// Header
	pdf.Cell(80, 8, "Component")
	pdf.Cell(40, 8, "Amount")
	pdf.Ln(8)

	// PF (12% of Basic)
	pf := basicSalary * 0.12
	pdf.Cell(80, 6, "PF")
	pdf.Cell(40, 6, s.formatCurrency(pf))
	pdf.Ln(6)

	// Professional Tax
	professionalTax := 200.0
	pdf.Cell(80, 6, "Professional Tax")
	pdf.Cell(40, 6, s.formatCurrency(professionalTax))
	pdf.Ln(6)

	// ESI (0.75% of CTC)
	esi := ctc * 0.0075
	pdf.Cell(80, 6, "ESI")
	pdf.Cell(40, 6, s.formatCurrency(esi))
	pdf.Ln(6)

	// LOP Amount
	lopAmount := salarySlip.LOPAmount
	pdf.Cell(80, 6, "Loss of Pay (LOP)")
	pdf.Cell(40, 6, s.formatCurrency(lopAmount))
	pdf.Ln(8)

	// Total Deductions
	totalDeductions := pf + professionalTax + esi + lopAmount
	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(80, 6, "Total Deductions")
	pdf.Cell(40, 6, s.formatCurrency(totalDeductions))
	pdf.Ln(12)
}

func (s *payslipPDFService) addNetPaySection(pdf *gofpdf.Fpdf, totalEarnings, basicSalary, ctc float64, salarySlip *models.SalarySlip) {
	pf := basicSalary * 0.12
	professionalTax := 200.0
	esi := ctc * 0.0075
	totalDeductions := pf + professionalTax + esi + salarySlip.LOPAmount

	netPay := totalEarnings - totalDeductions

	pdf.SetFont("Arial", "B", 14)
	pdf.Cell(0, 10, "Net Pay: "+s.formatCurrency(netPay))
	pdf.Ln(15)
}

func (s *payslipPDFService) addSignaturesSection(pdf *gofpdf.Fpdf) {
	// Employee signature
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(80, 20, "Employee Signature:")
	pdf.Ln(25)

	// HR/Admin signature
	pdf.SetXY(120, pdf.GetY()-25)
	pdf.Cell(80, 20, "HR/Admin Signature:")
	pdf.Ln(25)

	// Generated date
	pdf.SetFont("Arial", "I", 8)
	pdf.Cell(0, 5, "Generated on: "+time.Now().Format("2006-01-02 15:04:05"))
}

func (s *payslipPDFService) formatCurrency(amount float64) string {
	return "₹" + strconv.FormatFloat(amount, 'f', 2, 64)
}

func (s *payslipPDFService) formatMonth(month, year int) string {
	months := []string{
		"January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December",
	}
	if month >= 1 && month <= 12 {
		return fmt.Sprintf("%s %d", months[month-1], year)
	}
	return fmt.Sprintf("%d/%d", month, year)
}

// ByteBuffer implements io.Writer for PDF output
type ByteBuffer struct {
	data []byte
}

func (b *ByteBuffer) Write(p []byte) (n int, err error) {
	b.data = append(b.data, p...)
	return len(p), nil
}

func (b *ByteBuffer) Bytes() []byte {
	return b.data
}
