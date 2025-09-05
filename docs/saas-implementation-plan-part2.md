---

## 🚀 Fase 5: Otimização e Escala (2 semanas)

### Objetivos
- Performance e caching otimizados
- Observabilidade completa (logs, métricas, tracing)
- Integrações avançadas (HubSpot, Pipedrive, Slack)
- Preparação para produção e alta disponibilidade

### Entregáveis
- Sistema de cache Redis implementado
- Monitoring com Prometheus/Grafana
- CI/CD completo
- Documentação e testes E2E

### 🤖 Prompt para Claude Code - Fase 5

```markdown
Implemente as otimizações finais para produção, observabilidade e integrações avançadas:

## 1. Otimização de Performance

### Cache com Redis
```go
type CacheService struct {
    redis *redis.Client
    ttl   time.Duration
}

// Cache decorator pattern
func CacheableQuery[T any](key string, ttl time.Duration, fn func() (T, error)) (T, error) {
    var result T
    
    // Tentar buscar do cache
    cached, err := cache.Get(context.Background(), key).Result()
    if err == nil {
        json.Unmarshal([]byte(cached), &result)
        return result, nil
    }
    
    // Executar função
    result, err = fn()
    if err != nil {
        return result, err
    }
    
    // Salvar no cache
    data, _ := json.Marshal(result)
    cache.Set(context.Background(), key, data, ttl)
    
    return result, nil
}

// Invalidação de cache
func InvalidateCache(patterns ...string) {
    ctx := context.Background()
    for _, pattern := range patterns {
        keys, _ := cache.Keys(ctx, pattern).Result()
        if len(keys) > 0 {
            cache.Del(ctx, keys...)
        }
    }
}

// Implementação em handlers
func GetLeadHandler(c *fiber.Ctx) error {
    leadID := c.Params("id")
    tenantID := c.Locals("tenant_id").(uuid.UUID)
    
    lead, err := CacheableQuery(
        fmt.Sprintf("lead:%s:%s", tenantID, leadID),
        5 * time.Minute,
        func() (*Lead, error) {
            return GetLeadFromDB(leadID)
        },
    )
    
    return c.JSON(lead)
}
```

### Otimização de Queries
```sql
-- Índices essenciais
CREATE INDEX idx_leads_tenant_stage ON leads(tenant_id, stage) WHERE deleted_at IS NULL;
CREATE INDEX idx_conversations_tenant_status ON conversations(tenant_id, status);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_deals_tenant_pipeline ON deals(tenant_id, pipeline_id, stage);
CREATE INDEX idx_activities_due ON activities(tenant_id, due_date) WHERE completed_at IS NULL;

-- Views materializadas para dashboards
CREATE MATERIALIZED VIEW mv_tenant_metrics AS
SELECT 
    tenant_id,
    DATE(created_at) as date,
    COUNT(DISTINCT lead_id) as total_leads,
    COUNT(DISTINCT CASE WHEN bant_score >= 70 THEN lead_id END) as qualified_leads,
    COUNT(DISTINCT deal_id) as total_deals,
    SUM(deal_value) as pipeline_value
FROM leads
LEFT JOIN deals ON leads.id = deals.lead_id
GROUP BY tenant_id, DATE(created_at)
WITH DATA;

-- Refresh automático
CREATE OR REPLACE FUNCTION refresh_metrics()
RETURNS void AS $
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tenant_metrics;
END;
$ LANGUAGE plpgsql;

-- Agendar refresh a cada hora
SELECT cron.schedule('refresh-metrics', '0 * * * *', 'SELECT refresh_metrics();');
```

### Batch Processing
```go
func BatchProcessor[T any](items []T, batchSize int, processor func([]T) error) error {
    for i := 0; i < len(items); i += batchSize {
        end := i + batchSize
        if end > len(items) {
            end = len(items)
        }
        
        batch := items[i:end]
        if err := processor(batch); err != nil {
            return fmt.Errorf("batch %d failed: %w", i/batchSize, err)
        }
    }
    return nil
}

// Uso em import/export
func BulkImportLeads(leads []Lead) error {
    return BatchProcessor(leads, 100, func(batch []Lead) error {
        return db.Create(&batch).Error
    })
}
```

## 2. Observabilidade Completa

### Structured Logging
```go
type Logger struct {
    *zerolog.Logger
}

func NewLogger() *Logger {
    output := zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339}
    logger := zerolog.New(output).With().Timestamp().Caller().Logger()
    return &Logger{&logger}
}

// Middleware de logging
func LoggingMiddleware(logger *Logger) fiber.Handler {
    return func(c *fiber.Ctx) error {
        start := time.Now()
        
        // Adicionar request ID
        requestID := uuid.New().String()
        c.Locals("request_id", requestID)
        
        // Processar request
        err := c.Next()
        
        // Log estruturado
        logger.Info().
            Str("request_id", requestID).
            Str("method", c.Method()).
            Str("path", c.Path()).
            Str("tenant_id", c.Locals("tenant_id").(uuid.UUID).String()).
            Int("status", c.Response().StatusCode()).
            Dur("latency", time.Since(start)).
            Msg("request processed")
        
        return err
    }
}
```

### Métricas com Prometheus
```go
var (
    requestDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "http_request_duration_seconds",
            Help: "Duration of HTTP requests in seconds",
        },
        []string{"method", "route", "status", "tenant"},
    )
    
    activeConnections = promauto.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "active_connections",
            Help: "Number of active connections",
        },
        []string{"type", "tenant"},
    )
    
    businessMetrics = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "business_events_total",
            Help: "Total business events",
        },
        []string{"event", "tenant"},
    )
)

// Middleware de métricas
func MetricsMiddleware() fiber.Handler {
    return func(c *fiber.Ctx) error {
        start := time.Now()
        
        err := c.Next()
        
        duration := time.Since(start).Seconds()
        status := strconv.Itoa(c.Response().StatusCode())
        tenant := c.Locals("tenant_id").(uuid.UUID).String()
        
        requestDuration.WithLabelValues(
            c.Method(),
            c.Route().Path,
            status,
            tenant,
        ).Observe(duration)
        
        return err
    }
}

// Business metrics
func TrackBusinessEvent(event string, tenantID uuid.UUID) {
    businessMetrics.WithLabelValues(event, tenantID.String()).Inc()
}
```

### Distributed Tracing com OpenTelemetry
```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/trace"
)

func InitTracing() {
    tp := trace.NewTracerProvider(
        trace.WithBatcher(exporter),
        trace.WithResource(resource.NewWithAttributes(
            semconv.ServiceNameKey.String("saas-api"),
            semconv.ServiceVersionKey.String("1.0.0"),
        )),
    )
    
    otel.SetTracerProvider(tp)
}

// Uso em serviços
func ProcessLead(ctx context.Context, leadID uuid.UUID) error {
    ctx, span := tracer.Start(ctx, "process_lead")
    defer span.End()
    
    span.SetAttributes(
        attribute.String("lead.id", leadID.String()),
        attribute.String("tenant.id", GetTenantID(ctx).String()),
    )
    
    // Processar com spans filhos
    if err := QualifyLead(ctx, leadID); err != nil {
        span.RecordError(err)
        return err
    }
    
    return nil
}
```

## 3. Integrações Avançadas

### Slack Integration
```go
type SlackIntegration struct {
    WebhookURL string
    Channel    string
    TenantID   uuid.UUID
}

func (s *SlackIntegration) NotifyNewLead(lead *Lead) error {
    payload := map[string]interface{}{
        "channel": s.Channel,
        "text": fmt.Sprintf("🎯 Novo lead qualificado: %s", lead.Name),
        "attachments": []map[string]interface{}{
            {
                "color": "good",
                "fields": []map[string]interface{}{
                    {"title": "Email", "value": lead.Email, "short": true},
                    {"title": "Score BANT", "value": lead.BANTScore, "short": true},
                    {"title": "Empresa", "value": lead.Company, "short": true},
                    {"title": "Origem", "value": lead.Source, "short": true},
                },
                "actions": []map[string]interface{}{
                    {
                        "type": "button",
                        "text": "Ver no CRM",
                        "url": fmt.Sprintf("%s/leads/%s", BaseURL, lead.ID),
                    },
                },
            },
        },
    }
    
    return PostToSlack(s.WebhookURL, payload)
}

// Comando Slash do Slack
func HandleSlackCommand(c *fiber.Ctx) error {
    command := c.FormValue("command")
    text := c.FormValue("text")
    
    switch command {
    case "/lead-status":
        leadID := text
        lead := GetLead(leadID)
        return c.JSON(FormatLeadStatus(lead))
        
    case "/pipeline":
        metrics := GetPipelineMetrics()
        return c.JSON(FormatPipelineMetrics(metrics))
    }
}
```

### Zapier Integration
```go
// Webhooks para Zapier
type ZapierWebhook struct {
    ID       uuid.UUID
    TenantID uuid.UUID
    Event    string // lead.created, deal.won, etc
    URL      string
    Active   bool
}

func TriggerZapierWebhooks(event string, data interface{}) {
    webhooks := GetActiveWebhooks(event)
    
    for _, webhook := range webhooks {
        go func(w ZapierWebhook) {
            payload := map[string]interface{}{
                "event": event,
                "data": data,
                "tenant_id": w.TenantID,
                "timestamp": time.Now(),
            }
            
            resp, err := http.Post(w.URL, "application/json", 
                bytes.NewBuffer(json.Marshal(payload)))
            
            if err != nil || resp.StatusCode != 200 {
                // Retry logic
                RetryWebhook(w, payload)
            }
        }(webhook)
    }
}
```

### N8n Workflows
```go
// API para N8n automation
router.Post("/api/n8n/trigger/:workflow", TriggerN8nWorkflow)
router.Get("/api/n8n/data/:entity/:id", GetEntityForN8n)

func TriggerN8nWorkflow(c *fiber.Ctx) error {
    workflowID := c.Params("workflow")
    var payload map[string]interface{}
    c.BodyParser(&payload)
    
    // Adicionar contexto do tenant
    payload["tenant_id"] = c.Locals("tenant_id")
    payload["user_id"] = c.Locals("user_id")
    
    // Trigger workflow
    resp, err := http.Post(
        fmt.Sprintf("%s/webhook/%s", N8nURL, workflowID),
        "application/json",
        bytes.NewBuffer(json.Marshal(payload)),
    )
    
    return c.JSON(fiber.Map{
        "success": resp.StatusCode == 200,
        "workflow_id": workflowID,
    })
}
```

## 4. CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/main.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Run migrations
        run: |
          go run cmd/migrate/main.go up
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/test
      
      - name: Run tests
        run: |
          go test -v -race -coverprofile=coverage.out ./...
          go tool cover -html=coverage.out -o coverage.html
      
      - name: Run linter
        uses: golangci/golangci-lint-action@v3
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: |
          docker build -t saas-api:${{ github.sha }} .
          docker tag saas-api:${{ github.sha }} saas-api:latest
      
      - name: Push to Registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push saas-api:${{ github.sha }}
          docker push saas-api:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to Production
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /app
            docker-compose pull
            docker-compose up -d --force-recreate
            docker system prune -f
```

### Dockerfile Otimizado
```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main cmd/api/main.go

# Final stage
FROM alpine:3.18
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /root/
COPY --from=builder /app/main .
COPY --from=builder /app/migrations ./migrations
EXPOSE 3000
CMD ["./main"]
```

## 5. Segurança em Produção

### Security Headers e CORS
```go
func SecurityMiddleware() fiber.Handler {
    return func(c *fiber.Ctx) error {
        // Security headers
        c.Set("X-Frame-Options", "DENY")
        c.Set("X-Content-Type-Options", "nosniff")
        c.Set("X-XSS-Protection", "1; mode=block")
        c.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        c.Set("Content-Security-Policy", "default-src 'self'")
        
        return c.Next()
    }
}

// CORS configurado por tenant
func CORSMiddleware() fiber.Handler {
    return cors.New(cors.Config{
        AllowOrigins: func(origin string) bool {
            // Permitir subdomínios dos tenants
            return strings.HasSuffix(origin, ".yoursaas.com")
        },
        AllowCredentials: true,
        AllowMethods: "GET,POST,PUT,DELETE,OPTIONS,PATCH",
        AllowHeaders: "Origin,Content-Type,Accept,Authorization,X-Tenant-ID",
    })
}
```

### Rate Limiting por Tenant
```go
func RateLimitMiddleware() fiber.Handler {
    limiter := rate.NewLimiter(rate.Limit(100), 1000) // 100 req/s, burst 1000
    limiters := make(map[string]*rate.Limiter)
    mu := sync.Mutex{}
    
    return func(c *fiber.Ctx) error {
        tenantID := c.Locals("tenant_id").(uuid.UUID).String()
        
        mu.Lock()
        if _, exists := limiters[tenantID]; !exists {
            // Limites baseados no plano
            tenant := GetTenant(tenantID)
            limit := GetRateLimitForPlan(tenant.Plan)
            limiters[tenantID] = rate.NewLimiter(limit, int(limit)*10)
        }
        l := limiters[tenantID]
        mu.Unlock()
        
        if !l.Allow() {
            return c.Status(429).JSON(fiber.Map{
                "error": "Rate limit exceeded",
                "retry_after": l.Reserve().Delay(),
            })
        }
        
        return c.Next()
    }
}
```

## 6. Disaster Recovery

### Backup Automático
```bash
#!/bin/bash
# backup.sh

# Backup do banco
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Upload para S3
aws s3 cp backup_*.sql.gz s3://your-backup-bucket/postgres/

# Backup de arquivos
tar -czf files_$(date +%Y%m%d_%H%M%S).tar.gz /app/uploads
aws s3 cp files_*.tar.gz s3://your-backup-bucket/files/

# Limpeza de backups antigos (manter últimos 30 dias)
find . -name "backup_*.sql.gz" -mtime +30 -delete
aws s3 rm s3://your-backup-bucket/ --recursive --exclude "*" --include "*.gz" --older-than 30
```

### Health Checks
```go
func HealthCheck(c *fiber.Ctx) error {
    checks := map[string]bool{
        "database": CheckDatabase(),
        "redis": CheckRedis(),
        "chatwoot": CheckChatwoot(),
        "stripe": CheckStripe(),
    }
    
    healthy := true
    for _, check := range checks {
        if !check {
            healthy = false
            break
        }
    }
    
    status := 200
    if !healthy {
        status = 503
    }
    
    return c.Status(status).JSON(fiber.Map{
        "status": map[bool]string{true: "healthy", false: "unhealthy"}[healthy],
        "checks": checks,
        "timestamp": time.Now(),
        "version": Version,
    })
}

func CheckDatabase() bool {
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel()
    
    return db.WithContext(ctx).Exec("SELECT 1").Error == nil
}
```

## 7. Documentação Final

### OpenAPI/Swagger
```go
// Gerar documentação automática
func SetupSwagger(app *fiber.App) {
    app.Get("/swagger/*", swagger.HandlerDefault)
}

// Annotations nos handlers
// @Summary Create a new lead
// @Description Create a new lead in the CRM
// @Tags leads
// @Accept json
// @Produce json
// @Param lead body Lead true "Lead data"
// @Success 201 {object} Lead
// @Failure 400 {object} ErrorResponse
// @Router /api/crm/leads [post]
func CreateLeadHandler(c *fiber.Ctx) error {
    // Implementation
}
```

### README de Produção
```markdown
# SaaS - Assistente de Vendas Inteligente

## Quick Start
\`\`\`bash
docker-compose up -d
make migrate
make seed
make dev
\`\`\`

## Deployment
- Requisitos: Docker, PostgreSQL 15+, Redis 7+
- Configurar variáveis em `.env.production`
- Executar migrations: `make migrate-prod`
- Deploy: `docker-compose -f docker-compose.prod.yml up -d`

## Monitoring
- Metrics: http://localhost:9090 (Prometheus)
- Dashboards: http://localhost:3000 (Grafana)
- Logs: Structured JSON to stdout

## Backup & Recovery
- Automated daily backups to S3
- Point-in-time recovery available
- Restore: `make restore-backup DATE=2024-01-15`
```

## 8. Testes End-to-End

### Playwright Tests
```javascript
// e2e/lead-qualification.spec.js
const { test, expect } = require('@playwright/test');

test('Complete lead qualification flow', async ({ page }) => {
    // Iniciar chat
    await page.goto('https://demo.yoursaas.com');
    await page.click('[data-testid="chat-widget"]');
    
    // Responder BANT
    await page.fill('[data-testid="chat-input"]', 'Quero saber mais');
    await page.press('[data-testid="chat-input"]', 'Enter');
    
    // Budget
    await expect(page.locator('.bot-message')).toContainText('orçamento');
    await page.click('text=R$ 1.000 - R$ 5.000/mês');
    
    // Authority
    await expect(page.locator('.bot-message')).toContainText('decisão');
    await page.click('text=Sim, sou o decisor');
    
    // Need
    await page.fill('[data-testid="chat-input"]', 'Melhorar conversão de vendas');
    await page.press('[data-testid="chat-input"]', 'Enter');
    
    // Timeline
    await page.click('text=Próximos 30 dias');
    
    // Verificar qualificação
    await expect(page.locator('.bot-message')).toContainText('qualificado');
    
    // Agendar reunião
    await page.click('text=Agendar reunião');
    await expect(page.locator('.calendly-inline-widget')).toBeVisible();
});
```

## 9. Performance Benchmarks

### Load Testing com k6
```javascript
// k6/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '2m', target: 100 }, // Ramp up
        { duration: '5m', target: 100 }, // Stay at 100 users
        { duration: '2m', target: 200 }, // Spike
        { duration: '5m', target: 200 }, // Stay at 200
        { duration: '2m', target: 0 },   // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
        http_req_failed: ['rate<0.1'],    // Error rate under 10%
    },
};

export default function () {
    const params = {
        headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': 'demo',
        },
    };
    
    // Test API endpoints
    const responses = http.batch([
        ['GET', `${__ENV.API_URL}/api/leads`, null, params],
        ['GET', `${__ENV.API_URL}/api/dashboard/metrics`, null, params],
        ['POST', `${__ENV.API_URL}/api/conversations`, JSON.stringify({
            message: 'Test message',
        }), params],
    ]);
    
    responses.forEach(response => {
        check(response, {
            'status is 200': (r) => r.status === 200,
            'response time < 500ms': (r) => r.timings.duration < 500,
        });
    });
    
    sleep(1);
}
```

## 10. Checklist de Lançamento

### Pre-Launch
- [ ] Todos os testes passando (unit, integration, e2e)
- [ ] Performance testada (suporta 1000+ req/s)
- [ ] Segurança auditada (OWASP Top 10)
- [ ] LGPD compliance verificado
- [ ] Backups automáticos configurados
- [ ] Monitoring e alertas ativos
- [ ] Documentação completa
- [ ] SSL/TLS configurado
- [ ] Rate limiting ativo
- [ ] Error tracking (Sentry) configurado

### Launch Day
- [ ] DNS configurado para produção
- [ ] Stripe em modo produção
- [ ] WhatsApp Business verificado
- [ ] Chatwoot em produção
- [ ] Emails transacionais testados
- [ ] Support channels prontos
- [ ] Status page ativa
- [ ] Rollback plan preparado

### Post-Launch
- [ ] Monitorar métricas de performance
- [ ] Revisar logs de erro
- [ ] Coletar feedback inicial
- [ ] Ajustar rate limits se necessário
- [ ] Documentar lições aprendidas

Implemente todas as otimizações com foco em performance, escalabilidade e confiabilidade.
```

---

## 📈 Métricas de Sucesso

### KPIs Técnicos
- **Uptime**: > 99.9%
- **Response Time**: P95 < 500ms
- **Error Rate**: < 0.1%
- **Test Coverage**: > 80%

### KPIs de Negócio
- **Taxa de Qualificação**: > 40%
- **Taxa de Conversão**: > 15%
- **Tempo Médio de Resposta**: < 2 min
- **Satisfação do Cliente**: > 4.5/5

---

## 🎯 Resumo Executivo

Este plano fornece uma implementação completa de um SaaS multi-tenant para assistente de vendas inteligente, dividido em 5 fases incrementais:

1. **Fase 0** (1 semana): Setup e arquitetura base
2. **Fase 1** (2 semanas): Fundação multi-tenant com RLS
3. **Fase 2** (3 semanas): Sistema conversacional com Chatwoot/WhatsApp
4. **Fase 3** (2 semanas): CRM e agendamento integrado
5. **Fase 4** (2 semanas): Billing (Stripe) e LGPD compliance
6. **Fase 5** (2 semanas): Otimização e preparação para produção

**Tempo Total**: 12 semanas
**Stack Principal**: Go + Next.js + PostgreSQL + Chatwoot + Stripe

Cada fase inclui um prompt detalhado para o Claude Code, permitindo implementação assistida por IA com especificações técnicas completas, código de exemplo e melhores práticas.

### Próximos Passos
1. Execute o prompt da Fase 0 no Claude Code para criar a estrutura inicial
2. Siga sequencialmente cada fase, testando incrementalmente
3. Ajuste os prompts conforme necessidades específicas do seu negócio
4. Mantenha foco em entregar valor incremental a cada fase

**Sucesso = Execução Disciplinada + Iteração Rápida + Foco no Cliente** 🚀# 🚀 Plano de Implementação SaaS - Assistente de Vendas Inteligente

## 📋 Visão Geral do Projeto

**Objetivo**: Construir um SaaS multi-tenant white-label para qualificação de leads e vendas, com canais WhatsApp e Web Chat, qualificação BANT automatizada, agendamento integrado e mini-CRM.

**Stack Principal**:
- Backend: Go (Fiber v3)
- Frontend: Next.js 14 + Tailwind CSS
- Banco: PostgreSQL com RLS
- Chat: Chatwoot
- Billing: Stripe
- Agendamento: Calendly/Cal.com

**Tempo Total**: 12 semanas
**Modelo de Entrega**: Fases incrementais com MVPs funcionais

---

## 📐 Fase 0: Preparação e Arquitetura (1 semana)

### Objetivos
- Estruturar projeto e ambiente de desenvolvimento
- Validar decisões técnicas com POCs
- Configurar ferramentas base

### Entregáveis
- Monorepo configurado
- Docker Compose funcional
- POCs de componentes críticos
- Documentação inicial

### 🤖 Prompt para Claude Code - Fase 0

```markdown
Crie a estrutura inicial de um projeto SaaS multi-tenant com as seguintes especificações:

## Estrutura do Projeto
Preciso de um monorepo com a seguinte organização:
- `/backend` - API em Go usando Fiber v3
- `/frontend` - Next.js 14 com App Router e Tailwind CSS
- `/database` - Migrations, seeds e documentação do banco
- `/docker` - Arquivos Docker e docker-compose
- `/docs` - Documentação técnica e de API

## Configuração Backend (Go)
1. Use Fiber v3 como framework web
2. Configure GORM como ORM com suporte a raw SQL
3. Implemente estrutura em Clean Architecture:
   - `/cmd/api` - Entry point
   - `/internal/domain` - Entidades e interfaces
   - `/internal/application` - Casos de uso
   - `/internal/infrastructure` - Implementações
   - `/internal/interfaces/http` - Handlers HTTP
4. Configure variáveis de ambiente com Viper
5. Adicione Makefile com comandos: dev, build, test, migrate

## Configuração Frontend (Next.js)
1. Next.js 14 com App Router
2. Tailwind CSS + shadcn/ui configurado
3. Estrutura de pastas:
   - `/app/(auth)` - Rotas de autenticação
   - `/app/(dashboard)` - Rotas autenticadas
   - `/components` - Componentes reutilizáveis
   - `/lib` - Utilitários e configurações
   - `/hooks` - Custom hooks
4. Configure Zustand para estado global
5. Configure React Query para cache de API

## Docker e Docker Compose
Crie um docker-compose.yml com:
- PostgreSQL 15 com extensões uuid-ossp e pgcrypto
- Redis para cache e filas
- Chatwoot (imagem oficial)
- Metabase para analytics
- MinIO para storage local (S3 compatible)
- Mailhog para emails em desenvolvimento

## Configuração do Banco de Dados
1. Configure PostgreSQL com RLS (Row Level Security)
2. Crie migration inicial com tabela `tenants`:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "pgcrypto";
   
   CREATE TABLE tenants (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     slug VARCHAR(63) UNIQUE NOT NULL,
     name VARCHAR(255) NOT NULL,
     settings JSONB DEFAULT '{}',
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
3. Configure GORM para executar SET LOCAL antes de cada query

## POCs Necessárias
Crie pequenas provas de conceito para:
1. Middleware de tenant extraction (subdomínio ou header)
2. RLS funcionando com tenant_id
3. Integração básica com Chatwoot API
4. JWT authentication com refresh tokens

## Arquivos de Configuração
Inclua:
- `.env.example` com todas variáveis necessárias
- `.gitignore` apropriado para Go e Next.js
- `README.md` com instruções de setup
- GitHub Actions workflow para CI básico

## Scripts e Automação
Adicione scripts no package.json e Makefile para:
- Setup inicial do ambiente
- Rodar migrations
- Seed de dados demo
- Iniciar todos os serviços

Por favor, gere todos os arquivos necessários com código funcional e comentários explicativos onde apropriado.
```

---

## 🏗️ Fase 1: Fundação Multi-tenant (2 semanas)

### Objetivos
- Implementar sistema multi-tenant com RLS completo
- Sistema de autenticação e autorização (RBAC)
- Interface administrativa básica
- Roteamento por tenant (subdomínio)

### Entregáveis
- Backend com multi-tenancy funcional
- Sistema de auth completo
- Dashboard básico por tenant
- Migrations e seeds

### 🤖 Prompt para Claude Code - Fase 1

```markdown
Implemente o sistema multi-tenant completo para o SaaS com os seguintes requisitos:

## 1. Schema do Banco de Dados
Crie migrations para as seguintes tabelas, todas com RLS habilitado:

```sql
-- Tenants (sem RLS, tabela global)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(63) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    settings JSONB DEFAULT '{}',
    subscription_status VARCHAR(50) DEFAULT 'trial',
    subscription_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'agent',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- Roles e Permissions
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Sessions/Refresh Tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 2. Row Level Security (RLS)
Implemente RLS para todas as tabelas exceto `tenants`:

```sql
-- Para cada tabela com tenant_id:
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON users
    USING (tenant_id = current_setting('app.current_tenant')::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);

-- Política especial para super admin (opcional)
CREATE POLICY super_admin_bypass ON users
    USING (current_setting('app.is_super_admin', true)::boolean = true);
```

## 3. Backend - Middleware e Services

### Middleware de Tenant
```go
// Extrair tenant do subdomínio ou header X-Tenant-ID
// Setar no contexto do PostgreSQL antes de cada query
// Validar se tenant existe e está ativo
```

### Serviço de Autenticação
- Login com email/senha
- JWT com claims de tenant_id e user_id
- Refresh token rotation
- Logout (invalidar refresh tokens)
- Password reset flow
- Validação de permissões (RBAC)

### Serviço de Tenant
- Criar novo tenant (onboarding)
- Atualizar configurações
- Gerenciar subdomínios
- Soft delete de tenant

## 4. API Endpoints
Implemente os seguintes endpoints:

```
POST   /api/auth/register        - Criar novo tenant + admin
POST   /api/auth/login          - Login
POST   /api/auth/refresh        - Renovar token
POST   /api/auth/logout         - Logout
POST   /api/auth/forgot-password - Solicitar reset
POST   /api/auth/reset-password  - Resetar senha

GET    /api/tenant              - Dados do tenant atual
PATCH  /api/tenant              - Atualizar tenant
GET    /api/tenant/users        - Listar usuários
POST   /api/tenant/users        - Criar usuário
PATCH  /api/tenant/users/:id    - Atualizar usuário
DELETE /api/tenant/users/:id    - Remover usuário

GET    /api/profile             - Perfil do usuário logado
PATCH  /api/profile             - Atualizar perfil
```

## 5. Frontend - Páginas e Componentes

### Estrutura de Rotas
```
/auth/login          - Página de login
/auth/register       - Registro de novo tenant
/auth/forgot         - Esqueci minha senha
/dashboard           - Dashboard principal
/settings           - Configurações do tenant
/settings/users     - Gerenciar usuários
/settings/billing   - Planos e cobrança
/profile           - Perfil do usuário
```

### Componentes Principais
1. Layout com sidebar responsivo
2. Header com tenant switcher (se usuário em múltiplos tenants)
3. Formulários de auth com validação (react-hook-form + zod)
4. Tabela de usuários com ações CRUD
5. Guards de rota por permissão
6. Theme provider para customização por tenant

## 6. Segurança e Boas Práticas
- Rate limiting por tenant
- Validação de inputs com Zod/Joi
- Sanitização contra SQL injection
- CORS configurado corretamente
- Headers de segurança (Helmet)
- Logs estruturados com contexto de tenant
- Testes unitários para RLS

## 7. Seeds e Dados de Teste
Crie seeds para:
- Tenant demo com slug "demo"
- 3 usuários: admin@demo.com, agent@demo.com, viewer@demo.com
- Roles: admin, agent, viewer com permissões apropriadas

## 8. Documentação
- README com instruções de setup
- Documentação da API (Swagger/OpenAPI)
- Guia de troubleshooting para RLS
- Exemplos de requisições com Insomnia/Postman

Implemente todo o código necessário com tratamento de erros apropriado e comentários onde necessário.
```

---

## 💬 Fase 2: MVP Conversacional (3 semanas)

### Objetivos
- Integração completa com Chatwoot
- Fluxo de qualificação BANT automatizado
- Integração WhatsApp Business
- Sistema de handoff para humanos

### Entregáveis
- Chat widget funcional
- WhatsApp configurado
- Máquina de estados BANT
- Sistema de filas e roteamento

### 🤖 Prompt para Claude Code - Fase 2

```markdown
Implemente o sistema conversacional completo integrado com Chatwoot e WhatsApp:

## 1. Schema do Banco - Conversações

```sql
CREATE TABLE inboxes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    channel VARCHAR(50) NOT NULL, -- 'web', 'whatsapp', 'api'
    chatwoot_inbox_id INTEGER,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    source VARCHAR(100),
    source_details JSONB DEFAULT '{}',
    stage VARCHAR(50) DEFAULT 'new',
    bant_score INTEGER DEFAULT 0,
    bant_data JSONB DEFAULT '{}',
    assigned_to UUID REFERENCES users(id),
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    inbox_id UUID REFERENCES inboxes(id),
    lead_id UUID REFERENCES leads(id),
    chatwoot_conversation_id INTEGER,
    status VARCHAR(50) DEFAULT 'open', -- open, pending, resolved, bot
    bot_state JSONB DEFAULT '{}',
    current_step VARCHAR(100),
    assigned_to UUID REFERENCES users(id),
    sla_due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    conversation_id UUID REFERENCES conversations(id),
    sender_type VARCHAR(50), -- 'lead', 'bot', 'agent'
    sender_id UUID,
    content TEXT,
    content_type VARCHAR(50) DEFAULT 'text',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE qualification_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    questions JSONB NOT NULL, -- Array of questions with scoring rules
    min_score_to_qualify INTEGER DEFAULT 70,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 2. Integração Chatwoot

### Setup Inicial
```go
// Serviço para gerenciar Chatwoot por tenant
type ChatwootService struct {
    BaseURL string
    APIKey  string
}

// Criar inbox para novo tenant
func (s *ChatwootService) CreateInbox(tenant Tenant) (*Inbox, error)

// Sincronizar conversas
func (s *ChatwootService) SyncConversations(tenantID uuid.UUID) error

// Enviar mensagem
func (s *ChatwootService) SendMessage(conversationID int, message string) error

// Atribuir agente
func (s *ChatwootService) AssignAgent(conversationID int, agentID int) error
```

### Webhooks do Chatwoot
```
POST /webhooks/chatwoot/:tenant_id
- conversation_created
- conversation_status_changed  
- message_created
- conversation_updated
```

## 3. WhatsApp Cloud API

### Configuração
```go
type WhatsAppConfig struct {
    PhoneNumberID string
    AccessToken   string
    VerifyToken   string
    WebhookURL    string
}

// Verificação do webhook
GET /webhooks/whatsapp/:tenant_id

// Receber mensagens
POST /webhooks/whatsapp/:tenant_id

// Enviar mensagem
func SendWhatsAppMessage(to string, message string, templateName string) error

// Enviar template aprovado
func SendWhatsAppTemplate(to string, templateName string, params []string) error
```

### Templates WhatsApp (para aprovar na Meta)
1. Boas-vindas com opt-in
2. Confirmação de agendamento
3. Lembrete de reunião
4. Follow-up pós-conversa

## 4. Máquina de Estados BANT

### Estrutura do Fluxo
```go
type BANTFlow struct {
    ID           uuid.UUID
    Name         string
    Steps        []BANTStep
    MinScore     int
    QualifyRules []Rule
}

type BANTStep struct {
    ID           string
    Question     string
    InputType    string // text, options, number, date
    Options      []Option
    ScoreRules   []ScoreRule
    NextStep     map[string]string // Conditional next steps
    Timeout      time.Duration
}

type ConversationState struct {
    TenantID        uuid.UUID
    ConversationID  uuid.UUID
    CurrentStep     string
    Responses       map[string]interface{}
    Score           int
    StartedAt       time.Time
    LastActivity    time.Time
}
```

### Implementação do Bot
```go
// Processar mensagem recebida
func ProcessMessage(state *ConversationState, message string) (*BotResponse, error) {
    // 1. Identificar intenção (sair, ajuda, etc)
    intent := AnalyzeIntent(message)
    
    // 2. Se pediu humano, fazer handoff
    if intent == "human" {
        return TriggerHandoff(state)
    }
    
    // 3. Processar resposta para step atual
    score := CalculateScore(state.CurrentStep, message)
    state.Score += score
    state.Responses[state.CurrentStep] = message
    
    // 4. Determinar próximo step
    nextStep := DetermineNextStep(state)
    
    // 5. Se completou, qualificar ou não
    if nextStep == "complete" {
        return CompleteQualification(state)
    }
    
    // 6. Retornar próxima pergunta
    return GetQuestion(nextStep), nil
}
```

### Perguntas BANT Padrão
```yaml
budget:
  question: "Qual é o orçamento previsto para esta solução?"
  options:
    - "Menos de R$ 1.000/mês": 10
    - "R$ 1.000 - R$ 5.000/mês": 30
    - "R$ 5.000 - R$ 10.000/mês": 40
    - "Acima de R$ 10.000/mês": 50

authority:
  question: "Você é responsável pela decisão de compra?"
  options:
    - "Sim, sou o decisor": 30
    - "Participo da decisão": 20
    - "Apenas pesquisando": 5

need:
  question: "Qual é seu principal desafio hoje?"
  type: "text"
  keywords:
    - "vendas": 10
    - "qualificação": 15
    - "conversão": 15
    - "automação": 10

timeline:
  question: "Quando pretende implementar uma solução?"
  options:
    - "Imediatamente": 20
    - "Próximos 30 dias": 15
    - "Próximos 3 meses": 10
    - "Apenas pesquisando": 0
```

## 5. Sistema de Handoff e Roteamento

### Regras de Roteamento
```go
type RoutingRule struct {
    ID          uuid.UUID
    TenantID    uuid.UUID
    Name        string
    Conditions  []Condition // score > 80, source = 'whatsapp', etc
    Action      string      // assign_team, assign_agent, add_tag
    Target      string      // team_id, agent_id, tag_name
    Priority    int
}

// Algoritmos de distribuição
type DistributionMethod string

const (
    RoundRobin  DistributionMethod = "round_robin"
    LeastBusy   DistributionMethod = "least_busy"  
    SkillBased  DistributionMethod = "skill_based"
    Manual      DistributionMethod = "manual"
)

func AssignConversation(conversation Conversation) (*User, error) {
    // 1. Avaliar regras de roteamento
    rules := GetRoutingRules(conversation.TenantID)
    
    // 2. Encontrar agente apropriado
    agent := SelectAgent(rules, conversation)
    
    // 3. Atribuir no Chatwoot
    chatwoot.AssignAgent(conversation.ChatwootID, agent.ChatwootID)
    
    // 4. Notificar agente
    NotifyAgent(agent, conversation)
    
    return agent, nil
}
```

## 6. Frontend - Interface do Chat

### Widget de Chat (Componente React)
```jsx
// Componente principal do chat
interface ChatWidgetProps {
  tenantId: string
  inboxId: string
  user?: User
  position?: 'bottom-right' | 'bottom-left'
  theme?: ChatTheme
}

// Estados do chat
interface ChatState {
  isOpen: boolean
  messages: Message[]
  isTyping: boolean
  currentFlow?: string
  connectionStatus: 'connected' | 'disconnected' | 'connecting'
}

// Integração com Chatwoot
- Usar Chatwoot SDK quando em modo agente
- Usar WebSocket próprio quando em modo bot
- Sincronizar estados entre bot e Chatwoot
```

### Dashboard de Conversas
```jsx
// Páginas necessárias
/conversations              - Lista de conversas
/conversations/:id          - Detalhes e histórico
/conversations/settings     - Configurar fluxos BANT
/conversations/routing      - Regras de roteamento
/conversations/templates    - Templates de mensagens

// Componentes
- ConversationList com filtros e busca
- ConversationDetail com timeline
- MessageComposer com templates
- BANTFlowBuilder (drag-and-drop)
- RoutingRulesEditor
```

## 7. Workers e Processamento Assíncrono

### Queue de Mensagens
```go
// Usar Redis + Asynq para processamento
type MessageProcessor struct {
    redis *redis.Client
    queue *asynq.Client
}

// Tasks
- ProcessIncomingMessage
- SendDelayedMessage
- CalculateMetrics
- SyncWithChatwoot
- HandleTimeout

// Exemplo de task
func ProcessIncomingMessage(ctx context.Context, t *asynq.Task) error {
    var payload MessagePayload
    json.Unmarshal(t.Payload(), &payload)
    
    // Processar com bot ou encaminhar
    if payload.ConversationStatus == "bot" {
        return ProcessBotMessage(payload)
    }
    
    return ForwardToAgent(payload)
}
```

## 8. Métricas e Analytics

### KPIs a Trackear
```sql
-- Métricas por tenant
CREATE VIEW conversation_metrics AS
SELECT
    tenant_id,
    DATE(created_at) as date,
    COUNT(*) as total_conversations,
    SUM(CASE WHEN bant_score >= 70 THEN 1 ELSE 0 END) as qualified_leads,
    AVG(bant_score) as avg_score,
    AVG(EXTRACT(EPOCH FROM (first_response_at - created_at))) as avg_response_time
FROM conversations
GROUP BY tenant_id, DATE(created_at);
```

## 9. Testes

### Testes de Integração
- Fluxo completo de qualificação
- Handoff bot -> humano
- Webhooks Chatwoot
- Webhooks WhatsApp
- RLS em conversas

### Testes E2E
- Conversa completa via widget
- Conversa completa via WhatsApp
- Roteamento por regras
- Timeout e fallbacks

## 10. Configuração e Deploy

### Variáveis de Ambiente
```env
# Chatwoot
CHATWOOT_BASE_URL=
CHATWOOT_API_KEY=
CHATWOOT_WEBHOOK_SECRET=

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_WEBHOOK_URL=

# Redis (para queues)
REDIS_URL=

# Bot Config
BOT_DEFAULT_TIMEOUT=5m
BOT_MAX_RETRIES=3
```

Implemente todo o sistema com tratamento de erros, logs estruturados e documentação inline.
```

---

## 📊 Fase 3: CRM e Agendamento (2 semanas)

### Objetivos
- Mini-CRM funcional com pipeline
- Integração com Calendly/Cal.com
- Dashboard com Metabase
- Conectores HubSpot/Pipedrive

### Entregáveis
- CRUD completo de leads/deals
- Agendamento integrado ao chat
- Dashboard com métricas
- Import/Export de dados

### 🤖 Prompt para Claude Code - Fase 3

```markdown
Implemente o sistema de CRM e agendamento integrado:

## 1. Schema do CRM

```sql
-- Empresas/Contas
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    industry VARCHAR(100),
    size VARCHAR(50), -- '1-10', '11-50', '51-200', etc
    website VARCHAR(255),
    linkedin VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contatos (além dos leads)
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    lead_id UUID REFERENCES leads(id),
    company_id UUID REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    position VARCHAR(255),
    linkedin VARCHAR(255),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pipeline de Vendas
CREATE TABLE pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    stages JSONB NOT NULL, -- [{id, name, order, probability}]
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deals/Oportunidades
CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    pipeline_id UUID REFERENCES pipelines(id),
    lead_id UUID REFERENCES leads(id),
    company_id UUID REFERENCES companies(id),
    title VARCHAR(255) NOT NULL,
    value DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'BRL',
    stage VARCHAR(100),
    probability INTEGER DEFAULT 0,
    expected_close_date DATE,
    owner_id UUID REFERENCES users(id),
    lost_reason VARCHAR(255),
    won_at TIMESTAMPTZ,
    lost_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Atividades
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    type VARCHAR(50), -- 'call', 'email', 'meeting', 'task', 'note'
    subject VARCHAR(255),
    description TEXT,
    deal_id UUID REFERENCES deals(id),
    lead_id UUID REFERENCES leads(id),
    contact_id UUID REFERENCES contacts(id),
    assigned_to UUID REFERENCES users(id),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    outcome VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meetings/Agendamentos
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    deal_id UUID REFERENCES deals(id),
    lead_id UUID REFERENCES leads(id),
    title VARCHAR(255),
    description TEXT,
    provider VARCHAR(50), -- 'calendly', 'cal.com', 'google', 'manual'
    provider_event_id VARCHAR(255),
    provider_event_url TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(100),
    location TEXT,
    attendees JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'scheduled',
    canceled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom Fields
CREATE TABLE custom_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    entity_type VARCHAR(50), -- 'lead', 'deal', 'contact', 'company'
    field_name VARCHAR(100),
    field_type VARCHAR(50), -- 'text', 'number', 'date', 'select', 'multiselect'
    field_options JSONB,
    is_required BOOLEAN DEFAULT false,
    display_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE custom_field_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    custom_field_id UUID REFERENCES custom_fields(id),
    entity_id UUID NOT NULL,
    value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 2. API do CRM

### Endpoints CRUD
```
# Leads
GET    /api/crm/leads               - Listar com filtros
GET    /api/crm/leads/:id          - Detalhes + timeline
POST   /api/crm/leads              - Criar lead
PATCH  /api/crm/leads/:id          - Atualizar lead
DELETE /api/crm/leads/:id          - Deletar lead
POST   /api/crm/leads/:id/convert  - Converter em deal

# Deals
GET    /api/crm/deals               - Listar com filtros
GET    /api/crm/deals/:id          - Detalhes completos
POST   /api/crm/deals              - Criar deal
PATCH  /api/crm/deals/:id          - Atualizar deal
POST   /api/crm/deals/:id/win      - Marcar como ganha
POST   /api/crm/deals/:id/lose     - Marcar como perdida

# Pipeline
GET    /api/crm/pipelines           - Listar pipelines
POST   /api/crm/pipelines          - Criar pipeline
PATCH  /api/crm/pipelines/:id      - Atualizar stages
POST   /api/crm/deals/:id/move     - Mover deal de stage

# Atividades
GET    /api/crm/activities          - Listar atividades
POST   /api/crm/activities         - Criar atividade
PATCH  /api/crm/activities/:id     - Atualizar
POST   /api/crm/activities/:id/complete - Completar

# Companies & Contacts
GET    /api/crm/companies
POST   /api/crm/companies
GET    /api/crm/contacts
POST   /api/crm/contacts
```

### Serviços do CRM
```go
type CRMService struct {
    db *gorm.DB
}

// Lead scoring automático
func (s *CRMService) CalculateLeadScore(lead *Lead) int {
    score := 0
    
    // BANT Score
    score += lead.BANTScore
    
    // Engajamento
    if lead.EmailOpens > 5 { score += 10 }
    if lead.ConversationCount > 3 { score += 15 }
    
    // Fit da empresa
    if lead.CompanySize > 50 { score += 20 }
    
    return score
}

// Conversão de lead em deal
func (s *CRMService) ConvertLeadToDeal(leadID uuid.UUID) (*Deal, error) {
    // 1. Buscar lead
    // 2. Criar/associar company
    // 3. Criar deal com dados do lead
    // 4. Atualizar status do lead
    // 5. Criar atividade de conversão
}

// Pipeline management
func (s *CRMService) MoveDealToStage(dealID uuid.UUID, newStage string) error {
    // 1. Validar stage existe
    // 2. Atualizar deal
    // 3. Atualizar probabilidade
    // 4. Criar atividade
    // 5. Trigger automações
}
```

## 3. Integração com Calendly

### Configuração
```go
type CalendlyIntegration struct {
    TenantID    uuid.UUID
    AccessToken string
    UserURI     string
    EventTypes  []CalendlyEventType
}

// Webhook handler
func HandleCalendlyWebhook(c *fiber.Ctx) error {
    var webhook CalendlyWebhook
    c.BodyParser(&webhook)
    
    switch webhook.Event {
    case "invitee.created":
        // Criar meeting
        meeting := CreateMeetingFromCalendly(webhook.Payload)
        
        // Notificar no chat se houver conversa ativa
        NotifyInChat(meeting)
        
        // Criar atividade no CRM
        CreateActivity("meeting_scheduled", meeting)
        
    case "invitee.canceled":
        // Atualizar status
        CancelMeeting(webhook.Payload.URI)
    }
    
    return c.SendStatus(200)
}

// Gerar link de agendamento
func GenerateSchedulingLink(leadID uuid.UUID) (string, error) {
    lead := GetLead(leadID)
    
    // Criar link com prefill
    link := fmt.Sprintf(
        "https://calendly.com/your-org/discovery-call?name=%s&email=%s&a1=%s",
        url.QueryEscape(lead.Name),
        url.QueryEscape(lead.Email),
        url.QueryEscape(leadID.String()),
    )
    
    return link, nil
}
```

### Embed no Chat
```javascript
// Componente React para embed
const CalendlyEmbed = ({ leadId, onScheduled }) => {
    useEffect(() => {
        const head = document.querySelector('head');
        const script = document.createElement('script');
        script.setAttribute('src', 'https://assets.calendly.com/assets/external/widget.js');
        head.appendChild(script);
        
        // Listener para evento de agendamento
        window.addEventListener('message', (e) => {
            if (e.data.event === 'calendly.event_scheduled') {
                onScheduled(e.data.payload);
            }
        });
    }, []);
    
    return (
        <div 
            className="calendly-inline-widget" 
            data-url={`https://calendly.com/your-org/discovery-call?hide_event_type_details=1&primary_color=1a73e8`}
            style={{ minWidth: '320px', height: '630px' }}
        />
    );
};
```

## 4. Integração com Cal.com (Alternativa)

```go
// Cal.com tem API similar mas self-hosted
type CalComIntegration struct {
    BaseURL     string
    APIKey      string
    TenantID    uuid.UUID
}

func (c *CalComIntegration) CreateBooking(data BookingData) (*Booking, error) {
    // POST /api/bookings
}

func (c *CalComIntegration) GetAvailability(date time.Time) ([]Slot, error) {
    // GET /api/availability
}

// Webhooks similares ao Calendly
```

## 5. Dashboard com Metabase

### Setup Metabase
```yaml
# docker-compose.yml adicional
metabase:
  image: metabase/metabase:latest
  environment:
    MB_DB_TYPE: postgres
    MB_DB_DBNAME: metabase
    MB_DB_PORT: 5432
    MB_DB_USER: metabase
    MB_DB_PASS: secret
  ports:
    - "3001:3000"
```

### Queries do Dashboard
```sql
-- Funil de Vendas
CREATE VIEW sales_funnel AS
SELECT 
    tenant_id,
    stage,
    COUNT(*) as count,
    SUM(value) as total_value,
    AVG(value) as avg_value,
    AVG(probability) as avg_probability
FROM deals
WHERE lost_at IS NULL
GROUP BY tenant_id, stage;

-- Taxa de Conversão
CREATE VIEW conversion_metrics AS
SELECT
    tenant_id,
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as total_leads,
    SUM(CASE WHEN bant_score >= 70 THEN 1 ELSE 0 END) as qualified_leads,
    SUM(CASE WHEN converted_to_deal THEN 1 ELSE 0 END) as converted_deals,
    ROUND(100.0 * SUM(CASE WHEN bant_score >= 70 THEN 1 ELSE 0 END) / COUNT(*), 2) as qualification_rate,
    ROUND(100.0 * SUM(CASE WHEN converted_to_deal THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN bant_score >= 70 THEN 1 ELSE 0 END), 0), 2) as close_rate
FROM leads
GROUP BY tenant_id, month;

-- Performance por Agente
CREATE VIEW agent_performance AS
SELECT
    u.tenant_id,
    u.id as agent_id,
    u.name as agent_name,
    COUNT(DISTINCT d.id) as total_deals,
    SUM(CASE WHEN d.won_at IS NOT NULL THEN 1 ELSE 0 END) as won_deals,
    SUM(CASE WHEN d.won_at IS NOT NULL THEN d.value ELSE 0 END) as revenue,
    AVG(EXTRACT(DAY FROM d.won_at - d.created_at)) as avg_sales_cycle
FROM users u
LEFT JOIN deals d ON d.owner_id = u.id
WHERE u.role IN ('agent', 'admin')
GROUP BY u.tenant_id, u.id, u.name;

-- Origem dos Leads
CREATE VIEW lead_sources AS
SELECT
    tenant_id,
    source,
    COUNT(*) as count,
    AVG(bant_score) as avg_score,
    SUM(CASE WHEN converted_to_deal THEN 1 ELSE 0 END) as conversions
FROM leads
GROUP BY tenant_id, source;
```

### Embed no Frontend
```javascript
// Componente para embed seguro
const MetabaseDashboard = ({ tenantId, dashboardId }) => {
    const [embedUrl, setEmbedUrl] = useState('');
    
    useEffect(() => {
        // Gerar JWT com tenant_id para embed seguro
        fetch('/api/metabase/embed-url', {
            method: 'POST',
            body: JSON.stringify({ 
                dashboardId,
                params: { tenant_id: tenantId }
            })
        })
        .then(res => res.json())
        .then(data => setEmbedUrl(data.url));
    }, [tenantId, dashboardId]);
    
    return (
        <iframe
            src={embedUrl}
            width="100%"
            height="600"
            frameBorder="0"
            allowFullScreen
        />
    );
};
```

## 6. Conectores CRM Externos

### HubSpot Integration
```go
type HubSpotConnector struct {
    AccessToken string
    TenantID    uuid.UUID
}

// Sincronizar contatos
func (h *HubSpotConnector) SyncContacts() error {
    // GET /crm/v3/objects/contacts
    contacts := h.GetContacts()
    
    for _, contact := range contacts {
        // Mapear para modelo interno
        lead := MapHubSpotToLead(contact)
        CreateOrUpdateLead(lead)
    }
}

// Criar deal no HubSpot
func (h *HubSpotConnector) CreateDeal(deal *Deal) error {
    hubspotDeal := map[string]interface{}{
        "properties": {
            "dealname": deal.Title,
            "amount": deal.Value,
            "dealstage": MapStageToHubSpot(deal.Stage),
        },
    }
    
    // POST /crm/v3/objects/deals
    return h.Post("/crm/v3/objects/deals", hubspotDeal)
}

// Webhook handler
func HandleHubSpotWebhook(c *fiber.Ctx) error {
    // Validar assinatura
    if !ValidateHubSpotSignature(c) {
        return c.SendStatus(401)
    }
    
    var events []HubSpotEvent
    c.BodyParser(&events)
    
    for _, event := range events {
        ProcessHubSpotEvent(event)
    }
}
```

### Pipedrive Integration
```go
type PipedriveConnector struct {
    APIToken string
    TenantID uuid.UUID
}

// Similar ao HubSpot mas com API do Pipedrive
func (p *PipedriveConnector) SyncDeals() error {
    // GET /deals
    deals := p.GetDeals()
    
    for _, deal := range deals {
        internalDeal := MapPipedriveToDeal(deal)
        CreateOrUpdateDeal(internalDeal)
    }
}
```

## 7. Import/Export de Dados

### Import CSV
```go
func ImportLeadsFromCSV(file *multipart.FileHeader, tenantID uuid.UUID) error {
    // 1. Parse CSV
    records := ParseCSV(file)
    
    // 2. Validar campos
    errors := ValidateCSVData(records)
    if len(errors) > 0 {
        return errors
    }
    
    // 3. Mapear colunas
    mapping := DetectColumnMapping(records[0])
    
    // 4. Processar em batch
    for batch := range BatchRecords(records, 100) {
        leads := MapRecordsToLeads(batch, mapping)
        BulkCreateLeads(leads, tenantID)
    }
}

// Export para CSV/Excel
func ExportLeads(filters LeadFilters, format string) ([]byte, error) {
    leads := GetLeadsWithFilters(filters)
    
    switch format {
    case "csv":
        return GenerateCSV(leads)
    case "xlsx":
        return GenerateExcel(leads)
    case "json":
        return json.Marshal(leads)
    }
}
```

## 8. Frontend - Páginas do CRM

### Lista de Leads/Deals
```jsx
// Componente de tabela com filtros
const LeadsTable = () => {
    const [filters, setFilters] = useState({
        stage: 'all',
        source: 'all',
        assignee: 'all',
        dateRange: 'last_30_days'
    });
    
    const { data: leads, isLoading } = useQuery(
        ['leads', filters],
        () => fetchLeads(filters)
    );
    
    return (
        <DataTable
            columns={leadColumns}
            data={leads}
            filters={<LeadFilters onChange={setFilters} />}
            actions={<BulkActions />}
        />
    );
};
```

### Pipeline Kanban
```jsx
// Board de deals estilo Kanban
const PipelineBoard = () => {
    const [pipeline, setPipeline] = useState(null);
    const { data: deals } = useQuery(['deals', pipeline?.id]);
    
    const onDragEnd = (result) => {
        // Mover deal entre stages
        moveDeal(result.draggableId, result.destination.droppableId);
    };
    
    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 overflow-x-auto">
                {pipeline?.stages.map(stage => (
                    <StageColumn
                        key={stage.id}
                        stage={stage}
                        deals={deals.filter(d => d.stage === stage.id)}
                    />
                ))}
            </div>
        </DragDropContext>
    );
};
```

## 9. Automações do CRM

### Triggers e Ações
```go
type Automation struct {
    ID          uuid.UUID
    TenantID    uuid.UUID
    Name        string
    Trigger     Trigger    // deal_stage_changed, lead_score_changed, etc
    Conditions  []Condition
    Actions     []Action   // send_email, create_task, update_field
    IsActive    bool
}

func ProcessAutomation(event Event) {
    automations := GetAutomationsForEvent(event)
    
    for _, automation := range automations {
        if EvaluateConditions(automation.Conditions, event) {
            ExecuteActions(automation.Actions, event)
        }
    }
}
```

## 10. Testes e Documentação

### Testes do CRM
```go
func TestLeadConversion(t *testing.T) {
    // Criar lead qualificado
    lead := CreateTestLead(tenantID, BANTScore: 85)
    
    // Converter em deal
    deal, err := ConvertLeadToDeal(lead.ID)
    assert.NoError(t, err)
    assert.Equal(t, lead.ID, deal.LeadID)
    
    // Verificar lead marcado como convertido
    updatedLead := GetLead(lead.ID)
    assert.True(t, updatedLead.ConvertedToDeal)
}
```

Implemente todos os componentes com validações, tratamento de erros e testes apropriados.
```

---

## 💰 Fase 4: Billing e Compliance (2 semanas)

### Objetivos
- Sistema de cobrança com Stripe
- Portal do cliente
- Implementação completa LGPD
- Gestão de planos e limites

### Entregáveis
- Checkout e assinaturas funcionando
- Portal self-service
- Compliance LGPD
- Usage-based billing

### 🤖 Prompt para Claude Code - Fase 4

```markdown
Implemente o sistema completo de billing com Stripe e compliance LGPD:

## 1. Schema de Billing e Compliance

```sql
-- Planos e Preços
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_product_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    features JSONB DEFAULT '[]',
    limits JSONB DEFAULT '{}', -- {users: 5, messages: 1000, etc}
    price_monthly DECIMAL(10,2),
    price_yearly DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'BRL',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assinaturas
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    plan_id UUID REFERENCES plans(id),
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    status VARCHAR(50), -- active, canceled, past_due, etc
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Uso e Métricas
CREATE TABLE usage_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    subscription_id UUID REFERENCES subscriptions(id),
    metric_name VARCHAR(100), -- messages_sent, api_calls, storage_gb
    quantity DECIMAL(10,2),
    unit VARCHAR(50),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    reported_to_stripe BOOLEAN DEFAULT false,
    stripe_usage_record_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices/Faturas
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    subscription_id UUID REFERENCES subscriptions(id),
    stripe_invoice_id VARCHAR(255),
    number VARCHAR(100),
    status VARCHAR(50),
    amount_due DECIMAL(10,2),
    amount_paid DECIMAL(10,2),
    currency VARCHAR(3),
    due_date DATE,
    paid_at TIMESTAMPTZ,
    invoice_pdf TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LGPD - Consentimentos
CREATE TABLE privacy_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    data_subject_id UUID NOT NULL, -- lead_id ou user_id
    data_subject_type VARCHAR(50), -- 'lead', 'user', 'contact'
    purpose VARCHAR(255), -- 'marketing', 'analytics', 'processing'
    legal_basis VARCHAR(100), -- 'consent', 'contract', 'legitimate_interest'
    consent_text TEXT,
    ip_address INET,
    user_agent TEXT,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT
);

-- LGPD - Requisições do Titular
CREATE TABLE data_subject_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    request_type VARCHAR(50), -- 'access', 'rectification', 'deletion', 'portability'
    requester_email VARCHAR(255),
    requester_name VARCHAR(255),
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES users(id),
    response_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LGPD - DPO/Encarregado
CREATE TABLE data_protection_officers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 2. Integração Stripe - Setup

### Configuração Inicial
```go
type StripeService struct {
    apiKey     string
    webhookKey string
    tenantID   uuid.UUID
}

func InitStripe() {
    stripe.Key = os.Getenv("STRIPE_SECRET_KEY")
}

// Criar produtos e preços no Stripe
func SetupStripePlans() error {
    plans := []Plan{
        {
            Name: "Starter",
            PriceMonthly: 299,
            Features: []string{"5 usuários", "1000 mensagens/mês", "1 inbox"},
        },
        {
            Name: "Growth", 
            PriceMonthly: 799,
            Features: []string{"15 usuários", "5000 mensagens/mês", "3 inboxes"},
        },
        {
            Name: "Enterprise",
            PriceMonthly: 2499,
            Features: []string{"Usuários ilimitados", "Mensagens ilimitadas", "Inboxes ilimitados"},
        },
    }
    
    for _, plan := range plans {
        // Criar produto
        product, _ := product.New(&stripe.ProductParams{
            Name: stripe.String(plan.Name),
            Description: stripe.String(strings.Join(plan.Features, ", ")),
        })
        
        // Criar preço mensal
        price.New(&stripe.PriceParams{
            Product: stripe.String(product.ID),
            UnitAmount: stripe.Int64(int64(plan.PriceMonthly * 100)),
            Currency: stripe.String("brl"),
            Recurring: &stripe.PriceRecurringParams{
                Interval: stripe.String("month"),
            },
        })
        
        // Salvar IDs no banco
        plan.StripeProductID = product.ID
        SavePlan(plan)
    }
}
```

## 3. Checkout e Portal do Cliente

### Checkout Session
```go
func CreateCheckoutSession(tenantID uuid.UUID, planID uuid.UUID) (*stripe.CheckoutSession, error) {
    tenant := GetTenant(tenantID)
    plan := GetPlan(planID)
    
    params := &stripe.CheckoutSessionParams{
        Mode: stripe.String("subscription"),
        LineItems: []*stripe.CheckoutSessionLineItemParams{
            {
                Price: stripe.String(plan.StripePriceID),
                Quantity: stripe.Int64(1),
            },
        },
        CustomerEmail: stripe.String(tenant.BillingEmail),
        SuccessURL: stripe.String(fmt.Sprintf("%s/billing/success?session_id={CHECKOUT_SESSION_ID}", BaseURL)),
        CancelURL: stripe.String(fmt.Sprintf("%s/billing/cancel", BaseURL)),
        Metadata: map[string]string{
            "tenant_id": tenantID.String(),
            "plan_id": planID.String(),
        },
        SubscriptionData: &stripe.CheckoutSessionSubscriptionDataParams{
            TrialPeriodDays: stripe.Int64(14),
            Metadata: map[string]string{
                "tenant_id": tenantID.String(),
            },
        },
    }
    
    return session.New(params)
}

// Customer Portal para self-service
func CreatePortalSession(tenantID uuid.UUID) (*stripe.BillingPortalSession, error) {
    sub := GetSubscription(tenantID)
    
    params := &stripe.BillingPortalSessionParams{
        Customer: stripe.String(sub.StripeCustomerID),
        ReturnURL: stripe.String(fmt.Sprintf("%s/billing", BaseURL)),
    }
    
    return billingportalsession.New(params)
}
```

### Webhooks Handler
```go
func HandleStripeWebhook(c *fiber.Ctx) error {
    // Validar assinatura
    event, err := webhook.ConstructEvent(
        c.Body(),
        c.Get("Stripe-Signature"),
        webhookSecret,
    )
    if err != nil {
        return c.SendStatus(400)
    }
    
    switch event.Type {
    case "checkout.session.completed":
        var session stripe.CheckoutSession
        json.Unmarshal(event.Data.Raw, &session)
        
        // Criar subscription no banco
        CreateSubscriptionFromCheckout(session)
        
    case "customer.subscription.updated":
        var sub stripe.Subscription
        json.Unmarshal(event.Data.Raw, &sub)
        
        // Atualizar status
        UpdateSubscriptionStatus(sub)
        
    case "customer.subscription.deleted":
        var sub stripe.Subscription
        json.Unmarshal(event.Data.Raw, &sub)
        
        // Cancelar acesso
        CancelSubscription(sub)
        
    case "invoice.payment_succeeded":
        var invoice stripe.Invoice
        json.Unmarshal(event.Data.Raw, &invoice)
        
        // Registrar pagamento
        RecordPayment(invoice)
        
    case "invoice.payment_failed":
        var invoice stripe.Invoice
        json.Unmarshal(event.Data.Raw, &invoice)
        
        // Notificar e possivelmente suspender
        HandleFailedPayment(invoice)
    }
    
    return c.SendStatus(200)
}
```

## 4. Usage-Based Billing

### Tracking de Uso
```go
type UsageTracker struct {
    redis *redis.Client
    db    *gorm.DB
}

// Registrar uso em tempo real
func (u *UsageTracker) TrackUsage(tenantID uuid.UUID, metric string, quantity float64) {
    key := fmt.Sprintf("usage:%s:%s:%s", 
        tenantID, 
        metric,
        time.Now().Format("2006-01"))
    
    // Incrementar no Redis
    u.redis.IncrByFloat(context.Background(), key, quantity)
    
    // Enfileirar para processamento
    EnqueueUsageProcessing(tenantID, metric)
}

// Processar e reportar ao Stripe
func (u *UsageTracker) ProcessMonthlyUsage() error {
    tenants := GetAllActiveTenants()
    
    for _, tenant := range tenants {
        usage := CalculateTenantUsage(tenant.ID)
        
        // Reportar ao Stripe se exceder limites do plano
        if usage.Messages > tenant.Plan.MessageLimit {
            overage := usage.Messages - tenant.Plan.MessageLimit
            
            usageRecord.New(&stripe.UsageRecordParams{
                SubscriptionItem: stripe.String(tenant.StripeSubscriptionItemID),
                Quantity: stripe.Int64(int64(overage)),
                Timestamp: stripe.Int64(time.Now().Unix()),
                Action: stripe.String("increment"),
            })
        }
        
        // Salvar no banco
        SaveUsageRecord(usage)
    }
    
    return nil
}
```

### Limites e Quotas
```go
func CheckQuota(tenantID uuid.UUID, resource string) error {
    tenant := GetTenantWithPlan(tenantID)
    usage := GetCurrentUsage(tenantID)
    
    switch resource {
    case "messages":
        if usage.Messages >= tenant.Plan.MessageLimit {
            return ErrQuotaExceeded
        }
    case "users":
        if usage.Users >= tenant.Plan.UserLimit {
            return ErrUserLimitReached
        }
    case "storage":
        if usage.StorageGB >= tenant.Plan.StorageLimit {
            return ErrStorageLimitReached
        }
    }
    
    return nil
}

// Middleware para verificar quotas
func QuotaMiddleware(resource string) fiber.Handler {
    return func(c *fiber.Ctx) error {
        tenantID := c.Locals("tenant_id").(uuid.UUID)
        
        if err := CheckQuota(tenantID, resource); err != nil {
            return c.Status(402).JSON(fiber.Map{
                "error": "Quota exceeded",
                "upgrade_url": "/billing/upgrade",
            })
        }
        
        return c.Next()
    }
}
```

## 5. LGPD - Portal do Titular

### API de Direitos LGPD
```go
// Endpoints LGPD
router.Post("/lgpd/consent", RecordConsent)
router.Delete("/lgpd/consent/:id", RevokeConsent)
router.Post("/lgpd/request/access", RequestDataAccess)
router.Post("/lgpd/request/rectification", RequestRectification)
router.Post("/lgpd/request/deletion", RequestDeletion)
router.Post("/lgpd/request/portability", RequestPortability)
router.Get("/lgpd/my-data", GetMyData)

// Implementação dos direitos
func RequestDataAccess(c *fiber.Ctx) error {
    var req DataAccessRequest
    c.BodyParser(&req)
    
    // Criar requisição
    request := DataSubjectRequest{
        TenantID: GetTenantID(c),
        Type: "access",
        RequesterEmail: req.Email,
        Status: "pending",
    }
    
    SaveRequest(&request)
    
    // Processar (pode ser assíncrono)
    go ProcessDataRequest(request)
    
    return c.JSON(fiber.Map{
        "message": "Sua solicitação foi recebida e será processada em até 30 dias",
        "request_id": request.ID,
    })
}

func ProcessDataRequest(request DataSubjectRequest) {
    switch request.Type {
    case "access":
        // Coletar todos os dados
        data := CollectAllUserData(request.RequesterEmail)
        
        // Gerar relatório
        report := GenerateDataReport(data)
        
        // Enviar por email
        SendDataReport(request.RequesterEmail, report)
        
    case "deletion":
        // Anonimizar ou deletar
        AnonymizeUserData(request.RequesterEmail)
        
    case "portability":
        // Exportar em formato estruturado
        export := ExportUserData(request.RequesterEmail, "json")
        SendDataExport(request.RequesterEmail, export)
    }
    
    // Marcar como processado
    UpdateRequestStatus(request.ID, "completed")
}
```

### Anonimização de Dados
```go
func AnonymizeUserData(identifier string) error {
    // Encontrar todos os registros
    leads := FindLeadsByEmail(identifier)
    
    for _, lead := range leads {
        // Anonimizar mas manter para analytics
        lead.Name = "ANONIMIZADO"
        lead.Email = fmt.Sprintf("anon_%s@removed.com", GenerateHash(lead.Email))
        lead.Phone = "000000000"
        
        // Manter metadados para estatísticas
        lead.Metadata["anonym