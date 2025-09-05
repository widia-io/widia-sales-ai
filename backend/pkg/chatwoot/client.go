package chatwoot

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client represents a Chatwoot API client
type Client struct {
	BaseURL    string
	APIKey     string
	HTTPClient *http.Client
}

// NewClient creates a new Chatwoot client
func NewClient(baseURL, apiKey string) *Client {
	return &Client{
		BaseURL: baseURL,
		APIKey:  apiKey,
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// Inbox represents a Chatwoot inbox
type Inbox struct {
	ID              int    `json:"id"`
	Name            string `json:"name"`
	WebsiteURL      string `json:"website_url,omitempty"`
	WebsiteToken    string `json:"website_token,omitempty"`
	WelcomeTitle    string `json:"welcome_title,omitempty"`
	WelcomeTagline  string `json:"welcome_tagline,omitempty"`
	GreetingEnabled bool   `json:"greeting_enabled"`
	GreetingMessage string `json:"greeting_message,omitempty"`
}

// CreateInboxRequest represents the request to create an inbox
type CreateInboxRequest struct {
	Name           string `json:"name"`
	Channel        string `json:"channel"` // "api" or "website"
	WebsiteURL     string `json:"website_url,omitempty"`
	WelcomeTitle   string `json:"welcome_title,omitempty"`
	WelcomeTagline string `json:"welcome_tagline,omitempty"`
}

// Message represents a Chatwoot message
type Message struct {
	ID           int         `json:"id"`
	Content      string      `json:"content"`
	MessageType  int         `json:"message_type"` // 0: incoming, 1: outgoing
	Private      bool        `json:"private"`
	ContentType  string      `json:"content_type"`
	CreatedAt    time.Time   `json:"created_at"`
	Conversation Conversation `json:"conversation,omitempty"`
}

// Conversation represents a Chatwoot conversation
type Conversation struct {
	ID            int       `json:"id"`
	AccountID     int       `json:"account_id"`
	InboxID       int       `json:"inbox_id"`
	Status        string    `json:"status"` // "open", "resolved", "pending"
	ContactID     int       `json:"contact_id"`
	LastActivityAt time.Time `json:"last_activity_at"`
}

// CreateInbox creates a new inbox for a tenant
func (c *Client) CreateInbox(req CreateInboxRequest) (*Inbox, error) {
	url := fmt.Sprintf("%s/api/v1/accounts/1/inboxes", c.BaseURL)
	
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("api_access_token", c.APIKey)

	resp, err := c.HTTPClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(body))
	}

	var inbox Inbox
	if err := json.NewDecoder(resp.Body).Decode(&inbox); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &inbox, nil
}

// SendMessage sends a message to a conversation
func (c *Client) SendMessage(conversationID int, content string, private bool) (*Message, error) {
	url := fmt.Sprintf("%s/api/v1/accounts/1/conversations/%d/messages", c.BaseURL, conversationID)
	
	payload := map[string]interface{}{
		"content": content,
		"private": private,
		"message_type": "outgoing",
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("api_access_token", c.APIKey)

	resp, err := c.HTTPClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(body))
	}

	var message Message
	if err := json.NewDecoder(resp.Body).Decode(&message); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &message, nil
}

// GetConversation retrieves a conversation by ID
func (c *Client) GetConversation(conversationID int) (*Conversation, error) {
	url := fmt.Sprintf("%s/api/v1/accounts/1/conversations/%d", c.BaseURL, conversationID)
	
	httpReq, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("api_access_token", c.APIKey)

	resp, err := c.HTTPClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(body))
	}

	var conversation Conversation
	if err := json.NewDecoder(resp.Body).Decode(&conversation); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &conversation, nil
}

// AssignAgent assigns an agent to a conversation
func (c *Client) AssignAgent(conversationID int, agentID int) error {
	url := fmt.Sprintf("%s/api/v1/accounts/1/conversations/%d/assignments", c.BaseURL, conversationID)
	
	payload := map[string]interface{}{
		"assignee_id": agentID,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("api_access_token", c.APIKey)

	resp, err := c.HTTPClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(body))
	}

	return nil
}

// UpdateConversationStatus updates the status of a conversation
func (c *Client) UpdateConversationStatus(conversationID int, status string) error {
	url := fmt.Sprintf("%s/api/v1/accounts/1/conversations/%d", c.BaseURL, conversationID)
	
	payload := map[string]interface{}{
		"status": status, // "open", "resolved", "pending"
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequest("PATCH", url, bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("api_access_token", c.APIKey)

	resp, err := c.HTTPClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(body))
	}

	return nil
}