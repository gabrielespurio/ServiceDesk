import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Bot, User, CheckCircle2, MoreVertical, X, MessageCircle } from "lucide-react";

export default function AiConversations() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);

  return (
    <div className="h-[calc(100vh-8rem)] flex border rounded-xl overflow-hidden bg-card shadow-sm">
      
      {/* 1. Inbox Column (Conversations List) */}
      <div className="w-1/3 min-w-[300px] border-r flex flex-col bg-background">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg mb-4">Inbox (IA)</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 bg-muted/50" placeholder="Buscar conversas..." />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {/* Mock Conversation Items */}
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              onClick={() => setSelectedConversation(i)}
              className={`p-4 border-b cursor-pointer transition-colors hover:bg-muted/50 ${selectedConversation === i ? "bg-primary/5 border-l-4 border-l-primary" : "border-l-4 border-l-transparent"}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium">Visitante #{1042 + i}</span>
                <span className="text-xs text-muted-foreground">10:4{i}</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {i === 1 ? "Preciso de ajuda com o acesso ao sistema." : i === 2 ? "Como altero minha senha?" : "A inteligência artificial não entendeu minha dúvida..."}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  <Bot className="w-3 h-3" /> Assistente Financeiro
                </div>
                {i === 3 && (
                  <div className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    Transbordo
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Chat View Column */}
      <div className="flex-1 flex flex-col bg-muted/10 relative">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="h-16 border-b flex items-center justify-between px-6 bg-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Visitante #{1042 + selectedConversation}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Online
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Assumir Atendimento</Button>
                <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* User Message */}
              <div className="flex items-start gap-4 max-w-[80%]">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="bg-card border rounded-2xl rounded-tl-none p-3 shadow-sm">
                  <p className="text-sm">Olá, eu perdi o acesso ao meu sistema, vocês podem me ajudar?</p>
                  <span className="text-[10px] text-muted-foreground mt-1 block">10:40</span>
                </div>
              </div>

              {/* Bot Message */}
              <div className="flex items-start gap-4 max-w-[80%] ml-auto flex-row-reverse">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-none p-3 shadow-sm">
                  <p className="text-sm">Olá! Sou o Assistente Virtual. Claro, posso te ajudar com isso. Qual o seu e-mail cadastrado?</p>
                  <span className="text-[10px] text-primary-foreground/70 mt-1 block text-right">10:41</span>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <div className="h-px bg-border flex-1"></div>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">A IA está resolvendo</span>
                <div className="h-px bg-border flex-1"></div>
              </div>

            </div>

            {/* Input Box (Disabled for observer) */}
            <div className="p-4 bg-card border-t">
              <div className="relative">
                <Input 
                  placeholder="Você está em modo de observação..." 
                  disabled
                  className="pr-24"
                />
                <Button size="sm" className="absolute right-1 top-1 bottom-1 h-auto" disabled>
                  Assumir
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageCircle className="w-16 h-16 opacity-20 mb-4" />
            <p>Selecione uma conversa para visualizar os detalhes</p>
          </div>
        )}
      </div>

      {/* 3. Detail Context Column */}
      <div className="w-80 border-l bg-background flex flex-col hidden lg:flex">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Contexto da IA</h3>
        </div>
        
        {selectedConversation ? (
          <div className="p-4 space-y-6">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Assistente Atuando</h4>
              <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">🤖</div>
                <div>
                  <p className="text-sm font-medium">Assistente Principal</p>
                  <p className="text-xs text-primary">Ativo e respondendo</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sentimento do Cliente</h4>
              <div className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 p-3 rounded-lg text-sm flex items-center gap-2 font-medium">
                Neutro
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Ações Executadas</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span className="text-muted-foreground">Identificou a intenção: <strong className="text-foreground">Recuperação de Acesso</strong></span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span className="text-muted-foreground">Consultou a Base de Conhecimento: <strong className="text-foreground">Processo #412</strong></span>
                </li>
              </ul>
            </div>
            
            <Button variant="outline" className="w-full mt-4 text-red-500 hover:text-red-600 hover:bg-red-50">
              Forçar Transbordo
            </Button>
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground text-sm mt-10">
            Nenhuma conversa selecionada.
          </div>
        )}
      </div>

    </div>
  );
}
