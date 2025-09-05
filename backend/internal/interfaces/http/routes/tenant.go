package routes

import (
	"github.com/gofiber/fiber/v3"
	"github.com/widia/widia-connect/internal/application"
	"github.com/widia/widia-connect/internal/infrastructure/repository"
	"github.com/widia/widia-connect/internal/interfaces/http/middleware"
	"gorm.io/gorm"
)

func SetupTenantRoutes(router fiber.Router, db *gorm.DB) {
	// Initialize repositories and services
	tenantRepo := repository.NewTenantRepository(db)
	userRepo := repository.NewUserRepository(db)
	tenantService := application.NewTenantService(db, tenantRepo, userRepo)
	
	// All tenant routes require authentication
	tenant := router.Group("/tenant", middleware.AuthMiddleware(db))
	
	// Get current tenant information
	tenant.Get("/", func(c fiber.Ctx) error {
		tenantID, err := middleware.GetTenantID(c)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Tenant ID not found",
			})
		}
		
		tenantData, err := tenantService.GetTenant(tenantID)
		if err != nil {
			if err == application.ErrTenantNotFound {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
					"error": "Tenant not found",
				})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to get tenant",
			})
		}
		
		return c.JSON(tenantData)
	})
	
	// Admin-only routes group
	adminTenant := tenant.Group("/")
	adminTenant.Use(middleware.RequireAdmin())
	
	// Update tenant (admin only)
	adminTenant.Patch("/", func(c fiber.Ctx) error {
		tenantID, err := middleware.GetTenantID(c)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Tenant ID not found",
			})
		}
		
		var updates map[string]interface{}
		if err := c.Bind().JSON(&updates); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request body",
			})
		}
		
		// Remove protected fields
		delete(updates, "id")
		delete(updates, "slug")
		delete(updates, "created_at")
		delete(updates, "updated_at")
		delete(updates, "deleted_at")
		
		updatedTenant, err := tenantService.UpdateTenant(tenantID, updates)
		if err != nil {
			switch err {
			case application.ErrTenantNotFound:
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
					"error": "Tenant not found",
				})
			case application.ErrInvalidDomain:
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Invalid domain format",
				})
			case application.ErrTenantDomainExists:
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{
					"error": "Domain already exists",
				})
			default:
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": err.Error(),
				})
			}
		}
		
		return c.JSON(updatedTenant)
	})
	
	// Get tenant statistics (admin only)
	adminTenant.Get("/stats", func(c fiber.Ctx) error {
		tenantID, err := middleware.GetTenantID(c)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Tenant ID not found",
			})
		}
		
		stats, err := tenantService.GetTenantStats(tenantID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to get tenant statistics",
			})
		}
		
		return c.JSON(stats)
	})
}