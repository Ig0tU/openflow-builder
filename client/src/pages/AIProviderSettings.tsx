import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Layout, Save, Trash2, Key, ExternalLink, Check, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

type ProviderName = 'gemini' | 'grok' | 'openrouter' | 'ollama-cloud';

const PROVIDERS: { name: ProviderName; label: string; description: string; defaultModel: string; docsUrl: string }[] = [
  {
    name: 'gemini',
    label: 'Google Gemini',
    description: 'Advanced reasoning and code generation',
    defaultModel: 'gemini-2.0-flash-exp',
    docsUrl: 'https://makersuite.google.com/app/apikey',
  },
  {
    name: 'grok',
    label: 'xAI Grok',
    description: 'Real-time knowledge and conversational AI',
    defaultModel: 'grok-2-1212',
    docsUrl: 'https://console.x.ai/',
  },
  {
    name: 'openrouter',
    label: 'OpenRouter',
    description: 'Free coding, vision & reasoning models',
    defaultModel: 'mistralai/devstral-2512:free',
    docsUrl: 'https://openrouter.ai/keys',
  },
  {
    name: 'ollama-cloud',
    label: 'Ollama Cloud',
    description: 'Run powerful cloud models (coding, vision, reasoning)',
    defaultModel: 'qwen3-coder:480b-cloud',
    docsUrl: 'https://ollama.com/cloud',
  },
];

// Free OpenRouter models curated for coding and vision
const OPENROUTER_FREE_MODELS = [
  { id: 'mistralai/devstral-2512:free', label: 'Devstral 2512 (Coding)', category: 'coding' },
  { id: 'kwaipilot/kat-coder-pro:free', label: 'KAT Coder Pro (Coding)', category: 'coding' },
  { id: 'xiaomi/mimo-v2-flash:free', label: 'MiMo V2 Flash (Vision)', category: 'vision' },
  { id: 'nvidia/nemotron-nano-12b-v2-vl:free', label: 'Nemotron Nano VL (Vision)', category: 'vision' },
  { id: 'tngtech/deepseek-r1t2-chimera:free', label: 'DeepSeek R1T2 Chimera (Reasoning)', category: 'reasoning' },
  { id: 'tngtech/deepseek-r1t-chimera:free', label: 'DeepSeek R1T Chimera (Reasoning)', category: 'reasoning' },
  { id: 'tngtech/tng-r1t-chimera:free', label: 'TNG R1T Chimera (Reasoning)', category: 'reasoning' },
  { id: 'nex-agi/deepseek-v3.1-nex-n1:free', label: 'DeepSeek V3.1 Nex (General)', category: 'general' },
  { id: 'nvidia/nemotron-3-nano-30b-a3b:free', label: 'Nemotron 3 Nano 30B (General)', category: 'general' },
  { id: 'z-ai/glm-4.5-air:free', label: 'GLM 4.5 Air (General)', category: 'general' },
];

export default function AIProviderSettings() {
  const { user, loading, isAuthenticated } = useAuth();
  const [configs, setConfigs] = useState<Record<ProviderName, { apiKey: string; baseUrl: string; model: string }>>({
    gemini: { apiKey: '', baseUrl: '', model: '' },
    grok: { apiKey: '', baseUrl: '', model: '' },
    openrouter: { apiKey: '', baseUrl: '', model: '' },
    'ollama-cloud': { apiKey: '', baseUrl: '', model: '' },
  });
  const [savingProvider, setSavingProvider] = useState<ProviderName | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<ProviderName | null>(null);

  const { data: savedConfigs, isLoading: configsLoading, refetch } = trpc.aiProviders.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const saveConfig = trpc.aiProviders.save.useMutation({
    onSuccess: () => {
      toast.success("Configuration saved");
      setSavingProvider(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
      setSavingProvider(null);
    },
  });

  const deleteConfig = trpc.aiProviders.delete.useMutation({
    onSuccess: () => {
      toast.success("Configuration removed");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Please sign in</h2>
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

  const isConfigured = (provider: ProviderName) => {
    return savedConfigs?.some(c => c.provider === provider && c.apiKey);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/projects">
                <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                  <Layout className="w-5 h-5" />
                  <span className="font-medium">OpenFlow</span>
                </button>
              </Link>
              <span className="text-gray-300">/</span>
              <span className="text-gray-900 font-medium">AI Configuration</span>
            </div>
            <div className="text-sm text-gray-500">
              {user?.name || user?.email}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-light text-gray-900 mb-2">AI Providers</h1>
          <p className="text-gray-500">
            Configure your API keys to enable AI-powered website generation.
          </p>
        </div>

        {/* Provider Cards */}
        <div className="space-y-4">
          {PROVIDERS.map((provider) => {
            const config = configs[provider.name];
            const configured = isConfigured(provider.name);
            const isExpanded = expandedProvider === provider.name;

            return (
              <div
                key={provider.name}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden transition-all duration-200 hover:border-gray-300"
              >
                {/* Provider Header */}
                <button
                  onClick={() => setExpandedProvider(isExpanded ? null : provider.name)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${configured ? 'bg-green-50' : 'bg-gray-100'
                      }`}>
                      {configured ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Key className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{provider.label}</h3>
                      <p className="text-sm text-gray-500">{provider.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {configured && (
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                        Configured
                      </span>
                    )}
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-6 pb-6 border-t border-gray-100">
                    <div className="pt-6 space-y-5">
                      {/* API Key */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm font-medium text-gray-700">
                            API Key {provider.name === 'ollama-cloud' && <span className="text-gray-400 font-normal">(optional)</span>}
                          </Label>
                          <a
                            href={provider.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            Get API Key <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <Input
                          type="password"
                          value={config.apiKey}
                          onChange={(e) => setConfigs({
                            ...configs,
                            [provider.name]: { ...config, apiKey: e.target.value }
                          })}
                          placeholder="Enter your API key"
                          className="bg-white border-gray-300 text-gray-900 h-11"
                        />
                      </div>

                      {/* Base URL (Ollama only - optional, defaults to ollama.com) */}
                      {provider.name === 'ollama-cloud' && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">
                            Base URL <span className="text-gray-400 font-normal">(default: ollama.com)</span>
                          </Label>
                          <Input
                            value={config.baseUrl}
                            onChange={(e) => setConfigs({
                              ...configs,
                              [provider.name]: { ...config, baseUrl: e.target.value }
                            })}
                            placeholder="https://ollama.com"
                            className="bg-white border-gray-300 text-gray-900 h-11"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Leave empty to use Ollama Cloud, or enter your self-hosted Ollama URL
                          </p>
                        </div>
                      )}

                      {/* Model */}
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Model <span className="text-gray-400 font-normal">(default: {provider.defaultModel})</span>
                        </Label>

                        {/* OpenRouter model presets */}
                        {provider.name === 'openrouter' && (
                          <div className="mb-2">
                            <select
                              className="w-full h-10 px-3 bg-white border border-gray-300 rounded-md text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={config.model || ''}
                              onChange={(e) => setConfigs({
                                ...configs,
                                [provider.name]: { ...config, model: e.target.value }
                              })}
                            >
                              <option value="">Select a free model...</option>
                              <optgroup label="🔧 Coding">
                                {OPENROUTER_FREE_MODELS.filter(m => m.category === 'coding').map(m => (
                                  <option key={m.id} value={m.id}>{m.label}</option>
                                ))}
                              </optgroup>
                              <optgroup label="👁️ Vision">
                                {OPENROUTER_FREE_MODELS.filter(m => m.category === 'vision').map(m => (
                                  <option key={m.id} value={m.id}>{m.label}</option>
                                ))}
                              </optgroup>
                              <optgroup label="🧠 Reasoning">
                                {OPENROUTER_FREE_MODELS.filter(m => m.category === 'reasoning').map(m => (
                                  <option key={m.id} value={m.id}>{m.label}</option>
                                ))}
                              </optgroup>
                              <optgroup label="💬 General">
                                {OPENROUTER_FREE_MODELS.filter(m => m.category === 'general').map(m => (
                                  <option key={m.id} value={m.id}>{m.label}</option>
                                ))}
                              </optgroup>
                            </select>
                            <p className="text-xs text-green-600 mt-1">✨ All models above are FREE</p>
                          </div>
                        )}

                        {provider.name !== 'openrouter' && (
                          <Input
                            value={config.model}
                            onChange={(e) => setConfigs({
                              ...configs,
                              [provider.name]: { ...config, model: e.target.value }
                            })}
                            placeholder={provider.defaultModel}
                            className="bg-white border-gray-300 text-gray-900 h-11"
                          />
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2">
                        {configured ? (
                          <button
                            onClick={() => handleDelete(provider.name)}
                            className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1.5"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </button>
                        ) : (
                          <div />
                        )}
                        <Button
                          onClick={() => handleSave(provider.name)}
                          disabled={savingProvider === provider.name}
                          className="h-10 px-6"
                        >
                          {savingProvider === provider.name ? (
                            'Saving...'
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Help Section */}
        <div className="mt-10 p-6 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Need help?</h4>
              <p className="text-sm text-gray-500">
                You need at least one AI provider configured to use the AI builder features.
                Your API keys are stored securely and only used to make requests on your behalf.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
