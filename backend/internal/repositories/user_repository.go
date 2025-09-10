package repositories

import (
	"context"
	"fmt"
	"time"

	"hr-portal-backend/internal/models"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// userRepository implements UserRepository interface
type userRepository struct {
	*BaseRepository
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *gorm.DB, rdb *redis.Client) UserRepository {
	return &userRepository{
		BaseRepository: NewBaseRepository(db, rdb),
	}
}

func (r *userRepository) Create(user *models.User) error {
	if err := r.db.Create(user).Error; err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}
	
	// Invalidate cache
	r.invalidateCache("users:*")
	r.invalidateCache(fmt.Sprintf("user:%s", user.ID))
	
	return nil
}

func (r *userRepository) GetByID(id string) (*models.User, error) {
	// Try cache first
	if r.rdb != nil {
		cacheKey := r.getCacheKey("user", id)
		ctx := context.Background()
		
		cached, err := r.rdb.Get(ctx, cacheKey).Result()
		if err == nil {
			// TODO: Implement JSON unmarshaling from cache
			// For now, we'll skip cache and go to database
		}
	}

	var user models.User
	if err := r.db.Preload("Organization").Preload("Manager").Preload("Subordinates").
		Where("id = ?", id).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Cache the result
	if r.rdb != nil {
		cacheKey := r.getCacheKey("user", id)
		ctx := context.Background()
		// TODO: Implement JSON marshaling to cache
		// For now, we'll skip caching
		_ = cacheKey
		_ = ctx
	}

	return &user, nil
}

func (r *userRepository) GetByEmail(email, organizationID string) (*models.User, error) {
	var user models.User
	if err := r.db.Where("email = ? AND organization_id = ?", email, organizationID).
		First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}
	return &user, nil
}

func (r *userRepository) GetByUsername(username, organizationID string) (*models.User, error) {
	var user models.User
	if err := r.db.Where("username = ? AND organization_id = ?", username, organizationID).
		First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user by username: %w", err)
	}
	return &user, nil
}

func (r *userRepository) List(organizationID string, filters map[string]interface{}) ([]models.User, error) {
	query := r.db.Where("organization_id = ?", organizationID)
	query = r.buildQuery(query, filters)

	var users []models.User
	if err := query.Preload("Organization").Preload("Manager").
		Find(&users).Error; err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}

	return users, nil
}

func (r *userRepository) Update(user *models.User) error {
	if err := r.db.Save(user).Error; err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	// Invalidate cache
	r.invalidateCache("users:*")
	r.invalidateCache(fmt.Sprintf("user:%s", user.ID))

	return nil
}

func (r *userRepository) Delete(id string) error {
	if err := r.db.Delete(&models.User{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	// Invalidate cache
	r.invalidateCache("users:*")
	r.invalidateCache(fmt.Sprintf("user:%s", id))

	return nil
}

func (r *userRepository) IsSubordinate(organizationID, managerID, subordinateID string) (bool, error) {
	var count int64
	err := r.db.Model(&models.User{}).
		Where("organization_id = ? AND id = ? AND manager_id = ?", 
			organizationID, subordinateID, managerID).
		Count(&count).Error
	
	if err != nil {
		return false, fmt.Errorf("failed to check subordinate relationship: %w", err)
	}

	return count > 0, nil
}

func (r *userRepository) GetSubordinates(organizationID, managerID string) ([]models.User, error) {
	var subordinates []models.User
	if err := r.db.Where("organization_id = ? AND manager_id = ?", 
		organizationID, managerID).Find(&subordinates).Error; err != nil {
		return nil, fmt.Errorf("failed to get subordinates: %w", err)
	}

	return subordinates, nil
}

func (r *userRepository) UpdateLastLogin(id string) error {
	now := time.Now()
	if err := r.db.Model(&models.User{}).
		Where("id = ?", id).
		Update("last_login_at", now).Error; err != nil {
		return fmt.Errorf("failed to update last login: %w", err)
	}

	// Invalidate cache
	r.invalidateCache(fmt.Sprintf("user:%s", id))

	return nil
}
