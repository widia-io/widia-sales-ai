package repository

import (
	"github.com/google/uuid"
	"github.com/widia/widia-connect/internal/domain"
	"gorm.io/gorm"
)

type TenantRepository struct {
	db *gorm.DB
}

func NewTenantRepository(db *gorm.DB) domain.TenantRepository {
	return &TenantRepository{db: db}
}

func (r *TenantRepository) Create(tenant *domain.Tenant) error {
	return r.db.Create(tenant).Error
}

func (r *TenantRepository) FindByID(id uuid.UUID) (*domain.Tenant, error) {
	var tenant domain.Tenant
	err := r.db.Where("id = ?", id).First(&tenant).Error
	if err != nil {
		return nil, err
	}
	return &tenant, nil
}

func (r *TenantRepository) FindBySlug(slug string) (*domain.Tenant, error) {
	var tenant domain.Tenant
	err := r.db.Where("slug = ?", slug).First(&tenant).Error
	if err != nil {
		return nil, err
	}
	return &tenant, nil
}

func (r *TenantRepository) FindByDomain(domainName string) (*domain.Tenant, error) {
	var tenant domain.Tenant
	err := r.db.Where("domain = ?", domainName).First(&tenant).Error
	if err != nil {
		return nil, err
	}
	return &tenant, nil
}

func (r *TenantRepository) Update(tenant *domain.Tenant) error {
	return r.db.Save(tenant).Error
}

func (r *TenantRepository) Delete(id uuid.UUID) error {
	// Soft delete using GORM
	return r.db.Delete(&domain.Tenant{}, "id = ?", id).Error
}

func (r *TenantRepository) List(limit, offset int) ([]*domain.Tenant, error) {
	var tenants []*domain.Tenant
	err := r.db.Limit(limit).Offset(offset).Find(&tenants).Error
	return tenants, err
}

func (r *TenantRepository) Count() (int64, error) {
	var count int64
	err := r.db.Model(&domain.Tenant{}).Count(&count).Error
	return count, err
}

func (r *TenantRepository) ExistsBySlug(slug string) (bool, error) {
	var count int64
	err := r.db.Model(&domain.Tenant{}).Where("slug = ?", slug).Count(&count).Error
	return count > 0, err
}

func (r *TenantRepository) ExistsByDomain(domainName string) (bool, error) {
	var count int64
	err := r.db.Model(&domain.Tenant{}).Where("domain = ?", domainName).Count(&count).Error
	return count > 0, err
}