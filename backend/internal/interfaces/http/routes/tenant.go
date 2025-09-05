package routes

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/widia/sales-ai/internal/domain"
	"gorm.io/gorm"
)

func SetupTenantRoutes(router fiber.Router, db *gorm.DB) {
	tenant := router.Group("/tenant")
	
	// Get current tenant
	tenant.Get("/", func(c fiber.Ctx) error {
		tenantID := c.Locals("tenant_id").(uuid.UUID)
		
		var tenant domain.Tenant
		if err := db.First(&tenant, tenantID).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Tenant not found",
			})
		}
		
		return c.JSON(tenant)
	})
	
	// Update tenant
	tenant.Patch("/", func(c fiber.Ctx) error {
		tenantID := c.Locals("tenant_id").(uuid.UUID)
		role := c.Locals("role").(string)
		
		// Only admins can update tenant
		if role != "admin" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Insufficient permissions",
			})
		}
		
		var updates map[string]interface{}
		if err := c.Bind().JSON(&updates); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request",
			})
		}
		
		// Remove protected fields
		delete(updates, "id")
		delete(updates, "slug")
		delete(updates, "created_at")
		
		if err := db.Model(&domain.Tenant{}).Where("id = ?", tenantID).Updates(updates).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to update tenant",
			})
		}
		
		var tenant domain.Tenant
		db.First(&tenant, tenantID)
		
		return c.JSON(tenant)
	})
}