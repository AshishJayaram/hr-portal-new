package middleware

import (
	"net/http"
	"strings"

	"hr-portal-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/sirupsen/logrus"
)

// AuthRequired middleware validates JWT tokens
func AuthRequired(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authorization header required",
			})
			c.Abort()
			return
		}

		// Check if token starts with "Bearer "
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid authorization header format",
			})
			c.Abort()
			return
		}

		// Parse and validate token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Validate signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid or expired token",
			})
			c.Abort()
			return
		}

		// Extract claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid token claims",
			})
			c.Abort()
			return
		}

		// Get user ID and organization ID from claims
		userID, ok := claims["user_id"].(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid user ID in token",
			})
			c.Abort()
			return
		}

		organizationID, ok := claims["organization_id"].(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid organization ID in token",
			})
			c.Abort()
			return
		}

		// Set user context
		c.Set("user_id", userID)
		c.Set("organization_id", organizationID)
		if role, ok := claims["role"].(string); ok {
			c.Set("user_role", role)
		} else {
			c.Set("user_role", "")
		}

		c.Next()
	}
}

// OrganizationRequired middleware validates organization ID from header
func OrganizationRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get organization ID from header
		orgID := c.GetHeader("X-Organization-ID")
		if orgID == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "X-Organization-ID header required",
			})
			c.Abort()
			return
		}

		// Validate organization ID matches token
		tokenOrgID, exists := c.Get("organization_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "User not authenticated",
			})
			c.Abort()
			return
		}

		if orgID != tokenOrgID {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Organization ID mismatch",
			})
			c.Abort()
			return
		}

		c.Set("current_organization_id", orgID)
		c.Next()
	}
}

// RoleRequired middleware validates user role
func RoleRequired(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("user_role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "User not authenticated",
			})
			c.Abort()
			return
		}

		role, ok := userRole.(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid user role",
			})
			c.Abort()
			return
		}

		// Check if user role is in allowed roles
		for _, allowedRole := range allowedRoles {
			if role == allowedRole {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{
			"error": "Insufficient permissions",
		})
		c.Abort()
	}
}

// ManagerOrSelfRequired middleware allows managers to access their subordinates' data
func ManagerOrSelfRequired(userService *services.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "User not authenticated",
			})
			c.Abort()
			return
		}

		userRole, exists := c.Get("user_role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "User not authenticated",
			})
			c.Abort()
			return
		}

		role, ok := userRole.(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid user role",
			})
			c.Abort()
			return
		}

		// HR and Admin can access all users
		if role == "HR" || role == "Admin" {
			c.Next()
			return
		}

		// Get target user ID from URL parameter
		targetUserID := c.Param("id")
		if targetUserID == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "User ID required",
			})
			c.Abort()
			return
		}

		// Users can access their own data
		if userID.(string) == targetUserID {
			c.Next()
			return
		}

		// Managers can access their subordinates
		if role == "Manager" {
			orgID, exists := c.Get("organization_id")
			if !exists {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": "Organization not specified",
				})
				c.Abort()
				return
			}

			// Check if target user is a subordinate
			isSubordinate, err := (*userService).IsSubordinate(orgID.(string), userID.(string), targetUserID)
			if err != nil {
				logrus.Errorf("Error checking subordinate relationship: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "Internal server error",
				})
				c.Abort()
				return
			}

			if isSubordinate {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{
			"error": "Access denied",
		})
		c.Abort()
	}
}

// RateLimit middleware implements basic rate limiting
func RateLimit(requestsPerMinute int) gin.HandlerFunc {
	// This is a simple in-memory rate limiter
	// In production, you'd want to use Redis or a more sophisticated solution
	return func(c *gin.Context) {
		// For now, we'll just pass through
		// TODO: Implement proper rate limiting
		c.Next()
	}
}

// RequestLogger middleware logs HTTP requests
func RequestLogger() gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		logrus.WithFields(logrus.Fields{
			"status":     param.StatusCode,
			"method":     param.Method,
			"path":       param.Path,
			"ip":         param.ClientIP,
			"user_agent": param.Request.UserAgent(),
			"latency":    param.Latency,
			"time":       param.TimeStamp.Format("2006-01-02 15:04:05"),
		}).Info("HTTP Request")
		return ""
	})
}

// ErrorHandler middleware handles panics and errors
func ErrorHandler() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		if err, ok := recovered.(string); ok {
			logrus.Errorf("Panic recovered: %s", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Internal server error",
			})
		}
		c.Abort()
	})
}

// CORSMiddleware handles CORS headers
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, X-Organization-ID")
		c.Header("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// ValidateFileUpload middleware validates file uploads
func ValidateFileUpload(maxSize int64, allowedTypes []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		file, header, err := c.Request.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "File upload required",
			})
			c.Abort()
			return
		}
		defer file.Close()

		// Check file size
		if header.Size > maxSize {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "File size exceeds limit",
			})
			c.Abort()
			return
		}

		// Check file type
		contentType := header.Header.Get("Content-Type")
		allowed := false
		for _, allowedType := range allowedTypes {
			if strings.Contains(contentType, allowedType) {
				allowed = true
				break
			}
		}

		if !allowed {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "File type not allowed",
			})
			c.Abort()
			return
		}

		c.Set("uploaded_file", file)
		c.Set("file_header", header)
		c.Next()
	}
}
