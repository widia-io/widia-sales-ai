'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Check, Loader2, Building2, User, Mail, Lock, ChevronLeft, ChevronRight } from 'lucide-react'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { authService } from '@/lib/api/services/auth.service'
import { useAuthStore } from '@/lib/stores/auth-store'
import { getErrorMessage } from '@/lib/api/client'

const registerSchema = z.object({
  // Step 1: Tenant Info
  tenant_name: z.string().min(2, 'Nome da empresa deve ter pelo menos 2 caracteres'),
  tenant_slug: z.string()
    .min(3, 'Slug deve ter pelo menos 3 caracteres')
    .max(63, 'Slug deve ter no máximo 63 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  
  // Step 2: Admin User
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
  confirmPassword: z.string(),
  
  // Step 3: Terms
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'Você deve aceitar os termos de uso',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const login = useAuthStore((state) => state.login)
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      tenant_name: '',
      tenant_slug: '',
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  })
  
  const watchTenantName = watch('tenant_name')
  
  // Auto-generate slug from tenant name
  React.useEffect(() => {
    if (watchTenantName) {
      const slug = watchTenantName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 63)
      
      register('tenant_slug', { value: slug })
    }
  }, [watchTenantName, register])
  
  const nextStep = async () => {
    let fieldsToValidate: any[] = []
    
    if (currentStep === 1) {
      fieldsToValidate = ['tenant_name', 'tenant_slug']
    } else if (currentStep === 2) {
      fieldsToValidate = ['name', 'email', 'password', 'confirmPassword']
    }
    
    const isValid = await trigger(fieldsToValidate)
    if (isValid) {
      setCurrentStep(currentStep + 1)
    }
  }
  
  const prevStep = () => {
    setCurrentStep(currentStep - 1)
  }
  
  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    
    try {
      const response = await authService.register({
        tenant_name: data.tenant_name,
        tenant_slug: data.tenant_slug,
        email: data.email,
        password: data.password,
        name: data.name,
      })
      
      // Store auth data
      login(response)
      
      // Show success message
      toast({
        title: 'Conta criada com sucesso!',
        description: `Bem-vindo à Widia Connect, ${response.user.name}!`,
      })
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      toast({
        title: 'Erro ao criar conta',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const steps = [
    { number: 1, title: 'Empresa' },
    { number: 2, title: 'Administrador' },
    { number: 3, title: 'Confirmação' },
  ]
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Crie sua conta grátis
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          14 dias de teste • Sem cartão de crédito
        </p>
        
        {/* Step Indicator */}
        <div className="mt-8 flex items-center justify-center space-x-4">
          {steps.map((step) => (
            <div key={step.number} className="flex items-center">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-semibold
                  ${currentStep >= step.number 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-600'}
                `}
              >
                {currentStep > step.number ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.number
                )}
              </div>
              <span className={`ml-2 text-sm ${currentStep >= step.number ? 'text-gray-900' : 'text-gray-500'}`}>
                {step.title}
              </span>
              {step.number < 3 && (
                <ChevronRight className="w-4 h-4 ml-4 text-gray-400" />
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 border border-gray-200">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Step 1: Tenant Information */}
            {currentStep === 1 && (
              <>
                <div>
                  <Label htmlFor="tenant_name" className="text-gray-700">
                    Nome da Empresa
                  </Label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building2 className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      {...register('tenant_name')}
                      type="text"
                      className="pl-10 border-gray-300 focus:border-black focus:ring-black"
                      placeholder="Minha Empresa"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.tenant_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.tenant_name.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="tenant_slug" className="text-gray-700">
                    URL da Empresa
                  </Label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      widia.io/
                    </span>
                    <Input
                      {...register('tenant_slug')}
                      type="text"
                      className="flex-1 rounded-l-none border-gray-300 focus:border-black focus:ring-black"
                      placeholder="minha-empresa"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.tenant_slug && (
                    <p className="mt-1 text-sm text-red-600">{errors.tenant_slug.message}</p>
                  )}
                </div>
                
                <div className="flex justify-between">
                  <Link href="/auth/login">
                    <Button type="button" variant="outline" className="border-gray-300">
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Voltar ao Login
                    </Button>
                  </Link>
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="bg-black hover:bg-gray-800 text-white"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </>
            )}
            
            {/* Step 2: Admin User */}
            {currentStep === 2 && (
              <>
                <div>
                  <Label htmlFor="name" className="text-gray-700">
                    Nome Completo
                  </Label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      {...register('name')}
                      type="text"
                      className="pl-10 border-gray-300 focus:border-black focus:ring-black"
                      placeholder="João Silva"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="email" className="text-gray-700">
                    Email
                  </Label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      {...register('email')}
                      type="email"
                      className="pl-10 border-gray-300 focus:border-black focus:ring-black"
                      placeholder="seu@email.com"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="password" className="text-gray-700">
                    Senha
                  </Label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      {...register('password')}
                      type="password"
                      className="pl-10 border-gray-300 focus:border-black focus:ring-black"
                      placeholder="••••••••"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="confirmPassword" className="text-gray-700">
                    Confirmar Senha
                  </Label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      {...register('confirmPassword')}
                      type="password"
                      className="pl-10 border-gray-300 focus:border-black focus:ring-black"
                      placeholder="••••••••"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                  )}
                </div>
                
                <div className="flex justify-between">
                  <Button
                    type="button"
                    onClick={prevStep}
                    variant="outline"
                    className="border-gray-300"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="bg-black hover:bg-gray-800 text-white"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </>
            )}
            
            {/* Step 3: Terms & Confirmation */}
            {currentStep === 3 && (
              <>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Resumo da Conta</h3>
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Empresa:</dt>
                        <dd className="font-medium text-gray-900">{watch('tenant_name')}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">URL:</dt>
                        <dd className="font-medium text-gray-900">widia.io/{watch('tenant_slug')}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Administrador:</dt>
                        <dd className="font-medium text-gray-900">{watch('name')}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Email:</dt>
                        <dd className="font-medium text-gray-900">{watch('email')}</dd>
                      </div>
                    </dl>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2">Incluído no Teste Grátis:</h4>
                    <ul className="space-y-1 text-sm text-green-800">
                      <li className="flex items-start">
                        <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                        <span>14 dias de acesso completo</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Até 5 usuários</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Suporte via chat</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Sem necessidade de cartão de crédito</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="flex items-start">
                    <input
                      {...register('acceptTerms')}
                      type="checkbox"
                      className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded mt-0.5"
                      disabled={isLoading}
                    />
                    <Label htmlFor="acceptTerms" className="ml-2 text-sm text-gray-600">
                      Li e aceito os{' '}
                      <Link href="/terms" className="text-blue-600 hover:text-blue-500">
                        Termos de Uso
                      </Link>{' '}
                      e a{' '}
                      <Link href="/privacy" className="text-blue-600 hover:text-blue-500">
                        Política de Privacidade
                      </Link>
                    </Label>
                  </div>
                  {errors.acceptTerms && (
                    <p className="text-sm text-red-600">{errors.acceptTerms.message}</p>
                  )}
                </div>
                
                <div className="flex justify-between">
                  <Button
                    type="button"
                    onClick={prevStep}
                    variant="outline"
                    className="border-gray-300"
                    disabled={isLoading}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Anterior
                  </Button>
                  <Button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      'Criar Conta Grátis'
                    )}
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

// Add React import to fix the React.useEffect
import * as React from 'react'