'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMutation } from '@tanstack/react-query'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { profileService } from '@/lib/api/services/profile.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [tenantSlug, setTenantSlug] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  const forgotPasswordMutation = useMutation({
    mutationFn: profileService.forgotPassword,
    onSuccess: (data) => {
      setEmailSent(true)
      
      // In development, show the reset link if provided
      if (data.reset_url) {
        toast({
          title: 'Link de reset (desenvolvimento)',
          description: data.reset_url,
        })
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao enviar email',
        description: error.response?.data?.message || 'Não foi possível enviar o email de recuperação.',
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !tenantSlug) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos.',
        variant: 'destructive',
      })
      return
    }

    forgotPasswordMutation.mutate({
      email,
      tenant_slug: tenantSlug,
    })
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Email enviado!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Se existe uma conta com o email {email}, você receberá instruções para redefinir sua senha.
            </p>
            <p className="mt-4 text-sm text-gray-600">
              Por favor, verifique sua caixa de entrada e a pasta de spam.
            </p>
            <div className="mt-6 space-y-2">
              <Button
                onClick={() => {
                  setEmailSent(false)
                  setEmail('')
                }}
                variant="outline"
                className="w-full"
              >
                Enviar novamente
              </Button>
              <Link href="/auth/login" className="block">
                <Button variant="default" className="w-full">
                  Voltar ao login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link
            href="/auth/login"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao login
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Recuperar senha
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Digite seu email e o identificador da organização para receber as instruções de recuperação.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tenant-slug">Organização</Label>
              <Input
                id="tenant-slug"
                name="tenant_slug"
                type="text"
                required
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                placeholder="identificador-da-organizacao"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                O identificador único da sua organização
              </p>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={forgotPasswordMutation.isPending}
            className="w-full"
          >
            {forgotPasswordMutation.isPending ? 'Enviando...' : 'Enviar instruções'}
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Lembrou a senha?{' '}
              <Link href="/auth/login" className="font-medium text-gray-900 hover:text-gray-700">
                Fazer login
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}