package chatwoot

import (
	"fmt"
	"os"
	"testing"
)

// TestChatwootIntegration is a POC test for Chatwoot integration
// Run with: go test -v ./pkg/chatwoot
func TestChatwootIntegration(t *testing.T) {
	// Skip if not in integration test mode
	if os.Getenv("RUN_INTEGRATION_TESTS") != "true" {
		t.Skip("Skipping integration test. Set RUN_INTEGRATION_TESTS=true to run")
	}

	// Get Chatwoot configuration from environment
	baseURL := os.Getenv("CHATWOOT_BASE_URL")
	apiKey := os.Getenv("CHATWOOT_API_KEY")

	if baseURL == "" || apiKey == "" {
		t.Skip("CHATWOOT_BASE_URL and CHATWOOT_API_KEY must be set")
	}

	// Create client
	client := NewClient(baseURL, apiKey)

	t.Run("CreateInbox", func(t *testing.T) {
		req := CreateInboxRequest{
			Name:           "Test Inbox POC",
			Channel:        "api",
			WelcomeTitle:   "Welcome to Test",
			WelcomeTagline: "How can we help you today?",
		}

		inbox, err := client.CreateInbox(req)
		if err != nil {
			t.Fatalf("Failed to create inbox: %v", err)
		}

		if inbox.ID == 0 {
			t.Error("Expected inbox ID to be non-zero")
		}

		fmt.Printf("Created inbox: ID=%d, Name=%s\n", inbox.ID, inbox.Name)
	})

	// Additional test for sending message (requires a conversation ID)
	t.Run("SendMessage", func(t *testing.T) {
		// This would require a valid conversation ID
		// For POC purposes, we'll skip if no conversation exists
		conversationID := 1 // Replace with actual conversation ID
		
		message, err := client.SendMessage(conversationID, "Test message from POC", false)
		if err != nil {
			t.Logf("Could not send message (expected if no conversation exists): %v", err)
			return
		}

		if message.ID == 0 {
			t.Error("Expected message ID to be non-zero")
		}

		fmt.Printf("Sent message: ID=%d, Content=%s\n", message.ID, message.Content)
	})
}

// Example usage function for documentation
func ExampleClient_CreateInbox() {
	// Initialize client
	client := NewClient("http://localhost:3001", "your-api-key")

	// Create an inbox
	req := CreateInboxRequest{
		Name:           "Support",
		Channel:        "website",
		WebsiteURL:     "https://example.com",
		WelcomeTitle:   "Welcome!",
		WelcomeTagline: "We're here to help",
	}

	inbox, err := client.CreateInbox(req)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}

	fmt.Printf("Created inbox with ID: %d\n", inbox.ID)
}

// Example of sending a message
func ExampleClient_SendMessage() {
	// Initialize client
	client := NewClient("http://localhost:3001", "your-api-key")

	// Send a message to conversation ID 123
	message, err := client.SendMessage(123, "Hello, how can I help you?", false)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}

	fmt.Printf("Sent message with ID: %d\n", message.ID)
}