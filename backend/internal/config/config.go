package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/spf13/viper"
)

// Config holds all configuration for the application
type Config struct {
	Server     ServerConfig
	Database   DatabaseConfig
	Redis      RedisConfig
	JWT        JWTConfig
	FileUpload FileUploadConfig
	CORS       CORSConfig
	Logging    LoggingConfig
	RateLimit  RateLimitConfig
	Monitoring MonitoringConfig
	Email      EmailConfig
	App        AppConfig
}

// ServerConfig holds server-related configuration
type ServerConfig struct {
	Port    int
	GinMode string
}

// DatabaseConfig holds database-related configuration
type DatabaseConfig struct {
	Host            string
	Port            int
	User            string
	Password        string
	Name            string
	SSLMode         string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

// RedisConfig holds Redis-related configuration
type RedisConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
	PoolSize int
}

// JWTConfig holds JWT-related configuration
type JWTConfig struct {
	Secret           string
	ExpireHours      int
	RefreshExpireHours int
}

// FileUploadConfig holds file upload-related configuration
type FileUploadConfig struct {
	UploadPath        string
	MaxFileSize       int64
	AllowedFileTypes  []string
}

// CORSConfig holds CORS-related configuration
type CORSConfig struct {
	AllowedOrigins []string
	AllowedMethods []string
	AllowedHeaders []string
}

// LoggingConfig holds logging-related configuration
type LoggingConfig struct {
	Level  string
	Format string
}

// RateLimitConfig holds rate limiting configuration
type RateLimitConfig struct {
	Enabled             bool
	RequestsPerMinute   int
}

// MonitoringConfig holds monitoring-related configuration
type MonitoringConfig struct {
	MetricsEnabled bool
	MetricsPort    int
}

// EmailConfig holds email-related configuration
type EmailConfig struct {
	SMTPHost     string
	SMTPPort     int
	SMTPUsername string
	SMTPPassword string
	SMTPFromEmail string
}

// AppConfig holds application-specific configuration
type AppConfig struct {
	DefaultPageSize int
	MaxPageSize     int
	DefaultTimezone string
}

// Load loads configuration from environment variables and config files
func Load() (*Config, error) {
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil {
		// .env file is optional, so we don't fail if it doesn't exist
	}

	// Set up viper
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./config")
	viper.AddConfigPath("/etc/hr-portal")

	// Set defaults
	setDefaults()

	// Read config file (optional)
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, err
		}
	}

	// Bind environment variables
	bindEnvVars()

	// Auto read environment variables
	viper.AutomaticEnv()

	// Build config struct
	config := &Config{
		Server: ServerConfig{
			Port:    viper.GetInt("PORT"),
			GinMode: viper.GetString("GIN_MODE"),
		},
		Database: DatabaseConfig{
			Host:            viper.GetString("DB_HOST"),
			Port:            viper.GetInt("DB_PORT"),
			User:            viper.GetString("DB_USER"),
			Password:        viper.GetString("DB_PASSWORD"),
			Name:            viper.GetString("DB_NAME"),
			SSLMode:         viper.GetString("DB_SSLMODE"),
			MaxOpenConns:    viper.GetInt("DB_MAX_OPEN_CONNS"),
			MaxIdleConns:    viper.GetInt("DB_MAX_IDLE_CONNS"),
			ConnMaxLifetime: viper.GetDuration("DB_CONN_MAX_LIFETIME"),
		},
		Redis: RedisConfig{
			Host:     viper.GetString("REDIS_HOST"),
			Port:     viper.GetInt("REDIS_PORT"),
			Password: viper.GetString("REDIS_PASSWORD"),
			DB:       viper.GetInt("REDIS_DB"),
			PoolSize: viper.GetInt("REDIS_POOL_SIZE"),
		},
		JWT: JWTConfig{
			Secret:             viper.GetString("JWT_SECRET"),
			ExpireHours:        viper.GetInt("JWT_EXPIRE_HOURS"),
			RefreshExpireHours: viper.GetInt("JWT_REFRESH_EXPIRE_HOURS"),
		},
		FileUpload: FileUploadConfig{
			UploadPath:       viper.GetString("UPLOAD_PATH"),
			MaxFileSize:       viper.GetInt64("MAX_FILE_SIZE"),
			AllowedFileTypes:  strings.Split(viper.GetString("ALLOWED_FILE_TYPES"), ","),
		},
		CORS: CORSConfig{
			AllowedOrigins: strings.Split(viper.GetString("CORS_ALLOWED_ORIGINS"), ","),
			AllowedMethods: strings.Split(viper.GetString("CORS_ALLOWED_METHODS"), ","),
			AllowedHeaders: strings.Split(viper.GetString("CORS_ALLOWED_HEADERS"), ","),
		},
		Logging: LoggingConfig{
			Level:  viper.GetString("LOG_LEVEL"),
			Format: viper.GetString("LOG_FORMAT"),
		},
		RateLimit: RateLimitConfig{
			Enabled:           viper.GetBool("RATE_LIMIT_ENABLED"),
			RequestsPerMinute: viper.GetInt("RATE_LIMIT_REQUESTS_PER_MINUTE"),
		},
		Monitoring: MonitoringConfig{
			MetricsEnabled: viper.GetBool("METRICS_ENABLED"),
			MetricsPort:    viper.GetInt("METRICS_PORT"),
		},
		Email: EmailConfig{
			SMTPHost:     viper.GetString("SMTP_HOST"),
			SMTPPort:     viper.GetInt("SMTP_PORT"),
			SMTPUsername: viper.GetString("SMTP_USERNAME"),
			SMTPPassword: viper.GetString("SMTP_PASSWORD"),
			SMTPFromEmail: viper.GetString("SMTP_FROM_EMAIL"),
		},
		App: AppConfig{
			DefaultPageSize: viper.GetInt("DEFAULT_PAGE_SIZE"),
			MaxPageSize:     viper.GetInt("MAX_PAGE_SIZE"),
			DefaultTimezone: viper.GetString("DEFAULT_TIMEZONE"),
		},
	}

	return config, nil
}

func setDefaults() {
	// Server defaults
	viper.SetDefault("PORT", 8080)
	viper.SetDefault("GIN_MODE", "debug")

	// Database defaults
	viper.SetDefault("DB_HOST", "localhost")
	viper.SetDefault("DB_PORT", 5432)
	viper.SetDefault("DB_USER", "hr_portal")
	viper.SetDefault("DB_PASSWORD", "password")
	viper.SetDefault("DB_NAME", "hr_portal")
	viper.SetDefault("DB_SSLMODE", "disable")
	viper.SetDefault("DB_MAX_OPEN_CONNS", 25)
	viper.SetDefault("DB_MAX_IDLE_CONNS", 25)
	viper.SetDefault("DB_CONN_MAX_LIFETIME", "5m")

	// Redis defaults
	viper.SetDefault("REDIS_HOST", "localhost")
	viper.SetDefault("REDIS_PORT", 6379)
	viper.SetDefault("REDIS_PASSWORD", "")
	viper.SetDefault("REDIS_DB", 0)
	viper.SetDefault("REDIS_POOL_SIZE", 10)

	// JWT defaults
	viper.SetDefault("JWT_SECRET", "your-super-secret-jwt-key")
	viper.SetDefault("JWT_EXPIRE_HOURS", 24)
	viper.SetDefault("JWT_REFRESH_EXPIRE_HOURS", 168)

	// File upload defaults
	viper.SetDefault("UPLOAD_PATH", "./uploads")
	viper.SetDefault("MAX_FILE_SIZE", 10485760) // 10MB
	viper.SetDefault("ALLOWED_FILE_TYPES", "pdf,doc,docx,xls,xlsx,jpg,jpeg,png")

	// CORS defaults
	viper.SetDefault("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001")
	viper.SetDefault("CORS_ALLOWED_METHODS", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
	viper.SetDefault("CORS_ALLOWED_HEADERS", "Origin,Content-Type,Accept,Authorization,X-Requested-With,X-Organization-ID")

	// Logging defaults
	viper.SetDefault("LOG_LEVEL", "info")
	viper.SetDefault("LOG_FORMAT", "json")

	// Rate limiting defaults
	viper.SetDefault("RATE_LIMIT_ENABLED", true)
	viper.SetDefault("RATE_LIMIT_REQUESTS_PER_MINUTE", 100)

	// Monitoring defaults
	viper.SetDefault("METRICS_ENABLED", true)
	viper.SetDefault("METRICS_PORT", 9090)

	// Email defaults
	viper.SetDefault("SMTP_PORT", 587)

	// App defaults
	viper.SetDefault("DEFAULT_PAGE_SIZE", 20)
	viper.SetDefault("MAX_PAGE_SIZE", 100)
	viper.SetDefault("DEFAULT_TIMEZONE", "UTC")
}

func bindEnvVars() {
	// Server
	viper.BindEnv("PORT")
	viper.BindEnv("GIN_MODE")

	// Database
	viper.BindEnv("DB_HOST")
	viper.BindEnv("DB_PORT")
	viper.BindEnv("DB_USER")
	viper.BindEnv("DB_PASSWORD")
	viper.BindEnv("DB_NAME")
	viper.BindEnv("DB_SSLMODE")
	viper.BindEnv("DB_MAX_OPEN_CONNS")
	viper.BindEnv("DB_MAX_IDLE_CONNS")
	viper.BindEnv("DB_CONN_MAX_LIFETIME")

	// Redis
	viper.BindEnv("REDIS_HOST")
	viper.BindEnv("REDIS_PORT")
	viper.BindEnv("REDIS_PASSWORD")
	viper.BindEnv("REDIS_DB")
	viper.BindEnv("REDIS_POOL_SIZE")

	// JWT
	viper.BindEnv("JWT_SECRET")
	viper.BindEnv("JWT_EXPIRE_HOURS")
	viper.BindEnv("JWT_REFRESH_EXPIRE_HOURS")

	// File upload
	viper.BindEnv("UPLOAD_PATH")
	viper.BindEnv("MAX_FILE_SIZE")
	viper.BindEnv("ALLOWED_FILE_TYPES")

	// CORS
	viper.BindEnv("CORS_ALLOWED_ORIGINS")
	viper.BindEnv("CORS_ALLOWED_METHODS")
	viper.BindEnv("CORS_ALLOWED_HEADERS")

	// Logging
	viper.BindEnv("LOG_LEVEL")
	viper.BindEnv("LOG_FORMAT")

	// Rate limiting
	viper.BindEnv("RATE_LIMIT_ENABLED")
	viper.BindEnv("RATE_LIMIT_REQUESTS_PER_MINUTE")

	// Monitoring
	viper.BindEnv("METRICS_ENABLED")
	viper.BindEnv("METRICS_PORT")

	// Email
	viper.BindEnv("SMTP_HOST")
	viper.BindEnv("SMTP_PORT")
	viper.BindEnv("SMTP_USERNAME")
	viper.BindEnv("SMTP_PASSWORD")
	viper.BindEnv("SMTP_FROM_EMAIL")

	// App
	viper.BindEnv("DEFAULT_PAGE_SIZE")
	viper.BindEnv("MAX_PAGE_SIZE")
	viper.BindEnv("DEFAULT_TIMEZONE")
}

// GetDSN returns the database connection string
func (c *DatabaseConfig) GetDSN() string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.User, c.Password, c.Name, c.SSLMode)
}

// IsProduction returns true if the application is running in production mode
func (c *ServerConfig) IsProduction() bool {
	return c.GinMode == "release"
}

// GetRedisAddr returns the Redis connection address
func (c *RedisConfig) GetRedisAddr() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}
