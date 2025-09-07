'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Clock,
  Activity,
  UserPlus,
  MessageSquare,
  Target
} from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import apiClient from '@/lib/api/client'

interface TenantStats {
  user_count: number
  days_remaining: number
  subscription_status: string
  subscription_ends_at: string
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, tenant } = useAuthStore()
  const [stats, setStats] = useState<TenantStats | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchStats()
  }, [])
  
  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/tenant/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }
  
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }
  
  const mockMetrics = [
    {
      title: 'Usuários Ativos',
      value: stats?.user_count || 0,
      change: '+12%',
      changeType: 'positive',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Conversas Hoje',
      value: '124',
      change: '+8%',
      changeType: 'positive',
      icon: MessageSquare,
      color: 'bg-green-500',
    },
    {
      title: 'Taxa de Conversão',
      value: '18%',
      change: '+3%',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
    {
      title: 'Leads Qualificados',
      value: '47',
      change: '-2%',
      changeType: 'negative',
      icon: Target,
      color: 'bg-orange-500',
    },
  ]
  
  const recentActivities = [
    {
      id: 1,
      type: 'user_joined',
      message: 'Novo usuário adicionado',
      user: 'João Silva',
      time: 'há 2 minutos',
      icon: UserPlus,
    },
    {
      id: 2,
      type: 'meeting_scheduled',
      message: 'Reunião agendada',
      user: 'Maria Santos',
      time: 'há 15 minutos',
      icon: Calendar,
    },
    {
      id: 3,
      type: 'lead_qualified',
      message: 'Lead qualificado',
      user: 'Pedro Oliveira',
      time: 'há 1 hora',
      icon: Target,
    },
    {
      id: 4,
      type: 'conversation_started',
      message: 'Nova conversa iniciada',
      user: 'Ana Costa',
      time: 'há 2 horas',
      icon: MessageSquare,
    },
  ]
  
  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {getGreeting()}, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-gray-600 mt-2">
          Aqui está um resumo da sua conta hoje.
        </p>
      </div>
      
      {/* Subscription Alert */}
      {tenant?.subscription_status === 'trial' && stats && (
        <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <Clock className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Período de teste
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Você tem {stats.days_remaining} dias restantes no seu período de teste gratuito.
                Faça o upgrade para continuar usando todos os recursos.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {mockMetrics.map((metric) => {
          const Icon = metric.icon
          return (
            <div key={metric.title} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {metric.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {metric.value}
                  </p>
                </div>
                <div className={`${metric.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <span
                  className={`text-sm font-medium ${
                    metric.changeType === 'positive'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {metric.change}
                </span>
                <span className="text-sm text-gray-500 ml-2">vs mês passado</span>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Atividade Semanal
            </h2>
            <Activity className="h-5 w-5 text-gray-400" />
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-500">Gráfico de atividade</p>
          </div>
        </div>
        
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Atividade Recente
            </h2>
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity) => {
              const Icon = activity.icon
              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {activity.user} • {activity.time}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="mt-8 bg-gray-900 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => router.push('/dashboard/users?action=new')}
            className="bg-gray-800 hover:bg-gray-700 text-white rounded-lg p-4 flex items-center gap-3 transition-colors"
          >
            <UserPlus className="h-5 w-5" />
            <span className="font-medium">Adicionar Usuário</span>
          </button>
          <button 
            onClick={() => alert('Funcionalidade de Nova Conversa em breve!')}
            className="bg-gray-800 hover:bg-gray-700 text-white rounded-lg p-4 flex items-center gap-3 transition-colors"
          >
            <MessageSquare className="h-5 w-5" />
            <span className="font-medium">Nova Conversa</span>
          </button>
          <button 
            onClick={() => window.open('https://calendly.com', '_blank')}
            className="bg-gray-800 hover:bg-gray-700 text-white rounded-lg p-4 flex items-center gap-3 transition-colors"
          >
            <Calendar className="h-5 w-5" />
            <span className="font-medium">Agendar Reunião</span>
          </button>
        </div>
      </div>
    </div>
  )
}