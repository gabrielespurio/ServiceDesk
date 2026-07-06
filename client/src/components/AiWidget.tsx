import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Minimize2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export function AiWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{id: number, text: string, sender: 'user' | 'bot', time: string}[]>([
    { id: 1, text: "Olá! Como posso ajudar você hoje?", sender: "bot", time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
  ]);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    const newUserMsg = {
      id: Date.now(),
      text: inputValue,
      sender: 'user' as const,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue("");
    
    // Mock bot response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "Entendi. No momento sou apenas uma interface visual, em breve poderei te ajudar com respostas reais processadas por Inteligência Artificial!",
        sender: 'bot',
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      }]);
    }, 1000);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl hover:scale-105 transition-transform p-0 bg-primary z-50 flex items-center justify-center"
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] max-h-[80vh] bg-background border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      {/* Header */}
      <div className="bg-primary p-4 text-primary-foreground flex justify-between items-center shadow-md z-10 relative">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Bot className="h-6 w-6" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-primary rounded-full"></span>
          </div>
          <div>
            <h3 className="font-semibold text-sm">Assistente Inteligente</h3>
            <p className="text-xs text-primary-foreground/80">Respondendo na hora</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:text-primary-foreground hover:bg-white/20" onClick={() => setIsOpen(false)}>
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:text-primary-foreground hover:bg-white/20" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto bg-muted/20 space-y-4"
      >
        <div className="text-center my-4">
          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">Hoje</span>
        </div>
        
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
            <div className={`flex gap-2 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.sender === 'user' ? 'bg-muted' : 'bg-primary/20'}`}>
                {msg.sender === 'user' ? <User className="w-3 h-3 text-muted-foreground" /> : <Bot className="w-3 h-3 text-primary" />}
              </div>
              <div className={`p-3 rounded-2xl ${
                msg.sender === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-tr-sm shadow-sm' 
                  : 'bg-card border border-border shadow-sm rounded-tl-sm text-foreground'
              }`}>
                <p className="text-sm break-words">{msg.text}</p>
                <div className={`text-[10px] mt-1 text-right ${msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {msg.time}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 bg-background border-t">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2 bg-muted/50 border border-transparent focus-within:border-primary/30 rounded-full p-1 transition-colors"
        >
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground">
            <Paperclip className="h-4 w-4" />
          </Button>
          <input 
            className="flex-1 bg-transparent text-sm border-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground"
            placeholder="Digite sua mensagem..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="h-9 w-9 rounded-full shrink-0"
            disabled={!inputValue.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
      
      {/* Footer Powered By */}
      <div className="bg-muted py-1 text-center">
        <p className="text-[10px] text-muted-foreground font-medium">⚡ Powered by NexAI</p>
      </div>
    </div>
  );
}
