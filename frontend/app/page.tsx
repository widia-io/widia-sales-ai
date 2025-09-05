import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import { Check } from 'lucide-react'
import Image from 'next/image'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4">
        <nav className="flex justify-between items-center py-6">
          <Logo />
          <div className="space-x-4">
            <Link href="/auth/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link href="/auth/register">
              <Button className="bg-black hover:bg-gray-800">Começar Grátis</Button>
            </Link>
          </div>
        </nav>

        <main className="mt-8 lg:mt-16">
          {/* Hero Section with Platform Integration Visual */}
          <div className="relative min-h-[800px] lg:min-h-[700px] flex flex-col items-center justify-center overflow-hidden px-4">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100"></div>
            
            {/* Platform Icons - Desktop Layout */}
            <div className="hidden lg:block absolute inset-0 pointer-events-none">
              {/* WhatsApp - Top Right */}
              <div className="absolute top-[10%] right-[15%] animate-float">
                <div className="w-20 h-20 bg-green-500 rounded-2xl flex items-center justify-center shadow-xl">
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </div>
              </div>
              
              {/* Instagram - Top Left */}
              <div className="absolute top-[10%] left-[15%] animate-float animation-delay-2000">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl">
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
                  </svg>
                </div>
              </div>
              
              {/* Telegram - Bottom Left */}
              <div className="absolute bottom-[20%] left-[10%] animate-float animation-delay-1000">
                <div className="w-20 h-20 bg-blue-500 rounded-2xl flex items-center justify-center shadow-xl">
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                </div>
              </div>
              
              {/* Email - Bottom Right */}
              <div className="absolute bottom-[20%] right-[10%] animate-float animation-delay-3000">
                <div className="w-20 h-20 bg-red-500 rounded-2xl flex items-center justify-center shadow-xl">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
              </div>
              
              {/* Messenger - Middle Right */}
              <div className="absolute top-[35%] right-[8%] animate-float animation-delay-1500">
                <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl">
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.974 12-11.111C24 4.974 18.627 0 12 0zm1.193 14.963l-3.056-3.259-5.963 3.259L10.733 8l3.13 3.259L19.752 8l-6.559 6.963z"/>
                  </svg>
                </div>
              </div>
              
              {/* Additional icon - Middle Left */}
              <div className="absolute top-[35%] left-[8%] animate-float animation-delay-2500">
                <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center shadow-xl">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Mobile Platform Icons - Horizontal Layout */}
            <div className="lg:hidden flex flex-wrap justify-center items-center gap-4 mb-8 relative z-10">
              <div className="w-14 h-14 bg-green-500 rounded-xl flex items-center justify-center shadow-lg animate-float">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl flex items-center justify-center shadow-lg animate-float animation-delay-500">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
                </svg>
              </div>
              <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg animate-float animation-delay-1000">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </div>
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg animate-float animation-delay-1500">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.974 12-11.111C24 4.974 18.627 0 12 0zm1.193 14.963l-3.056-3.259-5.963 3.259L10.733 8l3.13 3.259L19.752 8l-6.559 6.963z"/>
                </svg>
              </div>
            </div>
            
            {/* Content */}
            <div className="relative z-30 text-center px-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
                Tudo do WhatsApp ao<br/>
                Instagram em<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-600">
                  um só lugar.
                </span>
              </h1>
              <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 mb-8 lg:mb-12 max-w-2xl mx-auto">
                Converse com seus clientes em uma só plataforma!
              </p>
              
              <Link href="/auth/register">
                <Button className="bg-green-500 hover:bg-green-600 text-white text-lg lg:text-xl px-8 lg:px-12 py-6 lg:py-8 rounded-full font-bold shadow-xl transform transition hover:scale-105">
                  Quero assinar agora
                </Button>
              </Link>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-10 max-w-5xl mx-auto mt-16">
            <h2 className="text-3xl font-bold mb-8 text-gray-900">Funcionalidades</h2>
            <div className="grid md:grid-cols-2 gap-8 text-left">
              <div className="flex items-start">
                <div className="bg-green-500 rounded-full p-1 mr-4 mt-1">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Conversas inteligentes</h3>
                  <p className="text-gray-600">Qualificação automática de prospects via BANT</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-green-500 rounded-full p-1 mr-4 mt-1">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Agendamento automático</h3>
                  <p className="text-gray-600">Integração com Calendly sem fricção</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-green-500 rounded-full p-1 mr-4 mt-1">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Base de dados organizada</h3>
                  <p className="text-gray-600">CRM integrado sempre atualizado</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-green-500 rounded-full p-1 mr-4 mt-1">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Dashboard completo</h3>
                  <p className="text-gray-600">Métricas e insights de vendas em tempo real</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 mb-20 text-center">
            <Link href="/auth/register">
              <Button size="lg" className="bg-black hover:bg-gray-800 text-lg px-10 py-7 rounded-lg font-semibold">
                Começar Teste Grátis de 14 Dias
              </Button>
            </Link>
            <p className="text-gray-600 mt-6">
              Sem cartão de crédito • Cancele a qualquer momento
            </p>
          </div>

          <div className="mt-20 mb-20">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <span className="text-gray-400 text-sm">Dashboard de Vendas</span>
              </div>
              <div className="bg-gray-950 rounded-lg p-6">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-2">Leads Qualificados</p>
                    <p className="text-white text-2xl font-bold">247</p>
                    <p className="text-green-400 text-sm">+12% este mês</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-2">Reuniões Agendadas</p>
                    <p className="text-white text-2xl font-bold">34</p>
                    <p className="text-green-400 text-sm">+8% este mês</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-2">Taxa de Conversão</p>
                    <p className="text-white text-2xl font-bold">18%</p>
                    <p className="text-green-400 text-sm">+3% este mês</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-2">Pipeline Total</p>
                    <p className="text-white text-2xl font-bold">R$ 450k</p>
                    <p className="text-green-400 text-sm">+25% este mês</p>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-4">Conversas Recentes</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
                        <div>
                          <p className="text-white text-sm font-medium">João Silva</p>
                          <p className="text-gray-400 text-xs">Qualificado - BANT completo</p>
                        </div>
                      </div>
                      <span className="text-gray-400 text-xs">há 2 min</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
                        <div>
                          <p className="text-white text-sm font-medium">Maria Santos</p>
                          <p className="text-gray-400 text-xs">Reunião agendada</p>
                        </div>
                      </div>
                      <span className="text-gray-400 text-xs">há 15 min</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
                        <div>
                          <p className="text-white text-sm font-medium">Pedro Oliveira</p>
                          <p className="text-gray-400 text-xs">Em qualificação</p>
                        </div>
                      </div>
                      <span className="text-gray-400 text-xs">há 1 hora</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}