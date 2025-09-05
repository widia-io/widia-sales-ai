package domain

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Tenant struct {
	ID                 uuid.UUID      `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Slug               string         `json:"slug" gorm:"type:varchar(63);unique;not null"`
	Name               string         `json:"name" gorm:"type:varchar(255);not null"`
	Domain             *string        `json:"domain" gorm:"type:varchar(255)"`
	Settings           JSON           `json:"settings" gorm:"type:jsonb;default:'{}'"`
	SubscriptionStatus string         `json:"subscription_status" gorm:"type:varchar(50);default:'trial'"`
	SubscriptionEndsAt *time.Time     `json:"subscription_ends_at"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
	DeletedAt          gorm.DeletedAt `json:"-" gorm:"index"`
}

type TenantRepository interface {
	Create(tenant *Tenant) error
	FindByID(id uuid.UUID) (*Tenant, error)
	FindBySlug(slug string) (*Tenant, error)
	FindByDomain(domain string) (*Tenant, error)
	Update(tenant *Tenant) error
	Delete(id uuid.UUID) error
	List(limit, offset int) ([]*Tenant, error)
	Count() (int64, error)
	ExistsBySlug(slug string) (bool, error)
	ExistsByDomain(domain string) (bool, error)
}

type TenantService interface {
	CreateTenant(name, slug string) (*Tenant, error)
	GetTenant(id uuid.UUID) (*Tenant, error)
	GetTenantBySlug(slug string) (*Tenant, error)
	UpdateTenant(id uuid.UUID, updates map[string]interface{}) (*Tenant, error)
	DeleteTenant(id uuid.UUID) error
}

// JSON type for JSONB fields
type JSON map[string]interface{}

// Scan implements the sql.Scanner interface
func (j *JSON) Scan(value interface{}) error {
	if value == nil {
		*j = make(map[string]interface{})
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into JSON", value)
	}
	
	return json.Unmarshal(bytes, j)
}

// Value implements the driver.Valuer interface
func (j JSON) Value() (driver.Value, error) {
	if j == nil {
		return "{}", nil
	}
	return json.Marshal(j)
}