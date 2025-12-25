import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Layout, Save, Trash2, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

type ProviderName = 'gemini' | 'grok' | 'openrouter' | 'ollama-cloud';

const PROVIDERS: { name: ProviderName; label: string; description: string; icon: string }[] = [
  {
    name: 'gemini',
    label: 'Google Gemini',
    description: 'Google\'s advanced AI model with strong reasoning capabilities',
    icon: '🔷'
  },
  {
    name: 'grok',
    label: 'xAI Grok',
    description: 'xAI\'s conversational AI with real-time knowledge',
    icon: '🤖'
  },
  {
    name: 'openrouter',
    label: 'OpenRouter',
    description: 'Access multiple AI models through a unified API',
    icon: '🔀'
  },
  {
    name: 'ollama-cloud',
    label: 'Ollama Cloud',
    description: 'Self-hosted AI models in the cloud',
    icon: '☁️'
  },
];

export default function AIProviderSettings() {
  const { user, loading, isAuthenticated } = useAuth();
  const [configs, setConfigs] = useState<Record<ProviderName, { apiKey: string; baseUrl: string; model: string }>>({
    gemini: { apiKey: '', baseUrl: '', model: 'gemini-2.0-flash-exp' },
    grok: { apiKey: '', baseUrl: '', model: 'grok-2-1212' },
    openrouter: { apiKey: '', baseUrl: '', model: 'anthropic/claude-3.5-sonnet' },
    'ollama-cloud': { apiKey: '', baseUrl: '', model: 'llama3.3:70b' },
  });
  const [savingProvider, setSavingProvider] = useState<ProviderName | null>(null);

  const { data: savedConfigs, isLoading: configsLoading, refetch } = trpc.aiProviders.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const saveConfig = trpc.aiProviders.save.useMutation({
    onSuccess: () => {
      toast.success("AI provider settings saved!");
      setSavingProvider(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
      setSavingProvider(null);
    },
  });

  const deleteConfig = trpc.aiProviders.delete.useMutation({
    onSuccess: () => {
      toast.success("AI provider removed");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete settings: ${error.message}`);
    },
  });

  useEffect(() => {
    if (savedConfigs) {
      const newConfigs = { ...configs };
      savedConfigs.forEach((config) => {
        const providerName = config.provider as ProviderName;
        newConfigs[providerName] = {
          apiKey: config.apiKey || '',
          baseUrl: config.baseUrl || '',
          model: config.model || '',
        };
      });
      setConfigs(newConfigs);
    }
  }, [savedConfigs]);

  if (loading || configsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Please sign in to continue</h2>
          <a href={getLoginUrl()}>
            <Button>Sign In</Button>
          </a>
        </div>
      </div>
    );
  }

  const handleSave = (provider: ProviderName) => {
    const config = configs[provider];
    setSavingProvider(provider);
    saveConfig.mutate({
      provider,
      apiKey: config.apiKey || undefined,
      baseUrl: config.baseUrl || undefined,
      model: config.model || undefined,
    });
  };

  const handleDelete = (provider: ProviderName) => {
    if (confirm(`Remove ${provider} configuration?`)) {
      deleteConfig.mutate({ provider });
      setConfigs({
        ...configs,
        [provider]: { apiKey: '', baseUrl: '', model: '' },
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/projects">
              <div className="flex items-center gap-2 cursor-pointer hover:opacity-80">
                <Layout className="w-6 h-6 text-blue-500" />
                <span className="text-lg font-bold text-white">OpenFlow Builder</span>
              </div>
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">AI Provider Settings</span>
          </div>
          <div className="text-sm text-slate-400">
            {user?.name || user?.email}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-white">AI Provider Settings</h1>
          </div>
          <p className="text-slate-400">
            Configure your AI providers to enable AI-powered website generation. You need at least one provider configured to use AI features.
          </p>
        </div>

        <div className="space-y-6">
          {PROVIDERS.map((provider) => {
            const config = configs[provider.name];
            const hasConfig = config.apiKey || config.baseUrl;

            return (
              <Card key={provider.name} className="bg-slate-900 border-slate-800 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{provider.icon}</span>
                    <div>
                      <h3 className="text-xl font-semibold text-white">{provider.label}</h3>
                      <p className="text-sm text-slate-400">{provider.description}</p>
                    </div>
                  </div>
                  {hasConfig && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(provider.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor={`${provider.name}-key`} className="text-slate-300">
                      API Key {provider.name === 'ollama-cloud' && '(Optional)'}
                    </Label>
                    <Input
                      id={`${provider.name}-key`}
                      type="password"
                      value={config.apiKey}
                      onChange={(e) => setConfigs({
                        ...configs,
                        [provider.name]: { ...config, apiKey: e.target.value }
                      })}
                      placeholder="Enter your API key"
                      className="bg-slate-800 border-slate-700 text-white mt-2"
                    />
                  </div>

                  {provider.name === 'ollama-cloud' && (
                    <div>
                      <Label htmlFor={`${provider.name}-url`} className="text-slate-300">
                        Base URL (Required)
                      </Label>
                      <Input
                        id={`${provider.name}-url`}
                        value={config.baseUrl}
                        onChange={(e) => setConfigs({
                          ...configs,
                          [provider.name]: { ...config, baseUrl: e.target.value }
                        })}
                        placeholder="https://your-ollama-instance.com"
                        className="bg-slate-800 border-slate-700 text-white mt-2"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor={`${provider.name}-model`} className="text-slate-300">
                      Model (Optional)
                    </Label>
                    <Input
                      id={`${provider.name}-model`}
                      value={config.model}
                      onChange={(e) => setConfigs({
                        ...configs,
                        [provider.name]: { ...config, model: e.target.value }
                      })}
                      placeholder={
                        provider.name === 'gemini' ? 'gemini-2.0-flash-exp' :
                          provider.name === 'grok' ? 'grok-2-1212' :
                            provider.name === 'openrouter' ? 'anthropic/claude-3.5-sonnet' :
                              'llama3.3:70b'
                      }
                      className="bg-slate-800 border-slate-700 text-white mt-2"
                    />
                  </div>

                  <Button
                    onClick={() => handleSave(provider.name)}
                    disabled={savingProvider === provider.name}
                    className="w-full"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {savingProvider === provider.name ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 p-6 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <h4 className="text-lg font-semibold text-blue-400 mb-2">Getting API Keys</h4>
          <ul className="space-y-2 text-sm text-slate-300">
            <li><strong>Gemini:</strong> Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google AI Studio</a></li>
            <li><strong>Grok:</strong> Get your API key from <a href="https://x.ai" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">xAI Console</a></li>
            <li><strong>OpenRouter:</strong> Get your API key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">OpenRouter Dashboard</a></li>
            <li><strong>Ollama Cloud:</strong> Deploy your own Ollama instance or use a cloud provider</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
