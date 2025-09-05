package routes

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/widia/sales-ai/internal/domain"
	"gorm.io/gorm"
)

func SetupUserRoutes(router fiber.Router, db *gorm.DB) {
	users := router.Group("/users")
	
	// List tenant users
	users.Get("/", func(c fiber.Ctx) error {
		tenantID := c.Locals("tenant_id").(uuid.UUID)
		
		var users []domain.User
		if err := db.Where("tenant_id = ?", tenantID).Find(&users).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to fetch users",
			})
		}
		
		return c.JSON(users)
	})
	
	// Create user
	users.Post("/", func(c fiber.Ctx) error {
		tenantID := c.Locals("tenant_id").(uuid.UUID)
		role := c.Locals("role").(string)
		
		// Only admins can create users
		if role != "admin" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Insufficient permissions",
			})
		}
		
		var req struct {
			Email    string `json:"email"`
			Password string `json:"password"`
			Name     string `json:"name"`
			Role     string `json:"role"`
		}
		
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request",
			})
		}
		
		// Check if user exists
		var existingUser domain.User
		if err := db.Where("tenant_id = ? AND email = ?", tenantID, req.Email).First(&existingUser).Error; err == nil {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "User already exists",
			})
		}
		
		user := domain.User{
			TenantID: tenantID,
			Email:    req.Email,
			Name:     req.Name,
			Role:     req.Role,
		}
		
		if err := user.SetPassword(req.Password); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to hash password",
			})
		}
		
		if err := db.Create(&user).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to create user",
			})
		}
		
		return c.Status(fiber.StatusCreated).JSON(user)
	})
	
	// Get current user profile
	router.Get("/profile", func(c fiber.Ctx) error {
		userID := c.Locals("user_id").(uuid.UUID)
		
		var user domain.User
		if err := db.Preload("Tenant").First(&user, userID).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "User not found",
			})
		}
		
		return c.JSON(user)
	})
	
	// Update current user profile
	router.Patch("/profile", func(c fiber.Ctx) error {
		userID := c.Locals("user_id").(uuid.UUID)
		
		var updates map[string]interface{}
		if err := c.Bind().JSON(&updates); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request",
			})
		}
		
		// Remove protected fields
		delete(updates, "id")
		delete(updates, "tenant_id")
		delete(updates, "email")
		delete(updates, "role")
		delete(updates, "created_at")
		
		// Handle password update
		if password, ok := updates["password"].(string); ok {
			var user domain.User
			if err := db.First(&user, userID).Error; err != nil {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
					"error": "User not found",
				})
			}
			
			if err := user.SetPassword(password); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Failed to hash password",
				})
			}
			
			updates["password_hash"] = user.PasswordHash
			delete(updates, "password")
		}
		
		if err := db.Model(&domain.User{}).Where("id = ?", userID).Updates(updates).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to update profile",
			})
		}
		
		var user domain.User
		db.First(&user, userID)
		
		return c.JSON(user)
	})
}