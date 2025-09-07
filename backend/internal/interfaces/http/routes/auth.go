package routes

import (
	"github.com/gofiber/fiber/v3"
	"github.com/widia/widia-connect/internal/application"
	"github.com/widia/widia-connect/internal/domain"
	"github.com/widia/widia-connect/internal/infrastructure/repository"
	"github.com/widia/widia-connect/internal/interfaces/http/middleware"
	"gorm.io/gorm"
)

func SetupAuthRoutes(router fiber.Router, db *gorm.DB) {
	auth := router.Group("/auth")
	
	// Initialize repositories and services
	userRepo := repository.NewUserRepository(db)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db)
	resetTokenRepo := repository.NewPasswordResetTokenRepository(db)
	tenantRepo := repository.NewTenantRepository(db)
	
	authService := application.NewAuthServiceWithResetToken(db, userRepo, refreshTokenRepo, resetTokenRepo)
	tenantService := application.NewTenantService(db, tenantRepo, userRepo)
	userService := application.NewUserService(db, userRepo)
	
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
		
		// Validate required fields
		if req.TenantName == "" || req.TenantSlug == "" || req.Email == "" || req.Password == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Missing required fields",
			})
		}
		
		// Create tenant and admin user
		tenant, user, err := tenantService.CreateTenant(
			req.TenantName,
			req.TenantSlug,
			req.Email,
			req.Password,
			req.Name,
		)
		
		if err != nil {
			// Handle specific errors
			switch err {
			case application.ErrInvalidSlug:
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Invalid slug format. Must be lowercase, alphanumeric with hyphens, 3-63 characters",
				})
			case application.ErrTenantSlugExists:
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{
					"error": "Tenant slug already exists",
				})
			default:
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": err.Error(),
				})
			}
		}
		
		// Generate tokens
		accessToken, err := middleware.GenerateToken(user.ID, tenant.ID, user.Email, user.Role)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to generate token",
			})
		}
		
		refreshToken, err := authService.CreateRefreshToken(user.ID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to generate refresh token",
			})
		}
		
		// Update last login
		userService.UpdateLastLogin(user.ID)
		
		return c.JSON(fiber.Map{
			"token":         accessToken,
			"refresh_token": refreshToken.Token,
			"user":          user,
			"tenant":        tenant,
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
		
		// Authenticate user
		user, accessToken, refreshToken, err := authService.Login(req.Email, req.Password, tenant.ID)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		
		return c.JSON(fiber.Map{
			"token":         accessToken,
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
		
		// Validate and rotate refresh token
		user, accessToken, newRefreshToken, err := authService.ValidateAndRotate(req.RefreshToken)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		
		// Get tenant
		var tenant domain.Tenant
		if err := db.Where("id = ?", user.TenantID).First(&tenant).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to get tenant",
			})
		}
		
		return c.JSON(fiber.Map{
			"token":         accessToken,
			"refresh_token": newRefreshToken,
			"user":          user,
			"tenant":        tenant,
		})
	})
	
	// Logout
	auth.Post("/logout", func(c fiber.Ctx) error {
		var req struct {
			RefreshToken string `json:"refresh_token"`
		}
		
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request",
			})
		}
		
		// Revoke refresh token
		if err := authService.Logout(req.RefreshToken); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to logout",
			})
		}
		
		return c.JSON(fiber.Map{
			"message": "Successfully logged out",
		})
	})
	
	// Forgot password - request reset token
	auth.Post("/forgot-password", func(c fiber.Ctx) error {
		var req struct {
			Email      string `json:"email"`
			TenantSlug string `json:"tenant_slug"`
		}
		
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request",
			})
		}
		
		// Validate required fields
		if req.Email == "" || req.TenantSlug == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Email and tenant slug are required",
			})
		}
		
		// Request password reset
		// Note: We don't return the token in production - it should be sent via email
		token, err := authService.RequestPasswordReset(req.Email, req.TenantSlug)
		if err != nil {
			// Log the error but don't expose it to the user
			// This prevents user enumeration attacks
		}
		
		// Always return success to prevent user enumeration
		response := fiber.Map{
			"message": "If the email exists in our system, you will receive a password reset link",
		}
		
		// In development, include the token for testing
		// TODO: Remove this in production and send via email instead
		if token != "" {
			response["reset_token"] = token
			response["reset_url"] = "/auth/reset-password?token=" + token
		}
		
		return c.JSON(response)
	})
	
	// Validate reset token
	auth.Get("/reset-password/validate", func(c fiber.Ctx) error {
		token := c.Query("token")
		
		if token == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Token is required",
			})
		}
		
		if err := authService.ValidateResetToken(token); err != nil {
			switch err {
			case application.ErrInvalidResetToken:
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Invalid or expired token",
					"valid": false,
				})
			case application.ErrResetTokenUsed:
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Token has already been used",
					"valid": false,
				})
			default:
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Failed to validate token",
					"valid": false,
				})
			}
		}
		
		return c.JSON(fiber.Map{
			"message": "Token is valid",
			"valid":   true,
		})
	})
	
	// Reset password with token
	auth.Post("/reset-password", func(c fiber.Ctx) error {
		var req struct {
			Token       string `json:"token"`
			NewPassword string `json:"new_password"`
		}
		
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request",
			})
		}
		
		// Validate required fields
		if req.Token == "" || req.NewPassword == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Token and new password are required",
			})
		}
		
		// Reset the password
		if err := authService.ResetPassword(req.Token, req.NewPassword); err != nil {
			switch err {
			case application.ErrInvalidResetToken:
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Invalid or expired token",
				})
			case application.ErrResetTokenUsed:
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Token has already been used",
				})
			case application.ErrInvalidPassword:
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Password must be at least 8 characters",
				})
			case application.ErrUserNotFound:
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
					"error": "User not found",
				})
			default:
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Failed to reset password",
				})
			}
		}
		
		return c.JSON(fiber.Map{
			"message": "Password has been reset successfully",
		})
	})
}