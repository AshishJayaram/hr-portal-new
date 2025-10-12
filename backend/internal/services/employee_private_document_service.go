package services

import (
	"fmt"
	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
	"io"
	"mime/multipart"
	"os"
	"strconv"
	"strings"
	"time"
)

type EmployeePrivateDocumentService interface {
	Upload(userID, organizationID string, title string, fileHeader *multipart.FileHeader) (*models.EmployeePrivateDocument, error)
	ListByUser(userID string) ([]models.EmployeePrivateDocument, error)
	GetByID(id string) (*models.EmployeePrivateDocument, error)
	Delete(id string) error
}

type employeePrivateDocumentService struct {
	repo repositories.EmployeePrivateDocumentRepository
}

func NewEmployeePrivateDocumentService(repo repositories.EmployeePrivateDocumentRepository) EmployeePrivateDocumentService {
	return &employeePrivateDocumentService{repo: repo}
}

func (s *employeePrivateDocumentService) Upload(userID, organizationID string, title string, fileHeader *multipart.FileHeader) (*models.EmployeePrivateDocument, error) {
	if fileHeader == nil {
		return nil, fmt.Errorf("no file provided")
	}
	// Generate filename - sanitize to remove invalid characters
	sanitizeFilename := func(name string) string {
		// Replace spaces and other problematic characters
		name = strings.ReplaceAll(name, " ", "_")
		name = strings.ReplaceAll(name, "/", "_")
		name = strings.ReplaceAll(name, "\\", "_")
		name = strings.ReplaceAll(name, ":", "_")
		name = strings.ReplaceAll(name, "*", "_")
		name = strings.ReplaceAll(name, "?", "_")
		name = strings.ReplaceAll(name, "\"", "_")
		name = strings.ReplaceAll(name, "<", "_")
		name = strings.ReplaceAll(name, ">", "_")
		name = strings.ReplaceAll(name, "|", "_")
		return name
	}
	filename := fmt.Sprintf("%d_%s_%s", time.Now().Unix(), sanitizeFilename(title), sanitizeFilename(fileHeader.Filename))
	uploadDir := "uploads/private_docs"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create upload dir: %w", err)
	}
	dstPath := uploadDir + "/" + filename
	dst, err := os.Create(dstPath)
	if err != nil {
		return nil, fmt.Errorf("failed to create file: %w", err)
	}
	defer dst.Close()
	src, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open upload: %w", err)
	}
	defer src.Close()
	if _, err := io.Copy(dst, src); err != nil {
		return nil, fmt.Errorf("failed to save file: %w", err)
	}
	info, _ := os.Stat(dstPath)
	// Parse IDs
	uid, _ := strconv.ParseUint(userID, 10, 32)
	oid, _ := strconv.ParseUint(organizationID, 10, 32)
	doc := &models.EmployeePrivateDocument{
		UserID: uint(uid), OrganizationID: uint(oid), Title: title,
		FileName: fileHeader.Filename, FilePath: dstPath, FileSize: info.Size(), MimeType: fileHeader.Header.Get("Content-Type"),
	}
	if err := s.repo.Create(doc); err != nil {
		return nil, err
	}
	// Set FileUrl for response
	doc.FileUrl = fmt.Sprintf("/api/files/private-docs/%s", filename)
	return doc, nil
}

func (s *employeePrivateDocumentService) ListByUser(userID string) ([]models.EmployeePrivateDocument, error) {
	docs, err := s.repo.ListByUser(userID)
	if err != nil {
		return nil, err
	}
	// Set FileUrl for each document - extract the actual filename from filepath
	for i := range docs {
		// Extract filename from the full path (uploads/private_docs/filename.ext)
		pathParts := strings.Split(docs[i].FilePath, "/")
		actualFilename := pathParts[len(pathParts)-1]
		docs[i].FileUrl = fmt.Sprintf("/api/files/private-docs/%s", actualFilename)
	}
	return docs, nil
}

func (s *employeePrivateDocumentService) GetByID(id string) (*models.EmployeePrivateDocument, error) {
	doc, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	// Set FileUrl for response - extract the actual filename from filepath
	pathParts := strings.Split(doc.FilePath, "/")
	actualFilename := pathParts[len(pathParts)-1]
	doc.FileUrl = fmt.Sprintf("/api/files/private-docs/%s", actualFilename)
	return doc, nil
}

func (s *employeePrivateDocumentService) Delete(id string) error { return s.repo.Delete(id) }
