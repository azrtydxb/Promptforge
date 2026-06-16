'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  getModerationRules,
  createModerationRule,
  updateModerationRule,
  deleteModerationRule,
} from '@/app/actions/moderation.actions';

interface ModerationRule {
  id: string;
  name: string;
  description: string | null;
  pattern: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  action: 'FLAG' | 'BLOCK' | 'REJECT' | 'REQUIRE_REVIEW';
  isActive: boolean;
  createdAt: Date;
  _count?: {
    logs: number;
  };
}

const SEVERITY_COLORS = {
  LOW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
};

const ACTION_COLORS = {
  FLAG: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  BLOCK: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  REJECT: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  REQUIRE_REVIEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
};

export function ModerationRules() {
  const router = useRouter();
  const [rules, setRules] = useState<ModerationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<ModerationRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<ModerationRule | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    pattern: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    action: 'FLAG' | 'BLOCK' | 'REJECT' | 'REQUIRE_REVIEW';
    isActive: boolean;
  }>({
    name: '',
    description: '',
    pattern: '',
    severity: 'MEDIUM',
    action: 'FLAG',
    isActive: true,
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const result = await getModerationRules();
      if (result.success && result.rules) {
        // Rule actions are always one of FLAG/BLOCK/REJECT/REQUIRE_REVIEW (APPROVE is a
        // log-only action on the ModerationAction enum, never used for rules).
        setRules(result.rules as ModerationRule[]);
      } else {
        toast.error(result.error || 'Failed to load moderation rules');
      }
    } catch {
      toast.error('An error occurred loading rules');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      pattern: '',
      severity: 'MEDIUM',
      action: 'FLAG',
      isActive: true,
    });
    setEditingRule(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const handleOpenEdit = (rule: ModerationRule) => {
    setFormData({
      name: rule.name,
      description: rule.description || '',
      pattern: rule.pattern,
      severity: rule.severity,
      action: rule.action,
      isActive: rule.isActive,
    });
    setEditingRule(rule);
    setShowCreateDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.pattern.trim()) {
      toast.error('Name and pattern are required');
      return;
    }

    setSubmitting(true);
    try {
      let result;
      if (editingRule) {
        result = await updateModerationRule(editingRule.id, formData);
      } else {
        result = await createModerationRule(formData);
      }

      if (result.success) {
        toast.success(editingRule ? 'Rule updated successfully' : 'Rule created successfully');
        setShowCreateDialog(false);
        resetForm();
        loadRules();
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to save rule');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (rule: ModerationRule) => {
    try {
      const result = await updateModerationRule(rule.id, {
        isActive: !rule.isActive,
      });

      if (result.success) {
        toast.success(rule.isActive ? 'Rule deactivated' : 'Rule activated');
        loadRules();
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to update rule');
      }
    } catch {
      toast.error('An error occurred');
    }
  };

  const handleDelete = async () => {
    if (!deletingRule) return;

    try {
      const result = await deleteModerationRule(deletingRule.id);

      if (result.success) {
        toast.success('Rule deleted successfully');
        setDeletingRule(null);
        loadRules();
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to delete rule');
      }
    } catch {
      toast.error('An error occurred');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-12 pb-12">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Moderation Rules
              </CardTitle>
              <CardDescription>
                Configure automated content moderation rules using regex patterns
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingRule ? 'Edit Moderation Rule' : 'Create Moderation Rule'}
                  </DialogTitle>
                  <DialogDescription>
                    Define a pattern and action for automatic content moderation
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Rule Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Block Spam Keywords"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe what this rule does..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pattern">
                      Regex Pattern *
                      <span className="text-xs text-muted-foreground ml-2">
                        (JavaScript regex syntax)
                      </span>
                    </Label>
                    <Input
                      id="pattern"
                      value={formData.pattern}
                      onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                      placeholder="e.g., (spam|viagra|crypto|click here)"
                      required
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="severity">Severity</Label>
                      <Select
                        value={formData.severity}
                        onValueChange={(value: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') =>
                          setFormData({ ...formData, severity: value })
                        }
                      >
                        <SelectTrigger id="severity">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="action">Action</Label>
                      <Select
                        value={formData.action}
                        onValueChange={(value: 'FLAG' | 'BLOCK' | 'REJECT' | 'REQUIRE_REVIEW') => setFormData({ ...formData, action: value })}
                      >
                        <SelectTrigger id="action">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FLAG">Flag for Review</SelectItem>
                          <SelectItem value="BLOCK">Block Immediately</SelectItem>
                          <SelectItem value="REJECT">Auto Reject</SelectItem>
                          <SelectItem value="REQUIRE_REVIEW">Require Manual Review</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, isActive: checked })
                        }
                      />
                      <Label htmlFor="isActive" className="cursor-pointer">
                        Active
                      </Label>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={submitting} className="flex-1">
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>{editingRule ? 'Update Rule' : 'Create Rule'}</>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateDialog(false);
                        resetForm();
                      }}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No moderation rules configured</p>
              <p className="text-sm mt-2">Create your first rule to automate content moderation</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <Card key={rule.id} className={!rule.isActive ? 'opacity-60' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{rule.name}</h3>
                          <Badge className={SEVERITY_COLORS[rule.severity]}>
                            {rule.severity}
                          </Badge>
                          <Badge className={ACTION_COLORS[rule.action]}>
                            {rule.action.replace('_', ' ')}
                          </Badge>
                          {!rule.isActive && (
                            <Badge variant="outline" className="text-muted-foreground">
                              Inactive
                            </Badge>
                          )}
                        </div>

                        {rule.description && (
                          <p className="text-sm text-muted-foreground">{rule.description}</p>
                        )}

                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-1 bg-muted rounded font-mono text-xs">
                              {rule.pattern}
                            </code>
                          </div>
                          {rule._count && (
                            <span className="text-muted-foreground">
                              {rule._count.logs} matches
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={() => handleToggleActive(rule)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(rule)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingRule(rule)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingRule} onOpenChange={() => setDeletingRule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Moderation Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingRule?.name}&quot;? This action cannot be
              undone. Historical logs will remain but this rule will no longer be applied.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete Rule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
