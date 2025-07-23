"use client";

import { useEffect, useState } from "react";
import { 
  getAISettings,
  createAISettings,
  updateAISettings,
  deleteAISettings,
  testAIConnection
} from "@/app/actions/admin-ai.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Bot, 
  Plus, 
  Settings, 
  Trash, 
  Zap,
  CheckCircle,
  XCircle,
  Key,
  Loader2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AISettingsItem {
  id: string;
  name: string;
  provider: string;
  model: string;
  apiKey: string;
  hasApiKey: boolean;
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

const PROVIDER_OPTIONS = [
  { value: "openai", label: "OpenAI", models: ["gpt-4-turbo-preview", "gpt-4", "gpt-3.5-turbo"] },
  { value: "anthropic", label: "Anthropic", models: ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"] },
  { value: "google", label: "Google", models: ["gemini-pro", "gemini-pro-vision"] },
];

export function AISettings() {
  const [settings, setSettings] = useState<AISettingsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<AISettingsItem | null>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    provider: "openai",
    model: "gpt-4-turbo-preview",
    apiKey: "",
    maxTokens: 4096,
    temperature: 0.7,
    topP: 1.0,
    rateLimit: 100,
    monthlyQuota: 10000,
    isDefault: false,
    isActive: true,
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await getAISettings();
      setSettings(data);
    } catch (error) {
      console.error("Failed to fetch AI settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleCreate = async () => {
    const result = await createAISettings(formData);
    if (result.success) {
      fetchSettings();
      setDialogOpen(false);
      resetForm();
    } else {
      alert(result.error || "Failed to create AI settings");
    }
  };

  const handleUpdate = async () => {
    if (!selectedSetting) return;
    
    const updates: Record<string, unknown> = { ...formData };
    // Only include API key if it was changed
    if (!formData.apiKey || formData.apiKey === '********') {
      delete updates.apiKey;
    }
    
    const result = await updateAISettings({
      id: selectedSetting.id,
      updates,
    });
    
    if (result.success) {
      fetchSettings();
      setDialogOpen(false);
      resetForm();
    } else {
      alert(result.error || "Failed to update AI settings");
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteAISettings(id);
    if (result.success) {
      fetchSettings();
      setDeleteDialogOpen(false);
    } else {
      alert(result.error || "Failed to delete AI settings");
    }
  };

  const handleTest = async (id: string) => {
    setTestingConnection(id);
    try {
      const result = await testAIConnection(id);
      alert(result.message);
      if (result.success) {
        fetchSettings(); // Refresh to show updated lastUsedAt
      }
    } catch {
      alert("Connection test failed");
    } finally {
      setTestingConnection(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      provider: "openai",
      model: "gpt-4-turbo-preview",
      apiKey: "",
      maxTokens: 4096,
      temperature: 0.7,
      topP: 1.0,
      rateLimit: 100,
      monthlyQuota: 10000,
      isDefault: false,
      isActive: true,
    });
    setSelectedSetting(null);
  };

  const openEditDialog = (setting: AISettingsItem) => {
    setSelectedSetting(setting);
    setFormData({
      name: setting.name,
      provider: setting.provider,
      model: setting.model,
      apiKey: "", // Don't show the actual key
      maxTokens: setting.maxTokens || 4096,
      temperature: setting.temperature || 0.7,
      topP: setting.topP || 1.0,
      rateLimit: setting.rateLimit || 100,
      monthlyQuota: setting.monthlyQuota || 10000,
      isDefault: setting.isDefault,
      isActive: setting.isActive,
    });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">AI Model Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure AI providers and models for prompt enhancement features
          </p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Configuration
        </Button>
      </div>

      <div className="grid gap-4">
        {settings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No AI configurations yet</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => { resetForm(); setDialogOpen(true); }}
              >
                Add your first configuration
              </Button>
            </CardContent>
          </Card>
        ) : (
          settings.map((setting) => (
            <Card key={setting.id} className={setting.isDefault ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {setting.name}
                      {setting.isDefault && (
                        <Badge variant="default">Default</Badge>
                      )}
                      {setting.isActive ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          <XCircle className="h-3 w-3 mr-1" /> Inactive
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {setting.provider} - {setting.model}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest(setting.id)}
                      disabled={testingConnection === setting.id}
                    >
                      {testingConnection === setting.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(setting)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSetting(setting);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">API Key</p>
                    <p className="flex items-center gap-1">
                      <Key className="h-3 w-3" />
                      {setting.hasApiKey ? "Configured" : "Not configured"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Usage</p>
                    <p>{setting.usageCount} / {setting.monthlyQuota || "∞"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Rate Limit</p>
                    <p>{setting.rateLimit || "∞"} req/min</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Used</p>
                    <p>
                      {setting.lastUsedAt 
                        ? new Date(setting.lastUsedAt).toLocaleDateString()
                        : "Never"
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedSetting ? "Edit AI Configuration" : "Add AI Configuration"}
            </DialogTitle>
            <DialogDescription>
              Configure AI provider settings for prompt enhancement features
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Configuration Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Primary OpenAI"
                />
              </div>
              <div>
                <Label>Provider</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(value) => {
                    const provider = PROVIDER_OPTIONS.find(p => p.value === value);
                    setFormData({ 
                      ...formData, 
                      provider: value,
                      model: provider?.models[0] || ""
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_OPTIONS.map(provider => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Model</Label>
                <Select
                  value={formData.model}
                  onValueChange={(value) => setFormData({ ...formData, model: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_OPTIONS
                      .find(p => p.value === formData.provider)
                      ?.models.map(model => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder={selectedSetting ? "Leave blank to keep current" : "Enter API key"}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Max Tokens</Label>
                <Input
                  type="number"
                  value={formData.maxTokens}
                  onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Temperature</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Top P</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={formData.topP}
                  onChange={(e) => setFormData({ ...formData, topP: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rate Limit (req/min)</Label>
                <Input
                  type="number"
                  value={formData.rateLimit}
                  onChange={(e) => setFormData({ ...formData, rateLimit: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Monthly Quota</Label>
                <Input
                  type="number"
                  value={formData.monthlyQuota}
                  onChange={(e) => setFormData({ ...formData, monthlyQuota: parseInt(e.target.value) })}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="active">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="default"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                />
                <Label htmlFor="default">Set as Default</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={selectedSetting ? handleUpdate : handleCreate}>
              {selectedSetting ? "Save Changes" : "Create Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete AI Configuration</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedSetting?.name}&quot;? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedSetting && handleDelete(selectedSetting.id)}
            >
              Delete Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}