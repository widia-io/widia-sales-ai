package email

import (
	"fmt"
	"net/smtp"
	"os"
)

type EmailService struct {
	smtpHost     string
	smtpPort     string
	smtpUser     string
	smtpPassword string
	fromEmail    string
	fromName     string
	appURL       string
}

func NewEmailService() *EmailService {
	return &EmailService{
		smtpHost:     getEnv("SMTP_HOST", "localhost"),
		smtpPort:     getEnv("SMTP_PORT", "1025"), // Mailhog default port
		smtpUser:     getEnv("SMTP_USER", ""),
		smtpPassword: getEnv("SMTP_PASSWORD", ""),
		fromEmail:    getEnv("SMTP_FROM_EMAIL", "noreply@widia.ai"),
		fromName:     getEnv("SMTP_FROM_NAME", "Widia Sales AI"),
		appURL:       getEnv("APP_URL", "http://localhost:3003"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// SendPasswordResetEmail sends a password reset email to the user
func (s *EmailService) SendPasswordResetEmail(toEmail, userName, resetToken string) error {
	resetLink := fmt.Sprintf("%s/auth/reset-password?token=%s", s.appURL, resetToken)
	
	subject := "Redefinição de Senha - Widia Sales AI"
	
	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Redefinição de Senha</h1>
        </div>
        <div class="content">
            <p>Olá <strong>%s</strong>,</p>
            
            <p>Recebemos uma solicitação para redefinir a senha da sua conta no Widia Sales AI.</p>
            
            <p>Para criar uma nova senha, clique no botão abaixo:</p>
            
            <center>
                <a href="%s" class="button">Redefinir Minha Senha</a>
            </center>
            
            <div class="warning">
                <strong>⚠️ Importante:</strong>
                <ul>
                    <li>Este link expira em 1 hora</li>
                    <li>Se você não solicitou esta redefinição, ignore este email</li>
                    <li>Por segurança, nunca compartilhe este link com outras pessoas</li>
                </ul>
            </div>
            
            <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
            <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 5px;">%s</p>
            
            <div class="footer">
                <p>Este é um email automático, por favor não responda.</p>
                <p>© 2024 Widia Sales AI. Todos os direitos reservados.</p>
            </div>
        </div>
    </div>
</body>
</html>
	`, userName, resetLink, resetLink)
	
	plainBody := fmt.Sprintf(`
Olá %s,

Recebemos uma solicitação para redefinir a senha da sua conta no Widia Sales AI.

Para criar uma nova senha, acesse o link abaixo:
%s

Importante:
- Este link expira em 1 hora
- Se você não solicitou esta redefinição, ignore este email
- Por segurança, nunca compartilhe este link com outras pessoas

Este é um email automático, por favor não responda.

© 2024 Widia Sales AI. Todos os direitos reservados.
	`, userName, resetLink)
	
	return s.sendEmail(toEmail, subject, plainBody, htmlBody)
}

// sendEmail sends an email with both plain text and HTML versions
func (s *EmailService) sendEmail(to, subject, plainBody, htmlBody string) error {
	from := fmt.Sprintf("%s <%s>", s.fromName, s.fromEmail)
	
	// Create message with both plain text and HTML
	boundary := "WIDIA_BOUNDARY_12345"
	
	headers := make(map[string]string)
	headers["From"] = from
	headers["To"] = to
	headers["Subject"] = subject
	headers["MIME-Version"] = "1.0"
	headers["Content-Type"] = fmt.Sprintf("multipart/alternative; boundary=%s", boundary)
	
	message := ""
	for k, v := range headers {
		message += fmt.Sprintf("%s: %s\r\n", k, v)
	}
	message += "\r\n"
	
	// Plain text part
	message += fmt.Sprintf("--%s\r\n", boundary)
	message += "Content-Type: text/plain; charset=\"UTF-8\"\r\n"
	message += "\r\n"
	message += plainBody
	message += "\r\n"
	
	// HTML part
	message += fmt.Sprintf("--%s\r\n", boundary)
	message += "Content-Type: text/html; charset=\"UTF-8\"\r\n"
	message += "\r\n"
	message += htmlBody
	message += "\r\n"
	
	message += fmt.Sprintf("--%s--", boundary)
	
	// Connect to SMTP server
	addr := fmt.Sprintf("%s:%s", s.smtpHost, s.smtpPort)
	
	// For Mailhog and local testing, we don't need authentication
	var auth smtp.Auth
	if s.smtpUser != "" && s.smtpPassword != "" {
		auth = smtp.PlainAuth("", s.smtpUser, s.smtpPassword, s.smtpHost)
	}
	
	// Send the email
	err := smtp.SendMail(addr, auth, s.fromEmail, []string{to}, []byte(message))
	if err != nil {
		return fmt.Errorf("failed to send email: %v", err)
	}
	
	return nil
}

// SendWelcomeEmail sends a welcome email to new users
func (s *EmailService) SendWelcomeEmail(toEmail, userName, tenantName string) error {
	subject := "Bem-vindo ao Widia Sales AI!"
	
	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Bem-vindo ao Widia Sales AI!</h1>
        </div>
        <div class="content">
            <p>Olá <strong>%s</strong>,</p>
            
            <p>Seja muito bem-vindo(a) à <strong>%s</strong> no Widia Sales AI!</p>
            
            <p>Sua conta foi criada com sucesso e você já pode começar a usar nossa plataforma de vendas com inteligência artificial.</p>
            
            <div class="feature">
                <h3>✨ O que você pode fazer:</h3>
                <ul>
                    <li>Qualificar leads automaticamente com IA</li>
                    <li>Integrar múltiplos canais de comunicação</li>
                    <li>Agendar reuniões automaticamente</li>
                    <li>Acompanhar métricas em tempo real</li>
                </ul>
            </div>
            
            <center>
                <a href="%s/dashboard" class="button">Acessar o Dashboard</a>
            </center>
            
            <p>Se tiver qualquer dúvida, nossa equipe está sempre pronta para ajudar!</p>
            
            <div class="footer">
                <p>Este é um email automático, por favor não responda.</p>
                <p>© 2024 Widia Sales AI. Todos os direitos reservados.</p>
            </div>
        </div>
    </div>
</body>
</html>
	`, userName, tenantName, s.appURL)
	
	plainBody := fmt.Sprintf(`
Olá %s,

Seja muito bem-vindo(a) à %s no Widia Sales AI!

Sua conta foi criada com sucesso e você já pode começar a usar nossa plataforma de vendas com inteligência artificial.

O que você pode fazer:
- Qualificar leads automaticamente com IA
- Integrar múltiplos canais de comunicação
- Agendar reuniões automaticamente
- Acompanhar métricas em tempo real

Acesse o dashboard: %s/dashboard

Se tiver qualquer dúvida, nossa equipe está sempre pronta para ajudar!

Este é um email automático, por favor não responda.

© 2024 Widia Sales AI. Todos os direitos reservados.
	`, userName, tenantName, s.appURL)
	
	return s.sendEmail(toEmail, subject, plainBody, htmlBody)
}