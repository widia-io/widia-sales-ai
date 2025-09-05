package middleware

import (
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// TenantMiddleware extracts tenant from subdomain or header and sets RLS
func TenantMiddleware(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		var tenantID uuid.UUID
		
		// Try to get tenant_id from context (set by auth middleware)
		if tid, ok := c.Locals("tenant_id").(uuid.UUID); ok {
			tenantID = tid
		} else {
			// Try X-Tenant-ID header as fallback
			tenantHeader := c.Get("X-Tenant-ID")
			if tenantHeader != "" {
				tid, err := uuid.Parse(tenantHeader)
				if err != nil {
					return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
						"error": "Invalid tenant ID",
					})
				}
				tenantID = tid
			} else {
				// Try to extract from subdomain
				host := c.Get("Host")
				subdomain := extractSubdomain(host)
				if subdomain != "" && subdomain != "www" && subdomain != "app" {
					// Look up tenant by slug
					var tenant struct {
						ID uuid.UUID
					}
					if err := db.Table("tenants").Where("slug = ?", subdomain).Select("id").First(&tenant).Error; err != nil {
						return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
							"error": "Tenant not found",
						})
					}
					tenantID = tenant.ID
				}
			}
		}
		
		if tenantID == uuid.Nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Tenant identification required",
			})
		}
		
		// Set tenant context for RLS
		if err := setTenantContext(db, tenantID); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to set tenant context",
			})
		}
		
		// Store tenant_id in context
		c.Locals("tenant_id", tenantID)
		
		return c.Next()
	}
}

func setTenantContext(db *gorm.DB, tenantID uuid.UUID) error {
	return db.Exec(fmt.Sprintf("SET LOCAL app.current_tenant = '%s'", tenantID.String())).Error
}

func extractSubdomain(host string) string {
	parts := strings.Split(host, ".")
	if len(parts) >= 3 {
		return parts[0]
	}
	return ""
}