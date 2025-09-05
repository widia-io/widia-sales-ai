package middleware

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

// RequireRole creates a middleware that checks if the user has one of the required roles
func RequireRole(allowedRoles ...string) fiber.Handler {
	return func(c fiber.Ctx) error {
		// Get user role from context (set by auth middleware)
		userRole, ok := c.Locals("role").(string)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Unauthorized: role not found",
			})
		}

		// Check if user role is in allowed roles
		for _, role := range allowedRoles {
			if userRole == role {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Forbidden: insufficient permissions",
		})
	}
}

// RequireAdmin is a shorthand for RequireRole("admin", "owner")
func RequireAdmin() fiber.Handler {
	return RequireRole("admin", "owner")
}

// RequireOwner is a shorthand for RequireRole("owner")
func RequireOwner() fiber.Handler {
	return RequireRole("owner")
}

// GetUserID extracts the user ID from context
func GetUserID(c fiber.Ctx) (uuid.UUID, error) {
	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return uuid.Nil, fiber.NewError(fiber.StatusUnauthorized, "User ID not found in context")
	}
	return userID, nil
}

// GetTenantID extracts the tenant ID from context
func GetTenantID(c fiber.Ctx) (uuid.UUID, error) {
	tenantID, ok := c.Locals("tenant_id").(uuid.UUID)
	if !ok {
		return uuid.Nil, fiber.NewError(fiber.StatusUnauthorized, "Tenant ID not found in context")
	}
	return tenantID, nil
}

// GetUserRole extracts the user role from context
func GetUserRole(c fiber.Ctx) (string, error) {
	role, ok := c.Locals("role").(string)
	if !ok {
		return "", fiber.NewError(fiber.StatusUnauthorized, "Role not found in context")
	}
	return role, nil
}

// GetUserEmail extracts the user email from context
func GetUserEmail(c fiber.Ctx) (string, error) {
	email, ok := c.Locals("email").(string)
	if !ok {
		return "", fiber.NewError(fiber.StatusUnauthorized, "Email not found in context")
	}
	return email, nil
}