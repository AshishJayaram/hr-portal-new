package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"
	"os"
)

var encryptionKey []byte

func init() {
	// Get encryption key from environment variable or use default
	key := os.Getenv("ENCRYPTION_KEY")
	if key == "" {
		// Default key for development - in production, this should be set via environment variable
		key = "hr-portal-encryption-key-32-bytes-long!"
	}

	// Ensure key is exactly 32 bytes for AES-256
	if len(key) < 32 {
		// Pad with zeros if too short
		for len(key) < 32 {
			key += "0"
		}
	} else if len(key) > 32 {
		// Truncate if too long
		key = key[:32]
	}

	encryptionKey = []byte(key)
}

// EncryptString encrypts a string using AES-256-GCM
func EncryptString(plaintext string) (string, error) {
	if plaintext == "" {
		return "", nil
	}

	block, err := aes.NewCipher(encryptionKey)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// DecryptString decrypts a string using AES-256-GCM
func DecryptString(ciphertext string) (string, error) {
	if ciphertext == "" {
		return "", nil
	}

	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", fmt.Errorf("failed to decode base64: %w", err)
	}

	block, err := aes.NewCipher(encryptionKey)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertextBytes := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertextBytes, nil)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt: %w", err)
	}

	return string(plaintext), nil
}

// EncryptFloat64 encrypts a float64 value by converting it to string first
func EncryptFloat64(value float64) (string, error) {
	if value == 0 {
		return "", nil
	}
	return EncryptString(fmt.Sprintf("%.2f", value))
}

// DecryptFloat64 decrypts a string back to float64
func DecryptFloat64(encryptedValue string) (float64, error) {
	if encryptedValue == "" {
		return 0, nil
	}

	decrypted, err := DecryptString(encryptedValue)
	if err != nil {
		return 0, err
	}

	var value float64
	_, err = fmt.Sscanf(decrypted, "%f", &value)
	if err != nil {
		return 0, fmt.Errorf("failed to parse decrypted value: %w", err)
	}

	return value, nil
}
