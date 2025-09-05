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

        <main className="mt-20">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-900 mb-6">
              Widia Connect
            </h1>
            <h2 className="text-2xl text-gray-700 mb-4">
              Assistente de Vendas Inteligente
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Transforme sua prospecção em um processo automatizado e eficiente. Este assistente qualifica leads, agenda reuniões e mantém seu pipeline sempre organizado.
            </p>
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