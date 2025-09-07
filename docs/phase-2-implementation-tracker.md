# 🚀 Fase 2: MVP Conversacional - Tracker de Implementação

## 📊 Status Geral
- **Início:** 07/01/2025
- **Previsão:** 3 semanas
- **Progresso:** 0% ⏳
- **Última Atualização:** 07/01/2025

## 🎯 Objetivos da Fase 2
- Integração completa com Chatwoot
- Fluxo de qualificação BANT automatizado
- Web Chat Widget funcional
- Integração WhatsApp Business
- Integração Instagram via Chatwoot
- Sistema de handoff para humanos

## 📱 Estratégia de Canais (Ordem de Prioridade)

### 1️⃣ Web Chat Widget (Semana 1) - PRIORIDADE MÁXIMA
**Por que primeiro?**
- ✅ Mais rápido de implementar e testar
- ✅ Não requer configurações externas
- ✅ Teste local imediato no browser
- ✅ Base para outros canais

**Como testar:**
```bash
# Simplesmente abrir no navegador
http://localhost:3003/test-chat

# Ou embedar em qualquer página HTML
<script src="http://localhost:3003/chat-widget.js"></script>
```

### 2️⃣ WhatsApp Business (Semana 2)
**Configuração necessária:**
1. Criar conta em [developers.facebook.com](https://developers.facebook.com)
2. Criar App com WhatsApp Business
3. Obter Test Number (gratuito)
4. Configurar webhooks

**Como testar:**
- Enviar mensagem para o Test Number configurado
- Ver resposta automática do bot
- Acompanhar no dashboard

### 3️⃣ Instagram (Semana 3)
**Configuração via Chatwoot:**
1. Conectar página do Instagram no Chatwoot
2. Autorizar permissões
3. Configurar auto-resposta

**Como testar:**
- Enviar DM para sua própria página
- Ver unificado no dashboard

---

## 📋 Tarefas de Implementação

### 🗓️ Semana 1: Web Chat e Infraestrutura Base

#### Dia 1-2: Setup e Schema
- [ ] Configurar Chatwoot corretamente no Docker
  - [ ] Criar database separado `chatwoot_production`
  - [ ] Gerar SECRET_KEY_BASE seguro
  - [ ] Configurar FRONTEND_URL correto
  - [ ] Testar acesso em http://localhost:3000

- [ ] Criar migrations do banco
  ```sql
  006_create_conversation_tables.sql
  - inboxes (canais de comunicação)
  - leads (informações dos leads)
  - conversations (conversas ativas)
  - messages (histórico de mensagens)
  - conversation_states (estado do bot)
  ```

- [ ] Implementar RLS nas novas tabelas
  - [ ] Policies para tenant isolation
  - [ ] Indexes para performance

#### Dia 3-4: Domain e Services
- [ ] Criar domain models
  - [ ] `/internal/domain/lead.go`
  - [ ] `/internal/domain/conversation.go`
  - [ ] `/internal/domain/message.go`
  - [ ] `/internal/domain/qualification_flow.go`

- [ ] Implementar services
  - [ ] `/internal/application/conversation_service.go`
  - [ ] `/internal/application/bot_service.go`
  - [ ] `/internal/application/lead_service.go`

- [ ] Criar repositories
  - [ ] `/internal/infrastructure/repository/lead_repository.go`
  - [ ] `/internal/infrastructure/repository/conversation_repository.go`

#### Dia 5: Web Chat Widget
- [ ] Backend - Widget API
  - [ ] Endpoint `/api/widget/init` - Inicializar chat
  - [ ] Endpoint `/api/widget/message` - Enviar mensagem
  - [ ] WebSocket handler para real-time

- [ ] Frontend - Componente React
  - [ ] `/components/chat/widget.tsx`
  - [ ] Styling com branding Widia (preto/branco)
  - [ ] Animações suaves
  - [ ] Typing indicator
  - [ ] Message bubbles

- [ ] Página de teste
  - [ ] `/app/test-chat/page.tsx`
  - [ ] Embed do widget
  - [ ] Debug panel

### 🗓️ Semana 2: Bot Intelligence e WhatsApp

#### Dia 6-7: Fluxo BANT
- [ ] Implementar máquina de estados
  ```go
  type BANTFlow struct {
    CurrentStep string
    Responses map[string]interface{}
    Score int
    QualificationStatus string
  }
  ```

- [ ] Perguntas padrão BANT
  - [ ] Budget: "Qual é o orçamento previsto?"
  - [ ] Authority: "Você toma a decisão de compra?"
  - [ ] Need: "Qual seu principal desafio?"
  - [ ] Timeline: "Quando pretende implementar?"

- [ ] Sistema de pontuação
  - [ ] Score calculation
  - [ ] Qualification rules (>70 = qualificado)
  - [ ] Auto-tagging de leads

#### Dia 8-9: WhatsApp Integration
- [ ] Setup Meta Developer
  - [ ] Criar App no Facebook Developers
  - [ ] Configurar WhatsApp Business API
  - [ ] Obter tokens e credentials

- [ ] Implementar cliente WhatsApp
  - [ ] `/pkg/whatsapp/client.go`
  - [ ] Send message
  - [ ] Receive webhook
  - [ ] Media handling

- [ ] Webhook handlers
  - [ ] `/api/webhooks/whatsapp/:tenant_id`
  - [ ] Verificação de assinatura
  - [ ] Process incoming messages
  - [ ] Status updates

#### Dia 10: Sistema de Handoff
- [ ] Routing rules
  - [ ] Por score BANT
  - [ ] Por palavras-chave
  - [ ] Por timeout

- [ ] Assignment de agentes
  - [ ] Round-robin
  - [ ] Least busy
  - [ ] Skill-based

- [ ] Notificações
  - [ ] WebSocket para agentes
  - [ ] Email alerts
  - [ ] Dashboard indicators

### 🗓️ Semana 3: Dashboard e Instagram

#### Dia 11-12: Dashboard de Conversações
- [ ] Lista de conversas
  - [ ] `/app/dashboard/conversations/page.tsx`
  - [ ] Filtros por status, canal, agente
  - [ ] Search por nome/email
  - [ ] Bulk actions

- [ ] Detalhe da conversa
  - [ ] `/app/dashboard/conversations/[id]/page.tsx`
  - [ ] Timeline de mensagens
  - [ ] Info do lead
  - [ ] BANT score visual
  - [ ] Quick actions

- [ ] Composer de mensagens
  - [ ] Templates rápidos
  - [ ] Emojis
  - [ ] Attachments
  - [ ] Canned responses

#### Dia 13: Instagram Integration
- [ ] Configurar no Chatwoot
  - [ ] Facebook App permissions
  - [ ] Instagram Business Account
  - [ ] Webhook subscription

- [ ] Unificar fluxo
  - [ ] Mesmo bot para todos canais
  - [ ] Conversation merging
  - [ ] Channel indicators

#### Dia 14-15: Flow Builder e Testes
- [ ] BANT Flow Builder
  - [ ] `/app/dashboard/conversations/flows/page.tsx`
  - [ ] Drag-and-drop interface
  - [ ] Question customization
  - [ ] Score rules editor
  - [ ] Preview mode

- [ ] Testes E2E
  - [ ] Web Chat flow completo
  - [ ] WhatsApp conversation
  - [ ] Instagram DM
  - [ ] Handoff scenarios
  - [ ] Multi-tenant isolation

---

## 🔧 Configurações Necessárias

### Chatwoot
```env
# docker-compose.yml
RAILS_ENV=production
SECRET_KEY_BASE=<gerar-com-openssl-rand-hex-64>
FRONTEND_URL=http://localhost:3000
FORCE_SSL=false
ENABLE_ACCOUNT_SIGNUP=false
```

### WhatsApp Business
```env
# .env
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_API_VERSION=v18.0
```

### Instagram
```env
# Configurado via Chatwoot UI
# Requer Facebook Page connected
```

---

## 📈 Métricas de Sucesso

### KPIs Técnicos
- [ ] Tempo de resposta do bot < 2s
- [ ] Taxa de handoff < 30%
- [ ] Uptime do widget > 99%
- [ ] Conversões qualificadas > 70%

### Funcionalidades Core
- [ ] ✅ Web Chat funcionando localmente
- [ ] ✅ Bot respondendo perguntas BANT
- [ ] ✅ Score sendo calculado corretamente
- [ ] ✅ WhatsApp recebendo e enviando
- [ ] ✅ Instagram integrado via Chatwoot
- [ ] ✅ Dashboard mostrando todas conversas
- [ ] ✅ Handoff funcionando

---

## ⚠️ Riscos e Mitigações

### Risco 1: Complexidade do Chatwoot
**Mitigação:** Começar com API direta, adicionar Chatwoot incrementalmente

### Risco 2: Aprovação Meta/WhatsApp
**Mitigação:** Usar Test Number primeiro, produção depois

### Risco 3: Rate Limits APIs
**Mitigação:** Implementar queue com Redis, retry logic

### Risco 4: Multi-tenant no Chatwoot
**Mitigação:** Um account por tenant, isolation via API

---

## 🧪 Guia de Testes por Canal

### 1. Testar Web Chat (Dia 5)
```bash
# 1. Abrir navegador
http://localhost:3003/test-chat

# 2. Iniciar conversa
"Olá"

# 3. Responder perguntas BANT
"Meu orçamento é R$ 5.000/mês"
"Sim, eu decido"
"Preciso qualificar leads"
"Para este mês"

# 4. Ver score e qualificação
# 5. Testar handoff pedindo "falar com humano"
```

### 2. Testar WhatsApp (Dia 10)
```bash
# 1. Configurar Test Number no Meta Developer
# 2. Adicionar seu número como tester
# 3. Enviar mensagem para Test Number
# 4. Ver resposta automática
# 5. Completar fluxo BANT
# 6. Verificar no dashboard
```

### 3. Testar Instagram (Dia 13)
```bash
# 1. Conectar página no Chatwoot
# 2. Enviar DM para a página
# 3. Ver chegando no dashboard
# 4. Bot responde automaticamente
# 5. Mesmo fluxo BANT
```

---

## 📝 Notas e Decisões

### Decisões Técnicas
- WebSocket via Socket.io para real-time
- Redis para queue de mensagens
- PostgreSQL para armazenamento
- React para widget (bundle separado)

### Padrões de Código
- Seguir branding Widia (preto/branco)
- Componentes com shadcn/ui
- Clean Architecture no backend
- Testes para fluxos críticos

### Pendências
- [ ] Definir LLM para NLP (OpenAI/Anthropic/Local)
- [ ] Decidir sobre voz/áudio no futuro
- [ ] Analytics e relatórios detalhados

---

## 🎉 Critérios de Conclusão da Fase 2

### Must Have (MVP)
- ✅ Web Chat Widget funcionando
- ✅ Fluxo BANT completo
- ✅ Score e qualificação automática
- ✅ WhatsApp básico funcionando
- ✅ Dashboard de conversas
- ✅ Handoff para humanos

### Nice to Have
- ⭕ Instagram integration
- ⭕ Flow builder visual
- ⭕ Analytics dashboard
- ⭕ Multiple languages
- ⭕ Voice messages

---

## 📅 Timeline Visual

```
Semana 1 (07-11 Jan): Web Chat + Infraestrutura
├── Seg-Ter: Setup Chatwoot + Schema
├── Qua-Qui: Domain + Services  
└── Sex: Web Chat Widget ✨

Semana 2 (13-17 Jan): Bot + WhatsApp
├── Seg-Ter: Fluxo BANT
├── Qua-Qui: WhatsApp Integration
└── Sex: Sistema Handoff

Semana 3 (20-24 Jan): Dashboard + Instagram
├── Seg-Ter: Dashboard Conversações
├── Qua: Instagram Integration
└── Qui-Sex: Flow Builder + Testes
```

---

*Última atualização: 07/01/2025 - 10:30*