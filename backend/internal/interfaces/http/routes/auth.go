package routes

import (
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/widia/widia-connect/internal/domain"
	"github.com/widia/widia-connect/internal/interfaces/http/middleware"
	"gorm.io/gorm"
)

func SetupAuthRoutes(router fiber.Router, db *gorm.DB) {
	auth := router.Group("/auth")
	
	// Register new tenant
	auth.Post("/register", func(c fiber.Ctx) error {
		var req struct {
			TenantName string `json:"tenant_name"`
			TenantSlug string `json:"tenant_slug"`
			Email      string `json:"email"`
			Password   string `json:"password"`
			Name       string `json:"name"`
		}
		
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request",
			})
		}
		
		// Check if tenant slug exists
		var existingTenant domain.Tenant
		if err := db.Where("slug = ?", req.TenantSlug).First(&existingTenant).Error; err == nil {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "Tenant slug already exists",
			})
		}
		
		// Create tenant
		tenant := domain.Tenant{
			Name: req.TenantName,
			Slug: req.TenantSlug,
			Settings: domain.JSON{
				"onboarding_completed": false,
			},
			SubscriptionStatus: "trial",
		}
		
		trialEnd := time.Now().Add(14 * 24 * time.Hour)
		tenant.SubscriptionEndsAt = &trialEnd
		
		if err := db.Create(&tenant).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to create tenant",
			})
		}
		
		// Create admin user
		user := domain.User{
			TenantID: tenant.ID,
			Email:    req.Email,
			Name:     req.Name,
			Role:     "admin",
		}
		
		if err := user.SetPassword(req.Password); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to hash password",
			})
		}
		
		if err := db.Create(&user).Error; err != nil {
			// Rollback tenant creation
			db.Delete(&tenant)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to create user",
			})
		}
		
		// Generate token
		token, err := middleware.GenerateToken(user.ID, tenant.ID, user.Email, user.Role)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to generate token",
			})
		}
		
		return c.JSON(fiber.Map{
			"token":  token,
			"user":   user,
			"tenant": tenant,
		})
	})
	
	// Login
	auth.Post("/login", func(c fiber.Ctx) error {
		var req struct {
			Email      string `json:"email"`
			Password   string `json:"password"`
			TenantSlug string `json:"tenant_slug"`
		}
		
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request",
			})
		}
		
		// Find tenant
		var tenant domain.Tenant
		if err := db.Where("slug = ?", req.TenantSlug).First(&tenant).Error; err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid credentials",
			})
		}
		
		// Find user
		var user domain.User
		if err := db.Where("tenant_id = ? AND email = ?", tenant.ID, req.Email).First(&user).Error; err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid credentials",
			})
		}
		
		// Check password
		if !user.CheckPassword(req.Password) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid credentials",
			})
		}
		
		// Update last login
		now := time.Now()
		user.LastLoginAt = &now
		db.Save(&user)
		
		// Generate token
		token, err := middleware.GenerateToken(user.ID, tenant.ID, user.Email, user.Role)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to generate token",
			})
		}
		
		// Generate refresh token
		refreshToken, err := middleware.GenerateRefreshToken(user.ID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to generate refresh token",
			})
		}
		
		return c.JSON(fiber.Map{
			"token":         token,
			"refresh_token": refreshToken,
			"user":          user,
			"tenant":        tenant,
		})
	})
	
	// Refresh token
	auth.Post("/refresh", func(c fiber.Ctx) error {
		var req struct {
			RefreshToken string `json:"refresh_token"`
		}
		
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request",
			})
		}
		
		// TODO: Validate refresh token and generate new access token
		
		return c.JSON(fiber.Map{
			"message": "Token refresh endpoint - to be implemented",
		})
	})
}