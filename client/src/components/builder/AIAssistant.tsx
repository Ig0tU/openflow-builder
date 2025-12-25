import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, Send, Sparkles, Mic, MicOff, Zap, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  actions?: any[];
}

interface AIAssistantProps {
  projectId: number;
  currentPageId: number | null;
  onClose: () => void;
  onElementCreate?: (element: any) => void;
  onElementUpdate?: (elementId: number, updates: any) => void;
  onElementDelete?: (elementId: number) => void;
  onElementsGenerated: () => void;
}

export default function AIAssistant({ 
  projectId, 
  currentPageId, 
  onClose,
  onElementCreate, 
  onElementUpdate, 
  onElementDelete,
  onElementsGenerated 
}: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content: "Hi! I'm your AI assistant. I can help you build your website by creating, modifying, and styling elements. Just describe what you want, and I'll make it happen on the canvas.\n\n**Try saying:**\n- \"Create a hero section with gradient background\"\n- \"Add a blue button that says Get Started\"\n- \"Make the heading text larger\"\n- \"Change the first word to red color\"",
    },
  ]);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState<"gemini" | "grok" | "openrouter" | "ollama-cloud">("gemini");
  const [isListening, setIsListening] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const { data: providerConfigs } = trpc.aiProviders.list.useQuery();

  const executeAction = trpc.aiBuilder.executeAction.useMutation({
    onSuccess: (result) => {
      console.log("Action executed:", result);
      if (result.result?.element && onElementCreate) {
        onElementCreate(result.result.element);
      }
      onElementsGenerated();
    },
    onError: (error) => {
      toast.error(`Action failed: ${error.message}`);
    },
  });

  const chat = trpc.aiBuilder.chat.useMutation({
    onSuccess: (response) => {
      setConversationId(response.conversationId);
      
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.response.message,
          actions: response.response.actions,
        },
      ]);

      if (response.response.actions && response.response.actions.length > 0) {
        response.response.actions.forEach((action: any) => {
          executeAction.mutate({ action });
        });
      }
    },
    onError: (error) => {
      toast.error(`AI Error: ${error.message}`);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I encountered an error: ${error.message}. Please make sure your API key is configured in settings.`,
        },
      ]);
    },
  });

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        toast.success(`Heard: "${transcript}"`);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        toast.error('Voice recognition failed. Please try again.');
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleVoiceRecognition = () => {
    if (!recognitionRef.current) {
      toast.error('Voice recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.info('🎤 Listening... Speak your command');
      } catch (error) {
        console.error('Failed to start recognition:', error);
        toast.error('Failed to start voice recognition');
      }
    }
  };

  const handleSend = () => {
    if (!input.trim() || !currentPageId) {
      if (!currentPageId) {
        toast.error("Please select a page first");
      }
      return;
    }

    const configuredProvider = providerConfigs?.find(c => c.provider === provider);
    if (!configuredProvider || !configuredProvider.apiKey) {
      toast.error(`Please configure your ${provider} API key in settings`);
      return;
    }

    setMessages((prev) => [...prev, { role: "user", content: input }]);

    chat.mutate({
      pageId: currentPageId,
      message: input,
      conversationId,
      provider,
    });

    setInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const isProviderConfigured = (p: string) => {
    return providerConfigs?.some(c => c.provider === p && c.apiKey);
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Assistant</h3>
              <p className="text-xs text-gray-500">Describe what you want to build</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {chat.isPending && (
              <div className="flex items-center gap-2 text-xs text-blue-600">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Building...</span>
              </div>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Provider Selection */}
        <Select value={provider} onValueChange={(v: any) => setProvider(v)}>
          <SelectTrigger className="w-full bg-white border-gray-300 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            <SelectItem value="gemini" disabled={!isProviderConfigured('gemini')}>
              Gemini {!isProviderConfigured('gemini') && '(Not configured)'}
            </SelectItem>
            <SelectItem value="grok" disabled={!isProviderConfigured('grok')}>
              Grok {!isProviderConfigured('grok') && '(Not configured)'}
            </SelectItem>
            <SelectItem value="openrouter" disabled={!isProviderConfigured('openrouter')}>
              OpenRouter {!isProviderConfigured('openrouter') && '(Not configured)'}
            </SelectItem>
            <SelectItem value="ollama-cloud" disabled={!isProviderConfigured('ollama-cloud')}>
              Ollama Cloud {!isProviderConfigured('ollama-cloud') && '(Not configured)'}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-2.5 ${
                    message.role === "user"
                      ? "bg-blue-600 text-white shadow-sm"
                      : message.role === "system"
                      ? "bg-gray-50 text-gray-700 border border-gray-200"
                      : "bg-white text-gray-900 border border-gray-200 shadow-sm"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Zap className="w-3 h-3" />
                        <span>{message.actions.length} action(s) executed</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chat.isPending && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">AI is building...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2 mb-2">
          <Button
            size="icon"
            variant={isListening ? "default" : "outline"}
            onClick={toggleVoiceRecognition}
            className={isListening ? "bg-red-600 hover:bg-red-700 shadow-sm" : "border-gray-300"}
            title={isListening ? "Stop listening" : "Voice command"}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isListening ? "🎤 Listening..." : "Describe what you want..."}
            disabled={chat.isPending || isListening || !currentPageId}
            className="flex-1 bg-white border-gray-300 text-gray-900 h-10"
          />
          <Button
            onClick={handleSend}
            disabled={chat.isPending || !input.trim() || isListening || !currentPageId}
            size="icon"
            className="shadow-sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {!currentPageId ? (
          <p className="text-xs text-amber-600">Please select a page to start building</p>
        ) : (
          <p className="text-xs text-gray-500">
            💡 Try: "Add a hero section" or "Change button to blue"
          </p>
        )}
      </div>
    </div>
  );
}
