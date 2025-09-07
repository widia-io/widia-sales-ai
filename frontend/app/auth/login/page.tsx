'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, Mail, Lock, Building2 } from 'lucide-react'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { authService } from '@/lib/api/services/auth.service'
import { useAuthStore } from '@/lib/stores/auth-store'
import { getErrorMessage } from '@/lib/api/client'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
  tenant_slug: z.string().min(1, 'Empresa é obrigatória'),
  remember: z.boolean().optional(),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const login = useAuthStore((state) => state.login)
  const [isLoading, setIsLoading] = useState(false)
  
  // Load saved credentials if "remember me" was checked
  const getSavedCredentials = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('login-remember')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          return null
        }
      }
    }
    return null
  }
  
  const savedCredentials = getSavedCredentials()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: savedCredentials?.email || '',
      password: '',
      tenant_slug: savedCredentials?.tenant_slug || '',
      remember: savedCredentials ? true : false,
    },
  })
  
  // Load saved credentials on mount
  useEffect(() => {
    if (savedCredentials) {
      setValue('email', savedCredentials.email)
      setValue('tenant_slug', savedCredentials.tenant_slug)
      setValue('remember', true)
    }
  }, [])
  
  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    
    try {
      const response = await authService.login({
        email: data.email,
        password: data.password,
        tenant_slug: data.tenant_slug,
      })
      
      // Store auth data
      login(response)
      
      // Save credentials if "remember me" is checked
      if (data.remember) {
        localStorage.setItem('login-remember', JSON.stringify({
          email: data.email,
          tenant_slug: data.tenant_slug,
        }))
      } else {
        // Clear saved credentials if unchecked
        localStorage.removeItem('login-remember')
      }
      
      // Show success message
      toast({
        title: 'Login realizado com sucesso!',
        description: `Bem-vindo de volta, ${response.user.name}!`,
      })
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      toast({
        title: 'Erro ao fazer login',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Entre na sua conta
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Ou{' '}
          <Link
            href="/auth/register"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            comece seu teste grátis de 14 dias
          </Link>
        </p>
      </div>
      
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 border border-gray-200">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Tenant Slug */}
            <div>
              <Label htmlFor="tenant_slug" className="text-gray-700">
                Empresa
              </Label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  {...register('tenant_slug')}
                  type="text"
                  autoComplete="organization"
                  className="pl-10 border-gray-300 focus:border-black focus:ring-black"
                  placeholder="sua-empresa"
                  disabled={isLoading}
                />
              </div>
              {errors.tenant_slug && (
                <p className="mt-1 text-sm text-red-600">{errors.tenant_slug.message}</p>
              )}
            </div>
            
            {/* Email */}
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
                  autoComplete="email"
                  className="pl-10 border-gray-300 focus:border-black focus:ring-black"
                  placeholder="seu@email.com"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
            
            {/* Password */}
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
                  autoComplete="current-password"
                  className="pl-10 border-gray-300 focus:border-black focus:ring-black"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
            
            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  {...register('remember')}
                  type="checkbox"
                  className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                  disabled={isLoading}
                />
                <Label
                  htmlFor="remember"
                  className="ml-2 text-sm text-gray-600 cursor-pointer"
                >
                  Lembrar de mim
                </Label>
              </div>
              
              <div className="text-sm">
                <Link
                  href="/auth/forgot-password"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Esqueceu a senha?
                </Link>
              </div>
            </div>
            
            {/* Submit Button */}
            <div>
              <Button
                type="submit"
                className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </div>
          </form>
          
          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Novo na Widia?</span>
              </div>
            </div>
            
            {/* Register Link */}
            <div className="mt-6">
              <Link href="/auth/register">
                <Button
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Criar conta grátis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}