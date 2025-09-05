package domain

import (
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type User struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	TenantID    uuid.UUID      `json:"tenant_id" gorm:"type:uuid;not null"`
	Email       string         `json:"email" gorm:"type:varchar(255);not null"`
	PasswordHash string        `json:"-" gorm:"type:varchar(255);not null"`
	Name        string         `json:"name" gorm:"type:varchar(255)"`
	Role        string         `json:"role" gorm:"type:varchar(50);not null;default:'agent'"`
	IsActive    bool           `json:"is_active" gorm:"default:true"`
	LastLoginAt *time.Time     `json:"last_login_at"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
	
	// Relations
	Tenant      Tenant         `json:"tenant,omitempty" gorm:"foreignKey:TenantID"`
}

func (u *User) SetPassword(password string) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.PasswordHash = string(hashedPassword)
	return nil
}

func (u *User) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password))
	return err == nil
}

type UserRepository interface {
	Create(user *User) error
	FindByID(id uuid.UUID) (*User, error)
	FindByEmail(tenantID uuid.UUID, email string) (*User, error)
	FindAllByTenant(tenantID uuid.UUID) ([]User, error)
	Update(user *User) error
	Delete(id uuid.UUID) error
	UpdateLastLogin(id uuid.UUID) error
}

type UserService interface {
	CreateUser(tenantID uuid.UUID, email, password, name, role string) (*User, error)
	GetUser(id uuid.UUID) (*User, error)
	GetUserByEmail(tenantID uuid.UUID, email string) (*User, error)
	GetTenantUsers(tenantID uuid.UUID) ([]User, error)
	UpdateUser(id uuid.UUID, updates map[string]interface{}) (*User, error)
	DeleteUser(id uuid.UUID) error
	ValidateCredentials(tenantID uuid.UUID, email, password string) (*User, error)
}