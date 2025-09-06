'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Key, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'
import { profileService } from '@/lib/api/services/profile.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const token = searchParams.get('token') || ''
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordReset, setPasswordReset] = useState(false)

  // Validate token
  const { data: tokenValidation, isLoading: isValidating } = useQuery({
    queryKey: ['validateResetToken', token],
    queryFn: () => profileService.validateResetToken(token),
    enabled: !!token,
    retry: false,
  })

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: profileService.resetPassword,
    onSuccess: () => {
      setPasswordReset(true)
      toast({
        title: 'Senha redefinida',
        description: 'Sua senha foi redefinida com sucesso.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao redefinir senha',
        description: error.response?.data?.message || 'Não foi possível redefinir sua senha.',
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast({
        title: 'Senhas não coincidem',
        description: 'A nova senha e a confirmação devem ser iguais.',
        variant: 'destructive',
      })
      return
    }

    if (password.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 8 caracteres.',
        variant: 'destructive',
      })
      return
    }

    resetPasswordMutation.mutate({
      token,
      new_password: password,
    })
  }

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { strength: 0, label: '', color: '' }
    
    let strength = 0
    if (pass.length >= 8) strength++
    if (pass.match(/[a-z]/) && pass.match(/[A-Z]/)) strength++
    if (pass.match(/[0-9]/)) strength++
    if (pass.match(/[^a-zA-Z0-9]/)) strength++

    const labels = ['Fraca', 'Regular', 'Boa', 'Forte']
    const colors = ['bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500']

    return {
      strength,
      label: labels[strength - 1] || '',
      color: colors[strength - 1] || '',
    }
  }

  const passwordStrength = getPasswordStrength(password)

  // If no token is provided
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Link inválido
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              O link de redefinição de senha é inválido ou está faltando o token.
            </p>
            <Link href="/auth/forgot-password" className="mt-4 inline-block">
              <Button>Solicitar novo link</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Invalid token
  if (tokenValidation && !tokenValidation.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Link expirado ou inválido
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {tokenValidation.message || 'Este link de redefinição de senha expirou ou é inválido.'}
            </p>
            <Link href="/auth/forgot-password" className="mt-4 inline-block">
              <Button>Solicitar novo link</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Password successfully reset
  if (passwordReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Senha redefinida!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Sua senha foi redefinida com sucesso. Você já pode fazer login com a nova senha.
            </p>
            <Link href="/auth/login" className="mt-4 inline-block">
              <Button className="w-full">Ir para o login</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Reset password form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Redefinir senha
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Digite sua nova senha abaixo
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="password">Nova senha</Label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua nova senha"
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded ${
                          level <= passwordStrength.strength
                            ? passwordStrength.color
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  {passwordStrength.label && (
                    <p className="text-xs text-gray-600">
                      Força da senha: <span className="font-medium">{passwordStrength.label}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme sua nova senha"
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600 mt-1">As senhas não coincidem</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <ul className="text-xs text-gray-600 space-y-1">
              <li className={password.length >= 8 ? 'text-green-600' : ''}>
                • Mínimo de 8 caracteres
              </li>
              <li className={password.match(/[a-z]/) && password.match(/[A-Z]/) ? 'text-green-600' : ''}>
                • Letras maiúsculas e minúsculas
              </li>
              <li className={password.match(/[0-9]/) ? 'text-green-600' : ''}>
                • Pelo menos um número
              </li>
              <li className={password.match(/[^a-zA-Z0-9]/) ? 'text-green-600' : ''}>
                • Pelo menos um caractere especial
              </li>
            </ul>
          </div>

          <Button
            type="submit"
            disabled={resetPasswordMutation.isPending || !password || !confirmPassword}
            className="w-full"
          >
            {resetPasswordMutation.isPending ? 'Redefinindo...' : 'Redefinir senha'}
          </Button>
        </form>
      </div>
    </div>
  )
}