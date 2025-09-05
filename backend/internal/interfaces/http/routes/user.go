package routes

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/widia/widia-connect/internal/application"
	"github.com/widia/widia-connect/internal/infrastructure/repository"
	"github.com/widia/widia-connect/internal/interfaces/http/middleware"
	"gorm.io/gorm"
)

func SetupUserRoutes(router fiber.Router, db *gorm.DB) {
	// Initialize repositories and services
	userRepo := repository.NewUserRepository(db)
	userService := application.NewUserService(db, userRepo)
	
	// User management routes (require authentication)
	users := router.Group("/tenant/users", middleware.AuthMiddleware(db))
	
	// Admin-only user management routes
	adminUsers := users.Group("/")
	adminUsers.Use(middleware.RequireAdmin())
	
	// List all users in tenant
	users.Get("/", func(c fiber.Ctx) error {
		tenantID, err := middleware.GetTenantID(c)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Tenant ID not found",
			})
		}
		
		usersList, err := userService.ListTenantUsers(tenantID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to list users",
			})
		}
		
		// Remove password hashes from response
		for _, user := range usersList {
			user.PasswordHash = ""
		}
		
		return c.JSON(usersList)
	})
	
	// Get user statistics (admin only)
	adminUsers.Get("/stats", func(c fiber.Ctx) error {
		tenantID, err := middleware.GetTenantID(c)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Tenant ID not found",
			})
		}
		
		stats, err := userService.GetUserStats(tenantID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to get user statistics",
			})
		}
		
		return c.JSON(stats)
	})
	
	// Create new user (admin only)
	adminUsers.Post("/", func(c fiber.Ctx) error {
		tenantID, err := middleware.GetTenantID(c)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Tenant ID not found",
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
				"error": "Invalid request body",
			})
		}
		
		// Validate required fields
		if req.Email == "" || req.Password == "" || req.Name == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Email, password, and name are required",
			})
		}
		
		// Default role if not provided
		if req.Role == "" {
			req.Role = "agent"
		}
		
		user, err := userService.CreateUser(tenantID, req.Email, req.Password, req.Name, req.Role)
		if err != nil {
			switch err {
			case application.ErrInvalidEmail:
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Invalid email format",
				})
			case application.ErrInvalidPassword:
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Password must be at least 8 characters",
				})
			case application.ErrInvalidRole:
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Invalid role. Must be one of: owner, admin, agent, viewer",
				})
			case application.ErrUserEmailExists:
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{
					"error": "Email already exists for this tenant",
				})
			case application.ErrUserLimitReached:
				return c.Status(fiber.StatusPaymentRequired).JSON(fiber.Map{
					"error": "User limit reached for current plan",
				})
			default:
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": err.Error(),
				})
			}
		}
		
		// Remove password hash from response
		user.PasswordHash = ""
		
		return c.Status(fiber.StatusCreated).JSON(user)
	})
	
	// Get user by ID
	users.Get("/:id", func(c fiber.Ctx) error {
		userID, err := uuid.Parse(c.Params("id"))
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid user ID",
			})
		}
		
		user, err := userService.GetUser(userID)
		if err != nil {
			if err == application.ErrUserNotFound {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
					"error": "User not found",
				})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to get user",
			})
		}
		
		// Verify user belongs to the same tenant
		tenantID, _ := middleware.GetTenantID(c)
		if user.TenantID != tenantID {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "User not found",
			})
		}
		
		// Remove password hash from response
		user.PasswordHash = ""
		
		return c.JSON(user)
	})
	
	// Update user (admin only)
	adminUsers.Patch("/:id", func(c fiber.Ctx) error {
		userID, err := uuid.Parse(c.Params("id"))
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid user ID",
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
		delete(updates, "tenant_id")
		delete(updates, "password_hash")
		delete(updates, "created_at")
		delete(updates, "updated_at")
		delete(updates, "deleted_at")
		
		// Verify user belongs to the same tenant
		tenantID, _ := middleware.GetTenantID(c)
		existingUser, err := userService.GetUser(userID)
		if err != nil || existingUser.TenantID != tenantID {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "User not found",
			})
		}
		
		updatedUser, err := userService.UpdateUser(userID, updates)
		if err != nil {
			switch err {
			case application.ErrUserNotFound:
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
					"error": "User not found",
				})
			case application.ErrInvalidEmail:
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Invalid email format",
				})
			case application.ErrInvalidRole:
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Invalid role",
				})
			case application.ErrUserEmailExists:
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{
					"error": "Email already exists",
				})
			case application.ErrLastAdmin:
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Cannot change role or deactivate the last admin",
				})
			default:
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": err.Error(),
				})
			}
		}
		
		// Remove password hash from response
		updatedUser.PasswordHash = ""
		
		return c.JSON(updatedUser)
	})
	
	// Delete user (admin only)
	adminUsers.Delete("/:id", func(c fiber.Ctx) error {
		userID, err := uuid.Parse(c.Params("id"))
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid user ID",
			})
		}
		
		currentUserID, _ := middleware.GetUserID(c)
		tenantID, _ := middleware.GetTenantID(c)
		
		// Verify user belongs to the same tenant
		existingUser, err := userService.GetUser(userID)
		if err != nil || existingUser.TenantID != tenantID {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "User not found",
			})
		}
		
		err = userService.DeleteUser(userID, currentUserID)
		if err != nil {
			switch err {
			case application.ErrUserNotFound:
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
					"error": "User not found",
				})
			case application.ErrCannotDeleteSelf:
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Cannot delete your own account",
				})
			case application.ErrLastAdmin:
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Cannot delete the last admin",
				})
			default:
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": err.Error(),
				})
			}
		}
		
		return c.JSON(fiber.Map{
			"message": "User deleted successfully",
		})
	})
	
	// Reset user password (admin only)
	adminUsers.Post("/:id/reset-password", func(c fiber.Ctx) error {
		userID, err := uuid.Parse(c.Params("id"))
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid user ID",
			})
		}
		
		var req struct {
			Password string `json:"password"`
		}
		
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request body",
			})
		}
		
		if req.Password == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Password is required",
			})
		}
		
		// Verify user belongs to the same tenant
		tenantID, _ := middleware.GetTenantID(c)
		existingUser, err := userService.GetUser(userID)
		if err != nil || existingUser.TenantID != tenantID {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "User not found",
			})
		}
		
		err = userService.ResetPassword(userID, req.Password)
		if err != nil {
			switch err {
			case application.ErrUserNotFound:
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
					"error": "User not found",
				})
			case application.ErrInvalidPassword:
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Password must be at least 8 characters",
				})
			default:
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": err.Error(),
				})
			}
		}
		
		return c.JSON(fiber.Map{
			"message": "Password reset successfully",
		})
	})
	
	// Profile routes (require authentication)
	profile := router.Group("/profile", middleware.AuthMiddleware(db))
	
	// Get current user profile
	profile.Get("/", func(c fiber.Ctx) error {
		userID, err := middleware.GetUserID(c)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "User ID not found",
			})
		}
		
		user, err := userService.GetUser(userID)
		if err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "User not found",
			})
		}
		
		// Remove password hash from response
		user.PasswordHash = ""
		
		return c.JSON(user)
	})
	
	// Update current user profile
	profile.Patch("/", func(c fiber.Ctx) error {
		userID, err := middleware.GetUserID(c)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "User ID not found",
			})
		}
		
		var updates map[string]interface{}
		if err := c.Bind().JSON(&updates); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request body",
			})
		}
		
		// Only allow updating name and email for own profile
		allowedFields := map[string]bool{
			"name":  true,
			"email": true,
		}
		
		filteredUpdates := make(map[string]interface{})
		for key, value := range updates {
			if allowedFields[key] {
				filteredUpdates[key] = value
			}
		}
		
		if len(filteredUpdates) == 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "No valid fields to update",
			})
		}
		
		updatedUser, err := userService.UpdateUser(userID, filteredUpdates)
		if err != nil {
			switch err {
			case application.ErrInvalidEmail:
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Invalid email format",
				})
			case application.ErrUserEmailExists:
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{
					"error": "Email already exists",
				})
			default:
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": err.Error(),
				})
			}
		}
		
		// Remove password hash from response
		updatedUser.PasswordHash = ""
		
		return c.JSON(updatedUser)
	})
	
	// Change password
	profile.Post("/change-password", func(c fiber.Ctx) error {
		userID, err := middleware.GetUserID(c)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "User ID not found",
			})
		}
		
		var req struct {
			OldPassword string `json:"old_password"`
			NewPassword string `json:"new_password"`
		}
		
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request body",
			})
		}
		
		if req.OldPassword == "" || req.NewPassword == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Old and new passwords are required",
			})
		}
		
		err = userService.ChangePassword(userID, req.OldPassword, req.NewPassword)
		if err != nil {
			switch err {
			case application.ErrWrongPassword:
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "Incorrect current password",
				})
			case application.ErrInvalidPassword:
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "New password must be at least 8 characters",
				})
			default:
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": err.Error(),
				})
			}
		}
		
		return c.JSON(fiber.Map{
			"message": "Password changed successfully",
		})
	})
}