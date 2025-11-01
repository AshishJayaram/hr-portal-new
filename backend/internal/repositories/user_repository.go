package repositories

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"hr-portal-backend/internal/models"

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
	r.invalidateCache(fmt.Sprintf("user:%d", user.ID))

	return nil
}

func (r *userRepository) GetByID(id string) (*models.User, error) {
	// Try cache first
	if r.rdb != nil {
		cacheKey := r.getCacheKey("user", id)
		ctx := context.Background()

		_, err := r.rdb.Get(ctx, cacheKey).Result()
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
	// Convert string to uint for organization ID
	orgID, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	if err := r.db.Where("username = ? AND organization_id = ?", username, uint(orgID)).
		First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user by username: %w", err)
	}

	return &user, nil
}

// GetByEmailAcrossOrgs finds a user by email across all organizations
func (r *userRepository) GetByEmailAcrossOrgs(email string) (*models.User, error) {
	var user models.User
	if err := r.db.Where("email = ?", email).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}
	return &user, nil
}

// GetByUsernameAcrossOrgs finds a user by username across all organizations
func (r *userRepository) GetByUsernameAcrossOrgs(username string) (*models.User, error) {
	var user models.User

	if err := r.db.Where("username = ?", username).
		Preload("Organization").
		First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user by username: %w", err)
	}

	return &user, nil
}

func (r *userRepository) List(organizationID string, filters map[string]interface{}) ([]models.User, error) {
	// Convert string organizationID to uint for proper comparison
	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	query := r.db.Where("organization_id = ?", uint(orgIDUint))
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
	r.invalidateCache(fmt.Sprintf("user:%d", user.ID))

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
	// Convert string IDs to uint for proper comparison
	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return false, fmt.Errorf("invalid organization ID: %w", err)
	}

	managerIDUint, err := strconv.ParseUint(managerID, 10, 32)
	if err != nil {
		return false, fmt.Errorf("invalid manager ID: %w", err)
	}

	subordinateIDUint, err := strconv.ParseUint(subordinateID, 10, 32)
	if err != nil {
		return false, fmt.Errorf("invalid subordinate ID: %w", err)
	}

	var count int64
	err = r.db.Model(&models.User{}).
		Where("organization_id = ? AND id = ? AND manager_id = ?",
			uint(orgIDUint), uint(subordinateIDUint), uint(managerIDUint)).
		Count(&count).Error

	if err != nil {
		return false, fmt.Errorf("failed to check subordinate relationship: %w", err)
	}

	return count > 0, nil
}

func (r *userRepository) GetSubordinates(organizationID, managerID string) ([]models.User, error) {
	var subordinates []models.User

	// Convert string IDs to uint for proper comparison
	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	managerIDUint, err := strconv.ParseUint(managerID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid manager ID: %w", err)
	}

	if err := r.db.Where("organization_id = ? AND manager_id = ?",
		uint(orgIDUint), uint(managerIDUint)).Find(&subordinates).Error; err != nil {
		return nil, fmt.Errorf("failed to get subordinates: %w", err)
	}

	return subordinates, nil
}

// Count returns the total number of users
func (r *userRepository) Count(count *int64) error {
	return r.db.Model(&models.User{}).Count(count).Error
}

// CountByOrganization returns the total number of users in a specific organization
func (r *userRepository) CountByOrganization(organizationID string, count *int64) error {
	return r.db.Model(&models.User{}).Where("organization_id = ?", organizationID).Count(count).Error
}

// ListAll returns all users across all organizations (for God users)
func (r *userRepository) ListAll() ([]models.User, error) {
	var users []models.User
	err := r.db.Preload("Organization").Find(&users).Error
	return users, err
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

func (r *userRepository) GetAdminByOrganizationID(organizationID string) (*models.User, error) {
	var user models.User
	// Convert string to uint for organization ID
	orgID, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	if err := r.db.Where("organization_id = ? AND role = ?", uint(orgID), "Admin").
		First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("admin user not found")
		}
		return nil, fmt.Errorf("failed to get admin user: %w", err)
	}
	return &user, nil
}

// ReassignManagerAtomic updates a user's manager and optionally transfers their direct reports to the new manager in a single DB transaction
func (r *userRepository) ReassignManagerAtomic(userID string, newManagerID *uint, transferReports bool) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var user models.User
		if err := tx.Clauses().Where("id = ?", userID).First(&user).Error; err != nil {
			return fmt.Errorf("failed to load user: %w", err)
		}

		orgID := user.OrganizationID

		// Validate new manager belongs to same org and is not the user itself
		if newManagerID != nil {
			if *newManagerID == user.ID {
				return fmt.Errorf("an employee cannot be assigned as their own manager")
			}
			var manager models.User
			if err := tx.Where("id = ? AND organization_id = ?", *newManagerID, orgID).First(&manager).Error; err != nil {
				return fmt.Errorf("new manager not found in same organization: %w", err)
			}
		}

		// Set user's new manager
		user.ManagerID = newManagerID
		if err := tx.Save(&user).Error; err != nil {
			return fmt.Errorf("failed to update user's manager: %w", err)
		}

		// Optionally transfer all direct reports to the new manager
		if transferReports {
			// Get direct subordinates (by string id to reuse helper)
			var subs []models.User
			if err := tx.Where("organization_id = ? AND manager_id = ?", orgID, user.ID).Find(&subs).Error; err != nil {
				return fmt.Errorf("failed to fetch subordinates: %w", err)
			}
			for i := range subs {
				subs[i].ManagerID = newManagerID
				if err := tx.Save(&subs[i]).Error; err != nil {
					return fmt.Errorf("failed to transfer subordinate %d: %w", subs[i].ID, err)
				}
			}
		}

		return nil
	})
}
