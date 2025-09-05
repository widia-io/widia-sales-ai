package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/spf13/viper"
	"github.com/widia/sales-ai/internal/infrastructure/database"
	"github.com/widia/sales-ai/internal/interfaces/http/handlers"
	"github.com/widia/sales-ai/internal/interfaces/http/middleware"
	"github.com/widia/sales-ai/internal/interfaces/http/routes"
)

func init() {
	// Load configuration
	viper.SetConfigFile(".env")
	viper.AutomaticEnv()
	
	if err := viper.ReadInConfig(); err != nil {
		log.Printf("Error reading config file: %s", err)
	}
	
	// Set defaults
	viper.SetDefault("PORT", "3000")
	viper.SetDefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/saas_dev?sslmode=disable")
	viper.SetDefault("JWT_SECRET", "your-secret-key-change-in-production")
	viper.SetDefault("ENV", "development")
}

func main() {
	// Initialize database
	db, err := database.Initialize()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	
	// Run migrations
	if err := database.Migrate(db); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}
	
	// Create fiber app
	app := fiber.New(fiber.Config{
		AppName:      "SaaS Sales AI API",
		ErrorHandler: handlers.ErrorHandler,
	})
	
	// Global middlewares
	app.Use(logger.New())
	app.Use(recover.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: []string{viper.GetString("CORS_ORIGINS")},
		AllowHeaders: []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Tenant-ID"},
		AllowMethods: []string{"GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"},
		AllowCredentials: true,
	}))
	
	// Health check
	app.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "healthy",
			"service": "saas-api",
			"version": "1.0.0",
		})
	})
	
	// Setup routes
	api := app.Group("/api")
	
	// Public routes
	routes.SetupAuthRoutes(api, db)
	
	// Protected routes (with tenant middleware)
	protected := api.Use(middleware.AuthMiddleware(db))
	protected.Use(middleware.TenantMiddleware(db))
	
	routes.SetupTenantRoutes(protected, db)
	routes.SetupUserRoutes(protected, db)
	
	// Graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	
	go func() {
		<-c
		log.Println("Gracefully shutting down...")
		_ = app.Shutdown()
	}()
	
	// Start server
	port := viper.GetString("PORT")
	log.Printf("Server starting on port %s", port)
	
	if err := app.Listen(":" + port); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}