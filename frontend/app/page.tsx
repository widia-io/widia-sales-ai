import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <nav className="flex justify-between items-center py-6">
          <div className="text-2xl font-bold text-gray-900">SaaS Sales AI</div>
          <div className="space-x-4">
            <Link href="/auth/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link href="/auth/register">
              <Button>Começar Grátis</Button>
            </Link>
          </div>
        </nav>

        <main className="mt-20 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Assistente de Vendas Inteligente
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Transforme sua prospecção em um processo automatizado e eficiente.
            Este assistente qualifica leads, agenda reuniões e mantém seu pipeline sempre organizado.
          </p>

          <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto mt-12">
            <h2 className="text-2xl font-semibold mb-6">Funcionalidades</h2>
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div className="flex items-start">
                <div className="text-green-500 mr-3">✓</div>
                <div>
                  <h3 className="font-semibold">Conversas inteligentes</h3>
                  <p className="text-gray-600">Qualificação automática de prospects via BANT</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="text-green-500 mr-3">✓</div>
                <div>
                  <h3 className="font-semibold">Agendamento automático</h3>
                  <p className="text-gray-600">Integração com Calendly sem fricção</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="text-green-500 mr-3">✓</div>
                <div>
                  <h3 className="font-semibold">Base de dados organizada</h3>
                  <p className="text-gray-600">CRM integrado sempre atualizado</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="text-green-500 mr-3">✓</div>
                <div>
                  <h3 className="font-semibold">Dashboard completo</h3>
                  <p className="text-gray-600">Métricas e insights de vendas em tempo real</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <Link href="/auth/register">
              <Button size="lg" className="text-lg px-8 py-6">
                Começar Teste Grátis de 14 Dias
              </Button>
            </Link>
            <p className="text-sm text-gray-500 mt-4">
              Sem cartão de crédito • Cancele a qualquer momento
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}