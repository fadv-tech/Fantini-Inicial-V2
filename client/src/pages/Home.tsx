import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Send, Settings, FileText } from "lucide-react";
import { APP_TITLE } from "@/const";
import { Link } from "wouter";

export default function Home() {
  const { user, loading, error, isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <main className="container mx-auto py-12">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold">{APP_TITLE}</h1>
          <p className="text-xl text-muted-foreground">
            Sistema de Peticionamento Eletrônico via LegalMail
          </p>

          <div className="flex gap-4 justify-center mt-12">
            <Link href="/enviar">
              <Button size="lg" className="gap-2">
                <Send className="h-5 w-5" />
                Enviar Petições
              </Button>
            </Link>
            <Link href="/configuracoes">
              <Button size="lg" variant="outline" className="gap-2">
                <Settings className="h-5 w-5" />
                Configurações
              </Button>
            </Link>
            <Link href="/auditoria">
              <Button size="lg" variant="outline" className="gap-2">
                <FileText className="h-5 w-5" />
                Auditoria/LOG
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
