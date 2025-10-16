"use client";

import { useEffect, useState } from "react";
import { 
  getAISettings,
  createAISettings,
  updateAISettings,
  testAIConnection,
  resetEmbeddingIndex,
  triggerEmbeddingRegeneration,
  getEmbeddingStats,
  getEmbeddingQueueStatus,
  getSemanticSearchEnabled,
  fetchOpenAIModels,
  fetchOpenAIModelsFromSettings
} from "@/app/actions/admin-ai.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Bot, 
  Brain,
  Zap,
  CheckCircle,
  Loader2,
  AlertCircle,
  Save,
  RefreshCw,
  Trash2,
  Activity,
  Database,
  Clock
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface AISettingsItem {
  id: string;
  name: string;
  provider: string;
  model: string;
  apiKey: string | undefined;
  isActive: boolean;
  isDefault: boolean;
  maxTokens: number | null;
  temperature: number | null;
  topP: number | null;
  rateLimit: number | null;
  monthlyQuota: number | null;
  usageCount: number;
  lastUsedAt: Date | null;
}

// AI model configurations
const AI_CONFIGS = {
  general: {
    title: "General AI",
    description: "Configure AI models for prompt enhancement and generation features",
    icon: Bot,
    providers: [
      { 
        value: "openai", 
        label: "OpenAI", 
        models: ["gpt-4-turbo-preview", "gpt-4", "gpt-3.5-turbo"]
      },
      { 
        value: "anthropic", 
        label: "Anthropic", 
        models: ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"]
      },
      { 
        value: "google", 
        label: "Google", 
        models: ["gemini-pro", "gemini-pro-vision"]
      },
    ]
  },
  embedding: {
    title: "Embedding AI",
    description: "Configure embedding models for semantic search functionality",
    icon: Brain,
    providers: [
      { 
        value: "openai", 
        label: "OpenAI", 
        models: ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"]
      }
    ]
  }
};

export function AISettings() {
  const [settings, setSettings] = useState<Record<string, AISettingsItem | null>>({
    general: null,
    embedding: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [resettingIndex, setResettingIndex] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [embeddingStats, setEmbeddingStats] = useState<{
    prompts: { total: number; withEmbeddings: number; outdated: number; pending: number };
    templates: { total: number; withEmbeddings: number; outdated: number; pending: number };
  } | null>(null);
  const [queueStatus, setQueueStatus] = useState<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    total: number;
    health?: {
      isHealthy: boolean;
      hasActiveWorkers: boolean;
      message: string;
    };
  } | null>(null);
  const [statusRefreshInterval, setStatusRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [semanticSearchEnabled, setSemanticSearchEnabled] = useState(false);
  const [loadingSemanticSearch, setLoadingSemanticSearch] = useState(false);
  const [availableModels, setAvailableModels] = useState<{
    chatModels: Array<{id: string; name: string}>;
    embeddingModels: Array<{id: string; name: string}>;
  }>({ chatModels: [], embeddingModels: [] });
  const [loadingModels, setLoadingModels] = useState(false);
  const { toast } = useToast();
  
  // Form states for each configuration type
  const [generalForm, setGeneralForm] = useState({
    provider: "openai",
    model: "gpt-4-turbo-preview",
    apiKey: "",
    maxTokens: 4096,
    temperature: 0.7,
    topP: 1.0,
    rateLimit: 100,
    monthlyQuota: 10000,
    isActive: true,
    isDefault: true,
  });

  const [embeddingForm, setEmbeddingForm] = useState({
    provider: "openai",
    model: "text-embedding-3-small",
    apiKey: "",
    isActive: true,
    isDefault: true,
  });

  useEffect(() => {
    fetchSettings();
    fetchSemanticSearchSetting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await getAISettings();
      
      // Organize settings by type
      const organized: Record<string, AISettingsItem | null> = {
        general: null,
        embedding: null
      };

      data.forEach((setting: AISettingsItem) => {
        if (setting.name === "general") {
          organized.general = setting;
          setGeneralForm(prev => ({
            ...prev,
            provider: setting.provider,
            model: setting.model,
            maxTokens: setting.maxTokens || 4096,
            temperature: setting.temperature || 0.7,
            topP: setting.topP || 1.0,
            rateLimit: setting.rateLimit || 100,
            monthlyQuota: setting.monthlyQuota || 10000,
            isActive: setting.isActive,
            isDefault: setting.isDefault,
          }));
        } else if (setting.name === "embedding") {
          organized.embedding = setting;
          setEmbeddingForm(prev => ({
            ...prev,
            provider: setting.provider,
            model: setting.model,
            isActive: setting.isActive,
            isDefault: setting.isDefault,
          }));
        }
      });

      setSettings(organized);
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch AI settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (type: "general" | "embedding") => {
    setSaving(type);
    try {
      const formData = type === "general" ? generalForm : embeddingForm;
      const existingSettings = settings[type];

      const data = {
        name: type,
        ...formData,
        apiKey: formData.apiKey || undefined, // Only update if provided
      };

      if (existingSettings) {
        await updateAISettings(existingSettings.id, data);
      } else {
        // For new settings, API key is required
        if (!formData.apiKey) {
          toast({
            title: "API Key Required",
            description: "Please enter an API key to create new AI settings",
            variant: "destructive"
          });
          setSaving(null);
          return;
        }
        await createAISettings(data as typeof data & { apiKey: string });
      }

      toast({
        title: "Success",
        description: `${type === "general" ? "General AI" : "Embedding"} settings saved successfully`
      });

      await fetchSettings();
    } catch {
      toast({
        title: "Error",
        description: `Failed to save ${type} settings`,
        variant: "destructive"
      });
    } finally {
      setSaving(null);
    }
  };

  const handleTest = async (type: "general" | "embedding") => {
    const setting = settings[type];
    if (!setting && !(type === "general" ? generalForm.apiKey : embeddingForm.apiKey)) {
      toast({
        title: "Error",
        description: "Please enter an API key first",
        variant: "destructive"
      });
      return;
    }

    setTesting(type);
    try {
      const provider = type === "general" ? generalForm.provider : embeddingForm.provider;
      const result = await testAIConnection(provider, type);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Connection test successful!"
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Connection test failed",
          variant: "destructive"
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to test connection",
        variant: "destructive"
      });
    } finally {
      setTesting(null);
    }
  };

  const fetchEmbeddingStatus = async () => {
    try {
      const [stats, queue] = await Promise.all([
        getEmbeddingStats(),
        getEmbeddingQueueStatus()
      ]);
      setEmbeddingStats(stats);
      setQueueStatus(queue);
    } catch (error) {
      console.error("Error fetching embedding status:", error);
    }
  };

  const fetchSemanticSearchSetting = async () => {
    try {
      const enabled = await getSemanticSearchEnabled();
      console.log("Semantic search enabled:", enabled);
      setSemanticSearchEnabled(enabled);
    } catch (error) {
      console.error("Error fetching semantic search setting:", error);
      // Default to false if there's an error
      setSemanticSearchEnabled(false);
    }
  };

  const fetchModels = async (apiKey: string) => {
    if (!apiKey || apiKey.length < 10) return;

    console.log("Fetching models with API key length:", apiKey.length);
    setLoadingModels(true);
    try {
      const result = await fetchOpenAIModels(apiKey);
      console.log("Fetch models result:", result);

      if (result.success && 'chatModels' in result && 'embeddingModels' in result) {
        setAvailableModels({
          chatModels: result.chatModels || [],
          embeddingModels: result.embeddingModels || []
        });

        // Show success message
        toast({
          title: "Models loaded",
          description: `Found ${result.chatModels?.length || 0} chat models and ${result.embeddingModels?.length || 0} embedding models`
        });
      } else {
        toast({
          title: "Error",
          description: 'error' in result ? result.error : "Failed to fetch models",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching models:", error);
      toast({
        title: "Error",
        description: "Failed to fetch available models",
        variant: "destructive"
      });
    } finally {
      setLoadingModels(false);
    }
  };

  const fetchModelsFromSettings = async (configType: "general" | "embedding") => {
    console.log(`Fetching models from saved ${configType} settings`);
    setLoadingModels(true);
    try {
      const result = await fetchOpenAIModelsFromSettings(configType);
      console.log("Fetch models from settings result:", result);

      if (result.success && 'chatModels' in result && 'embeddingModels' in result) {
        setAvailableModels({
          chatModels: result.chatModels || [],
          embeddingModels: result.embeddingModels || []
        });

        // Show success message
        toast({
          title: "Models loaded",
          description: `Found ${result.chatModels?.length || 0} chat models and ${result.embeddingModels?.length || 0} embedding models`
        });
      } else {
        toast({
          title: "Error",
          description: 'error' in result ? result.error : "Failed to fetch models",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching models from settings:", error);
      toast({
        title: "Error",
        description: "Failed to fetch available models",
        variant: "destructive"
      });
    } finally {
      setLoadingModels(false);
    }
  };

  // Check if we should fetch models on mount if settings exist
  useEffect(() => {
    if (settings.general?.provider === "openai") {
      fetchModelsFromSettings("general");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.general?.id]);

  const handleSemanticSearchToggle = async (checked: boolean) => {
    setLoadingSemanticSearch(true);
    try {
      await setSemanticSearchEnabled(checked);
      toast({
        title: "Success",
        description: `Semantic search ${checked ? 'enabled' : 'disabled'} successfully`
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update semantic search setting",
        variant: "destructive"
      });
    } finally {
      setLoadingSemanticSearch(false);
    }
  };

  const handleResetIndex = async () => {
    if (!confirm("Are you sure you want to reset the embedding index? This will remove all existing embeddings.")) {
      return;
    }

    setResettingIndex(true);
    try {
      const result = await resetEmbeddingIndex();
      toast({
        title: "Success",
        description: result.message
      });
      await fetchEmbeddingStatus();
    } catch {
      toast({
        title: "Error",
        description: "Failed to reset embedding index",
        variant: "destructive"
      });
    } finally {
      setResettingIndex(false);
    }
  };

  const handleRegenerateEmbeddings = async () => {
    setRegenerating(true);
    try {
      const result = await triggerEmbeddingRegeneration();
      toast({
        title: "Success",
        description: result.message
      });
      
      // Start polling for status updates
      if (statusRefreshInterval) {
        clearInterval(statusRefreshInterval);
      }
      const interval = setInterval(fetchEmbeddingStatus, 2000); // Refresh every 2 seconds
      setStatusRefreshInterval(interval);
      
      await fetchEmbeddingStatus();
    } catch {
      toast({
        title: "Error",
        description: "Failed to trigger embedding regeneration",
        variant: "destructive"
      });
    } finally {
      setRegenerating(false);
    }
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (statusRefreshInterval) {
        clearInterval(statusRefreshInterval);
      }
    };
  }, [statusRefreshInterval]);

  // Fetch embedding status when embedding tab is active
  useEffect(() => {
    fetchEmbeddingStatus();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">AI Model Configuration</h3>
        <p className="text-sm text-muted-foreground">
          Configure AI providers and models for different features
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            General AI
          </TabsTrigger>
          <TabsTrigger value="embedding" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Embedding AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                General AI Configuration
              </CardTitle>
              <CardDescription>
                Configure AI models for prompt enhancement, auto-tagging, and generation features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settings.general && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" />
                  <span className="text-sm">Configuration exists</span>
                  {settings.general.isActive && (
                    <Badge variant="outline" className="ml-auto">Active</Badge>
                  )}
                </div>
              )}

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select
                      value={generalForm.provider}
                      onValueChange={(value) => {
                        const provider = AI_CONFIGS.general.providers.find(p => p.value === value);
                        setGeneralForm({ 
                          ...generalForm, 
                          provider: value,
                          model: provider?.models[0] || ""
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_CONFIGS.general.providers.map(provider => (
                          <SelectItem key={provider.value} value={provider.value}>
                            {provider.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Model {loadingModels && <span className="text-sm text-muted-foreground ml-2">(Loading...)</span>}</Label>
                    <Select
                      value={generalForm.model}
                      onValueChange={(value) => setGeneralForm({ ...generalForm, model: value })}
                      disabled={loadingModels}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {generalForm.provider === "openai" && availableModels.chatModels.length > 0 ? (
                          availableModels.chatModels.map(model => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name}
                            </SelectItem>
                          ))
                        ) : (
                          AI_CONFIGS.general.providers
                            .find(p => p.value === generalForm.provider)
                            ?.models.map(model => (
                              <SelectItem key={model} value={model}>
                                {model}
                              </SelectItem>
                            ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder={settings.general ? "Enter new key to update" : "Enter API key"}
                      value={generalForm.apiKey}
                      onChange={(e) => {
                        setGeneralForm({ ...generalForm, apiKey: e.target.value });
                      }}
                    />
                    {generalForm.provider === "openai" && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Use new API key if provided, otherwise fetch from saved settings
                          if (generalForm.apiKey) {
                            fetchModels(generalForm.apiKey);
                          } else if (settings.general) {
                            fetchModelsFromSettings("general");
                          } else {
                            toast({
                              title: "API Key Required",
                              description: "Please enter an API key to fetch available models",
                              variant: "destructive"
                            });
                          }
                        }}
                        disabled={(!generalForm.apiKey && !settings.general) || loadingModels}
                        title="Refresh available models"
                      >
                        {loadingModels ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => handleTest("general")}
                      disabled={!generalForm.apiKey && !settings.general}
                    >
                      {testing === "general" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                      Test
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your API key is encrypted and stored securely
                    {generalForm.provider === "openai" && " • Click refresh to load available models"}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Max Tokens</Label>
                    <Input
                      type="number"
                      value={generalForm.maxTokens}
                      onChange={(e) => setGeneralForm({ ...generalForm, maxTokens: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Temperature</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={generalForm.temperature}
                      onChange={(e) => setGeneralForm({ ...generalForm, temperature: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Top P</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={generalForm.topP}
                      onChange={(e) => setGeneralForm({ ...generalForm, topP: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <div className="space-y-0.5">
                    <Label>Active</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable or disable this AI configuration
                    </p>
                  </div>
                  <Switch
                    checked={generalForm.isActive}
                    onCheckedChange={(checked) => setGeneralForm({ ...generalForm, isActive: checked })}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("general")} disabled={saving === "general"}>
                  {saving === "general" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="embedding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Embedding AI Configuration
              </CardTitle>
              <CardDescription>
                Configure embedding models for semantic search functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Embeddings enable semantic search by converting text into vector representations. 
                  Changing the model will require regenerating all embeddings.
                </AlertDescription>
              </Alert>

              {settings.embedding && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" />
                  <span className="text-sm">Configuration exists</span>
                  {settings.embedding.isActive && (
                    <Badge variant="outline" className="ml-auto">Active</Badge>
                  )}
                </div>
              )}

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select value={embeddingForm.provider} disabled>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Currently only OpenAI is supported
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Embedding Model</Label>
                    <Select
                      value={embeddingForm.model}
                      onValueChange={(value) => setEmbeddingForm({ ...embeddingForm, model: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {embeddingForm.provider === "openai" && availableModels.embeddingModels.length > 0 ? (
                          availableModels.embeddingModels.map(model => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name === "text-embedding-3-small" ? "Text Embedding 3 Small (Recommended)" :
                               model.name === "text-embedding-3-large" ? "Text Embedding 3 Large (Higher Quality)" :
                               model.name === "text-embedding-ada-002" ? "Text Embedding Ada 002 (Legacy)" :
                               model.name}
                            </SelectItem>
                          ))
                        ) : (
                          AI_CONFIGS.embedding.providers[0].models.map(model => (
                            <SelectItem key={model} value={model}>
                              {model === "text-embedding-3-small" ? "Text Embedding 3 Small (Recommended)" :
                               model === "text-embedding-3-large" ? "Text Embedding 3 Large (Higher Quality)" :
                               model === "text-embedding-ada-002" ? "Text Embedding Ada 002 (Legacy)" :
                               model}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Smaller models are faster and more cost-effective
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder={settings.embedding ? "Enter new key to update" : "Enter API key"}
                      value={embeddingForm.apiKey}
                      onChange={(e) => {
                        setEmbeddingForm({ ...embeddingForm, apiKey: e.target.value });
                      }}
                    />
                    {embeddingForm.provider === "openai" && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Use new API key if provided, otherwise fetch from saved settings
                          if (embeddingForm.apiKey) {
                            fetchModels(embeddingForm.apiKey);
                          } else if (settings.embedding) {
                            fetchModelsFromSettings("embedding");
                          } else {
                            toast({
                              title: "API Key Required",
                              description: "Please enter an API key to fetch available models",
                              variant: "destructive"
                            });
                          }
                        }}
                        disabled={(!embeddingForm.apiKey && !settings.embedding) || loadingModels}
                        title="Refresh available models"
                      >
                        {loadingModels ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => handleTest("embedding")}
                      disabled={!embeddingForm.apiKey && !settings.embedding}
                    >
                      {testing === "embedding" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                      Test
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Uses the same OpenAI account as general AI
                    {embeddingForm.provider === "openai" && " • Click refresh to load available models"}
                  </p>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Semantic Search Enabled</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable or disable semantic search globally
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {semanticSearchEnabled ? "Enabled" : "Disabled"}
                      </span>
                      <Switch
                        checked={semanticSearchEnabled}
                        onCheckedChange={handleSemanticSearchToggle}
                        disabled={loadingSemanticSearch || !settings.embedding?.isActive}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Embedding Service Active</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable or disable the embedding service
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {embeddingForm.isActive ? "Enabled" : "Disabled"}
                      </span>
                      <Switch
                        checked={embeddingForm.isActive}
                        onCheckedChange={(checked) => setEmbeddingForm({ ...embeddingForm, isActive: checked })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("embedding")} disabled={saving === "embedding"}>
                  {saving === "embedding" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Embedding Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Embedding Management
              </CardTitle>
              <CardDescription>
                Manage vector embeddings for semantic search
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Display */}
              {embeddingStats && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Prompts</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total:</span>
                          <span>{embeddingStats.prompts.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">With Embeddings:</span>
                          <span className="text-[hsl(var(--success))]">{embeddingStats.prompts.withEmbeddings}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pending:</span>
                          <span className="text-orange-600">{embeddingStats.prompts.pending}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Outdated:</span>
                          <span className="text-[hsl(var(--destructive))]">{embeddingStats.prompts.outdated}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Templates</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total:</span>
                          <span>{embeddingStats.templates.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">With Embeddings:</span>
                          <span className="text-[hsl(var(--success))]">{embeddingStats.templates.withEmbeddings}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pending:</span>
                          <span className="text-orange-600">{embeddingStats.templates.pending}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Outdated:</span>
                          <span className="text-[hsl(var(--destructive))]">{embeddingStats.templates.outdated}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {embeddingStats && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Overall Progress</span>
                        <span>
                          {(() => {
                            const total = embeddingStats.prompts.total + embeddingStats.templates.total;
                            if (total === 0) return 0;
                            const withEmbeddings = embeddingStats.prompts.withEmbeddings + embeddingStats.templates.withEmbeddings;
                            return Math.round((withEmbeddings / total) * 100);
                          })()}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[hsl(var(--success))] h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(() => {
                              const total = embeddingStats.prompts.total + embeddingStats.templates.total;
                              if (total === 0) return 0;
                              const withEmbeddings = embeddingStats.prompts.withEmbeddings + embeddingStats.templates.withEmbeddings;
                              return (withEmbeddings / total) * 100;
                            })()}%`
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Queue Status */}
              {queueStatus && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Queue Status
                    </h4>
                    <div className="grid grid-cols-5 gap-2 text-sm">
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="text-2xl font-bold">{queueStatus.waiting}</div>
                        <div className="text-xs text-muted-foreground">Waiting</div>
                      </div>
                      <div className="text-center p-2 bg-[hsl(var(--primary))]/10 rounded">
                        <div className="text-2xl font-bold text-[hsl(var(--primary))]">{queueStatus.active}</div>
                        <div className="text-xs text-muted-foreground">Active</div>
                      </div>
                      <div className="text-center p-2 bg-[hsl(var(--success))]/10 rounded">
                        <div className="text-2xl font-bold text-[hsl(var(--success))]">{queueStatus.completed}</div>
                        <div className="text-xs text-muted-foreground">Completed</div>
                      </div>
                      <div className="text-center p-2 bg-[hsl(var(--destructive))]/10 rounded">
                        <div className="text-2xl font-bold text-[hsl(var(--destructive))]">{queueStatus.failed}</div>
                        <div className="text-xs text-muted-foreground">Failed</div>
                      </div>
                      <div className="text-center p-2 bg-orange-50 rounded">
                        <div className="text-2xl font-bold text-orange-600">{queueStatus.delayed}</div>
                        <div className="text-xs text-muted-foreground">Delayed</div>
                      </div>
                    </div>
                  </div>

                  {/* Worker Health Status */}
                  {queueStatus.health && (
                    <Alert variant={queueStatus.health.isHealthy ? "default" : "destructive"}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Worker Status:</strong> {queueStatus.health.message}
                        {!queueStatus.health.hasActiveWorkers && queueStatus.waiting > 0 && (
                          <div className="mt-2">
                            <code className="bg-muted px-2 py-1 rounded text-sm">npm run worker</code>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Management Actions */}
              <div className="space-y-4 border-t pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Force Regenerate Embeddings</Label>
                      <p className="text-sm text-muted-foreground">
                        Regenerate all embeddings using current model settings
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleRegenerateEmbeddings}
                      disabled={regenerating || !settings.embedding?.isActive}
                    >
                      {regenerating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Regenerate
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Reset Embedding Index</Label>
                      <p className="text-sm text-muted-foreground">
                        Clear all embeddings and reset the vector index
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={handleResetIndex}
                      disabled={resettingIndex}
                    >
                      {resettingIndex ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Reset Index
                    </Button>
                  </div>
                </div>

                {/* Auto-refresh indicator */}
                {statusRefreshInterval && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3 animate-pulse" />
                    <span>Status refreshing every 2 seconds</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (statusRefreshInterval) {
                          clearInterval(statusRefreshInterval);
                          setStatusRefreshInterval(null);
                        }
                      }}
                    >
                      Stop
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}