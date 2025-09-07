'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Building2,
  Globe,
  CreditCard,
  Shield,
  Save,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  MessageSquare,
  Database,
} from 'lucide-react'
import { tenantService, type Tenant, type TenantStats } from '@/lib/api/services/tenant.service'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export default function SettingsPage() {
  const { toast } = useToast()
  const { tenant: currentTenant, setTenant } = useAuthStore()
  const [activeTab, setActiveTab] = useState('general')
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
  })

  // Fetch tenant data
  const { data: tenant, refetch: refetchTenant } = useQuery({
    queryKey: ['tenant'],
    queryFn: tenantService.getCurrentTenant,
  })

  // Fetch tenant stats
  const { data: stats } = useQuery({
    queryKey: ['tenantStats'],
    queryFn: tenantService.getTenantStats,
  })

  // Update tenant mutation
  const updateMutation = useMutation({
    mutationFn: tenantService.updateTenant,
    onSuccess: (updatedTenant) => {
      toast({
        title: 'Configurações salvas',
        description: 'As configurações foram atualizadas com sucesso.',
      })
      setTenant(updatedTenant)
      refetchTenant()
      setIsEditing(false)
    },
    onError: () => {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      })
    },
  })

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        domain: tenant.domain || '',
      })
    }
  }, [tenant])

  const handleSave = () => {
    updateMutation.mutate(formData)
  }

  const getSubscriptionBadge = (status: string) => {
    const styles = {
      trial: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      past_due: 'bg-red-100 text-red-800',
      canceled: 'bg-gray-100 text-gray-800',
    }
    const labels = {
      trial: 'Teste Grátis',
      active: 'Ativo',
      past_due: 'Pagamento Pendente',
      canceled: 'Cancelado',
    }
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${styles[status as keyof typeof styles] || styles.trial}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const tabs = [
    { id: 'general', label: 'Geral', icon: Building2 },
    { id: 'billing', label: 'Cobrança', icon: CreditCard },
    { id: 'security', label: 'Segurança', icon: Shield },
  ]

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600 mt-2">
          Gerencie as configurações da sua organização
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 pb-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Organization Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Informações da Organização</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Atualize as informações básicas da sua organização
                </p>
              </div>
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} variant="outline">
                  Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={() => setIsEditing(false)} variant="outline">
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={updateMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Organização</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="slug">Slug (identificador único)</Label>
                <Input
                  id="slug"
                  value={tenant?.slug || ''}
                  disabled
                  className="mt-1 bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  O slug não pode ser alterado após a criação
                </p>
              </div>

              <div>
                <Label htmlFor="domain">Domínio Personalizado</Label>
                <div className="flex gap-2 mt-1">
                  <span className="flex items-center px-3 text-sm text-gray-500 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md">
                    https://
                  </span>
                  <Input
                    id="domain"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    disabled={!isEditing}
                    placeholder="exemplo.com"
                    className="rounded-l-none"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Configure um domínio personalizado para acessar sua organização
                </p>
              </div>

              <div>
                <Label>ID da Organização</Label>
                <Input
                  value={tenant?.id || ''}
                  disabled
                  className="mt-1 bg-gray-50 font-mono text-xs"
                />
              </div>

              <div>
                <Label>Criado em</Label>
                <Input
                  value={tenant ? new Date(tenant.created_at).toLocaleDateString('pt-BR') : ''}
                  disabled
                  className="mt-1 bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* Usage Stats */}
          {stats && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Uso e Limites</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Users className="h-4 w-4" />
                    Usuários
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats?.user_count || 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {stats?.active_users || 0} ativos
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <MessageSquare className="h-4 w-4" />
                    Mensagens
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {(stats.messages_sent || 0).toLocaleString('pt-BR')}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    este mês
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Database className="h-4 w-4" />
                    Armazenamento
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {((stats?.storage_used || 0) / 1024 / 1024).toFixed(1)} MB
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    usado
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Subscription Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Plano Atual</h2>
            
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-gray-900">Plano Starter</h3>
                  {tenant && getSubscriptionBadge(tenant.subscription_status)}
                </div>
                <p className="text-gray-500">
                  Ideal para pequenas equipes começando com vendas automatizadas
                </p>
              </div>
              <Button>Fazer Upgrade</Button>
            </div>

            {tenant?.subscription_status === 'trial' && stats && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">
                      Período de teste
                    </h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Você tem {stats?.days_remaining || 0} dias restantes no seu teste grátis.
                      Faça o upgrade para continuar usando todos os recursos.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-6 mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Recursos incluídos:</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Até 5 usuários
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  1.000 mensagens/mês
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  1 inbox (WhatsApp ou Web)
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Suporte por email
                </li>
              </ul>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Método de Pagamento</h2>
            
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                Nenhum método de pagamento configurado
              </p>
              <Button className="mt-4" variant="outline">
                Adicionar Cartão
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Security Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Configurações de Segurança</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Autenticação de Dois Fatores
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Adicione uma camada extra de segurança exigindo um código além da senha
                </p>
                <Button variant="outline">Configurar 2FA</Button>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Sessões Ativas
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Gerencie os dispositivos conectados à sua conta
                </p>
                <Button variant="outline">Ver Sessões</Button>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Logs de Auditoria
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Visualize todas as ações realizadas na sua organização
                </p>
                <Button variant="outline">Ver Logs</Button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 mb-4">Zona de Perigo</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-red-900 mb-2">
                  Excluir Organização
                </h3>
                <p className="text-sm text-red-700 mb-4">
                  Uma vez excluída, não será possível recuperar os dados da organização
                </p>
                <Button variant="destructive">Excluir Organização</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}