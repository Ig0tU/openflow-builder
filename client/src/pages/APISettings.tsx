import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Key, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function APISettings() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  const [geminiKey, setGeminiKey] = useState("");
  const [grokKey, setGrokKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [ollamaCloudKey, setOllamaCloudKey] = useState("");

  const { data: configs, isLoading, refetch } = trpc.aiProviders.list.useQuery(undefined, {
    enabled: !!user,
  });

  const saveConfig = trpc.aiProviders.save.useMutation({
    onSuccess: () => {
      toast.success("API key saved successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const deleteConfig = trpc.aiProviders.delete.useMutation({
    onSuccess: () => {
      toast.success("API key removed!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  useEffect(() => {
    if (configs) {
      const gemini = configs.find(c => c.provider === 'gemini');
      const grok = configs.find(c => c.provider === 'grok');
      const openrouter = configs.find(c => c.provider === 'openrouter');
      const ollama = configs.find(c => c.provider === 'ollama-cloud');

      if (gemini) setGeminiKey(gemini.apiKey || '');
      if (grok) setGrokKey(grok.apiKey || '');
      if (openrouter) setOpenrouterKey(openrouter.apiKey || '');
      if (ollama) setOllamaCloudKey(ollama.apiKey || '');
    }
  }, [configs]);

  const handleSave = (provider: 'gemini' | 'grok' | 'openrouter' | 'ollama-cloud', apiKey: string) => {
    if (!apiKey.trim()) {
      toast.error("API key cannot be empty");
      return;
    }

    saveConfig.mutate({
      provider,
      apiKey: apiKey.trim(),
    });
  };

  const handleDelete = (provider: 'gemini' | 'grok' | 'openrouter' | 'ollama-cloud') => {
    if (confirm(`Remove ${provider} API key?`)) {
      deleteConfig.mutate({ provider });
      
      switch (provider) {
        case 'gemini': setGeminiKey(''); break;
        case 'grok': setGrokKey(''); break;
        case 'openrouter': setOpenrouterKey(''); break;
        case 'ollama-cloud': setOllamaCloudKey(''); break;
      }
    }
  };

  const getConfigStatus = (provider: string) => {
    const config = configs?.find(c => c.provider === provider);
    return config && config.apiKey;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-600">Please log in to configure API keys</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200/60 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/projects')}
              className="text-gray-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">AI Provider Settings</h1>
              <p className="text-sm text-gray-600 mt-1">Configure your API keys for AI-powered website generation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Gemini */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Key className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-gray-900">Google Gemini</CardTitle>
                    <CardDescription className="text-gray-600">Get your API key from Google AI Studio</CardDescription>
                  </div>
                </div>
                {getConfigStatus('gemini') ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-300" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="gemini-key" className="text-gray-700 font-medium">API Key</Label>
                <Input
                  id="gemini-key"
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="Enter your Gemini API key"
                  className="bg-white border-gray-300 text-gray-900 mt-2 h-11"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleSave('gemini', geminiKey)}
                  disabled={saveConfig.isPending || !geminiKey.trim()}
                  className="shadow-sm"
                >
                  {saveConfig.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Key
                </Button>
                {getConfigStatus('gemini') && (
                  <Button
                    variant="outline"
                    onClick={() => handleDelete('gemini')}
                    disabled={deleteConfig.isPending}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Get your API key at{" "}
                <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Google AI Studio
                </a>
              </p>
            </CardContent>
          </Card>

          {/* Grok */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Key className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-gray-900">Grok (xAI)</CardTitle>
                    <CardDescription className="text-gray-600">Get your API key from xAI Console</CardDescription>
                  </div>
                </div>
                {getConfigStatus('grok') ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-300" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="grok-key" className="text-gray-700 font-medium">API Key</Label>
                <Input
                  id="grok-key"
                  type="password"
                  value={grokKey}
                  onChange={(e) => setGrokKey(e.target.value)}
                  placeholder="Enter your Grok API key"
                  className="bg-white border-gray-300 text-gray-900 mt-2 h-11"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleSave('grok', grokKey)}
                  disabled={saveConfig.isPending || !grokKey.trim()}
                  className="shadow-sm"
                >
                  {saveConfig.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Key
                </Button>
                {getConfigStatus('grok') && (
                  <Button
                    variant="outline"
                    onClick={() => handleDelete('grok')}
                    disabled={deleteConfig.isPending}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Get your API key at{" "}
                <a href="https://console.x.ai" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  xAI Console
                </a>
              </p>
            </CardContent>
          </Card>

          {/* OpenRouter */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <Key className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-gray-900">OpenRouter</CardTitle>
                    <CardDescription className="text-gray-600">Access multiple AI models through OpenRouter</CardDescription>
                  </div>
                </div>
                {getConfigStatus('openrouter') ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-300" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="openrouter-key" className="text-gray-700 font-medium">API Key</Label>
                <Input
                  id="openrouter-key"
                  type="password"
                  value={openrouterKey}
                  onChange={(e) => setOpenrouterKey(e.target.value)}
                  placeholder="Enter your OpenRouter API key"
                  className="bg-white border-gray-300 text-gray-900 mt-2 h-11"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleSave('openrouter', openrouterKey)}
                  disabled={saveConfig.isPending || !openrouterKey.trim()}
                  className="shadow-sm"
                >
                  {saveConfig.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Key
                </Button>
                {getConfigStatus('openrouter') && (
                  <Button
                    variant="outline"
                    onClick={() => handleDelete('openrouter')}
                    disabled={deleteConfig.isPending}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Get your API key at{" "}
                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  OpenRouter
                </a>
              </p>
            </CardContent>
          </Card>

          {/* Ollama Cloud */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                    <Key className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-gray-900">Ollama Cloud</CardTitle>
                    <CardDescription className="text-gray-600">Run open-source models on Ollama Cloud</CardDescription>
                  </div>
                </div>
                {getConfigStatus('ollama-cloud') ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-300" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ollama-key" className="text-gray-700 font-medium">API Key</Label>
                <Input
                  id="ollama-key"
                  type="password"
                  value={ollamaCloudKey}
                  onChange={(e) => setOllamaCloudKey(e.target.value)}
                  placeholder="Enter your Ollama Cloud API key"
                  className="bg-white border-gray-300 text-gray-900 mt-2 h-11"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleSave('ollama-cloud', ollamaCloudKey)}
                  disabled={saveConfig.isPending || !ollamaCloudKey.trim()}
                  className="shadow-sm"
                >
                  {saveConfig.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Key
                </Button>
                {getConfigStatus('ollama-cloud') && (
                  <Button
                    variant="outline"
                    onClick={() => handleDelete('ollama-cloud')}
                    disabled={deleteConfig.isPending}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Get your API key at{" "}
                <a href="https://ollama.cloud" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Ollama Cloud
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
