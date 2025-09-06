'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  User,
  Mail,
  Shield,
  Clock,
  Calendar,
  Key,
  Save,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { profileService, type Profile } from '@/lib/api/services/profile.service'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export default function ProfilePage() {
  const { toast } = useToast()
  const { user: currentUser, setUser } = useAuthStore()
  const [activeTab, setActiveTab] = useState('personal')
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
  })
  
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  })

  // Fetch profile data
  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: profileService.getProfile,
  })

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: profileService.updateProfile,
    onSuccess: (updatedProfile) => {
      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram atualizadas com sucesso.',
      })
      if (currentUser) {
        setUser({
          ...currentUser,
          name: updatedProfile.name,
          email: updatedProfile.email,
        })
      }
      refetchProfile()
      setIsEditingProfile(false)
    },
    onError: () => {
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar suas informações.',
        variant: 'destructive',
      })
    },
  })

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: profileService.changePassword,
    onSuccess: () => {
      toast({
        title: 'Senha alterada',
        description: 'Sua senha foi alterada com sucesso.',
      })
      setPasswordForm({
        old_password: '',
        new_password: '',
        confirm_password: '',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao alterar senha',
        description: error.response?.data?.message || 'Não foi possível alterar sua senha.',
        variant: 'destructive',
      })
    },
  })

  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name || '',
        email: profile.email || '',
      })
    }
  }, [profile])

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileForm)
  }

  const handleChangePassword = () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast({
        title: 'Senhas não coincidem',
        description: 'A nova senha e a confirmação devem ser iguais.',
        variant: 'destructive',
      })
      return
    }

    if (passwordForm.new_password.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 8 caracteres.',
        variant: 'destructive',
      })
      return
    }

    changePasswordMutation.mutate({
      old_password: passwordForm.old_password,
      new_password: passwordForm.new_password,
    })
  }

  const getRoleBadge = (role: string) => {
    const styles = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      agent: 'bg-green-100 text-green-800',
      viewer: 'bg-gray-100 text-gray-800',
    }
    const labels = {
      owner: 'Proprietário',
      admin: 'Administrador',
      agent: 'Agente',
      viewer: 'Visualizador',
    }
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${styles[role as keyof typeof styles] || styles.viewer}`}>
        {labels[role as keyof typeof labels] || role}
      </span>
    )
  }

  const tabs = [
    { id: 'personal', label: 'Informações Pessoais', icon: User },
    { id: 'security', label: 'Segurança', icon: Shield },
  ]

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-gray-600 mt-2">
          Gerencie suas informações pessoais e configurações de segurança
        </p>
      </div>

      {/* Profile Card */}
      {profile && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gray-900 text-white flex items-center justify-center text-2xl font-semibold">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{profile.name}</h2>
                <p className="text-gray-500">{profile.email}</p>
                <div className="mt-2">
                  {getRoleBadge(profile.role)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Calendar className="h-4 w-4" />
                Membro desde {new Date(profile.created_at).toLocaleDateString('pt-BR')}
              </div>
              {profile.last_login_at && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  Último login {new Date(profile.last_login_at).toLocaleDateString('pt-BR')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
      {activeTab === 'personal' && (
        <div className="space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Informações Pessoais</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Atualize suas informações pessoais
                </p>
              </div>
              {!isEditingProfile ? (
                <Button onClick={() => setIsEditingProfile(true)} variant="outline">
                  Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      setIsEditingProfile(false)
                      if (profile) {
                        setProfileForm({
                          name: profile.name,
                          email: profile.email,
                        })
                      }
                    }} 
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSaveProfile} 
                    disabled={updateProfileMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  disabled={!isEditingProfile}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  disabled={!isEditingProfile}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  O email é usado para login e notificações
                </p>
              </div>

              <div>
                <Label>Perfil de Acesso</Label>
                <Input
                  value={profile?.role || ''}
                  disabled
                  className="mt-1 bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  O perfil de acesso é gerenciado pelo administrador
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Change Password */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Alterar Senha</h2>
              <p className="text-sm text-gray-500 mt-1">
                Atualize sua senha regularmente para manter sua conta segura
              </p>
            </div>

            <div className="space-y-4 max-w-md">
              <div>
                <Label htmlFor="old_password">Senha Atual</Label>
                <div className="relative mt-1">
                  <Input
                    id="old_password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.old_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                    placeholder="Digite sua senha atual"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="new_password">Nova Senha</Label>
                <div className="relative mt-1">
                  <Input
                    id="new_password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    placeholder="Digite a nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Mínimo de 8 caracteres
                </p>
              </div>

              <div>
                <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                <div className="relative mt-1">
                  <Input
                    id="confirm_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    placeholder="Confirme a nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button 
                onClick={handleChangePassword}
                disabled={changePasswordMutation.isPending || !passwordForm.old_password || !passwordForm.new_password}
                className="w-full"
              >
                <Key className="h-4 w-4 mr-2" />
                Alterar Senha
              </Button>
            </div>
          </div>

          {/* Security Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-900">
                  Dicas de Segurança
                </h3>
                <ul className="text-sm text-blue-700 mt-2 space-y-1">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    Use uma senha forte com letras, números e símbolos
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    Não compartilhe sua senha com ninguém
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    Altere sua senha regularmente
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    Use senhas diferentes para cada serviço
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sessions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sessões Ativas</h2>
            <p className="text-sm text-gray-500 mb-4">
              Gerencie os dispositivos conectados à sua conta
            </p>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Sessão Atual</p>
                  <p className="text-sm text-gray-500">Este dispositivo</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                  Ativa
                </span>
              </div>
            </div>
            <Button variant="outline" className="mt-4">
              Ver Todas as Sessões
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}