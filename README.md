# 🚀 SaaS Sales AI - Assistente de Vendas Inteligente

Sistema SaaS multi-tenant completo para qualificação automatizada de leads e vendas, com integração WhatsApp, qualificação BANT, agendamento automático e mini-CRM.

## 📋 Características

- ✅ **Multi-tenancy** com Row Level Security (RLS)
- ✅ **Chat inteligente** com qualificação BANT automatizada
- ✅ **WhatsApp Business** integrado
- ✅ **Agendamento automático** com Calendly/Cal.com
- ✅ **Mini-CRM** completo com pipeline de vendas
- ✅ **Dashboard analytics** com Metabase
- ✅ **Billing** integrado com Stripe
- ✅ **LGPD compliant**

## 🛠️ Stack Tecnológica

### Backend
- **Go** com Fiber v3 (alta performance)
- **PostgreSQL 15** com RLS
- **Redis** para cache e filas
- **Clean Architecture**
- **JWT Authentication**

### Frontend
- **Next.js 14** com App Router
- **Tailwind CSS** + shadcn/ui
- **TypeScript**
- **React Query** para cache
- **Zustand** para estado global

### Infraestrutura
- **Docker** & Docker Compose
- **Chatwoot** para chat/suporte
- **Metabase** para analytics
- **MinIO** para storage S3-compatible
- **Mailhog** para testes de email

## 🚀 Quick Start

### Pré-requisitos
- Docker & Docker Compose
- Go 1.21+
- Node.js 18+
- Make

### Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/widia/sales-ai.git
cd sales-ai
```

2. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

3. **Inicie os serviços com Docker**
```bash
cd docker
docker-compose up -d
```

4. **Instale dependências do backend**
```bash
cd backend
go mod download
```

5. **Instale dependências do frontend**
```bash
cd frontend
npm install
```

6. **Execute as migrations**
```bash
cd backend
make migrate
```

7. **Inicie o desenvolvimento**

Terminal 1 - Backend:
```bash
cd backend
make dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

## 📁 Estrutura do Projeto

```
widia-sales-ai/
├── backend/               # API Go com Fiber v3
│   ├── cmd/api/          # Entry point
│   ├── internal/         # Clean Architecture
│   │   ├── domain/       # Entidades e interfaces
│   │   ├── application/  # Casos de uso
│   │   ├── infrastructure/ # Implementações
│   │   └── interfaces/   # HTTP handlers
│   └── migrations/       # Database migrations
│
├── frontend/             # Next.js 14
│   ├── app/             # App Router
│   ├── components/      # Componentes React
│   ├── lib/            # Utilitários
│   └── hooks/          # Custom hooks
│
├── docker/              # Docker configs
├── database/           # Scripts SQL
└── docs/              # Documentação
```

## 🌐 URLs de Acesso

- **Frontend**: http://localhost:3003
- **Backend API**: http://localhost:3000
- **Chatwoot**: http://localhost:3001
- **Metabase**: http://localhost:3002
- **MinIO Console**: http://localhost:9001
- **Mailhog**: http://localhost:8025

## 🔐 Autenticação

O sistema usa JWT com refresh tokens:

```bash
# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password",
  "tenant_slug": "demo"
}

# Register novo tenant
POST /api/auth/register
{
  "tenant_name": "Minha Empresa",
  "tenant_slug": "minha-empresa",
  "email": "admin@example.com",
  "password": "password",
  "name": "Admin"
}
```

## 🏗️ Desenvolvimento

### Backend

```bash
cd backend

# Rodar testes
make test

# Formatar código
make fmt

# Lint
make lint

# Build
make build
```

### Frontend

```bash
cd frontend

# Desenvolvimento
npm run dev

# Build produção
npm run build

# Lint
npm run lint
```

## 🚢 Deploy

### Docker Compose (Produção)

```bash
docker-compose -f docker/docker-compose.prod.yml up -d
```

### Kubernetes

```bash
kubectl apply -f k8s/
```

## 📊 Monitoramento

- **Logs**: Estruturados em JSON
- **Métricas**: Prometheus + Grafana
- **Tracing**: OpenTelemetry
- **Uptime**: > 99.9% SLA

## 🔒 Segurança

- Row Level Security (RLS) para isolamento de tenants
- Rate limiting por tenant
- CORS configurado
- Headers de segurança
- LGPD compliance
- Criptografia de dados sensíveis

## 📝 Licença

Proprietary - Todos os direitos reservados

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

- Email: support@widiatech.com
- Discord: [Join our server](https://discord.gg/widia)
- Documentation: [docs.widiatech.com](https://docs.widiatech.com)

---

Desenvolvido com ❤️ pela equipe Widia