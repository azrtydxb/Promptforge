"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sparkles,
  Wand2,
  Tag,
  Link2,
  ChevronRight,
  Loader2,
  Info,
  Check,
  Copy,
} from "lucide-react";
import {
  enhancePrompt,
  generateAutoTags,
  applyAutoTags,
  findSimilarPrompts,
} from "@/app/actions/ai-prompt.actions";
import { cn } from "@/lib/utils";
import type { AIEnhancementSuggestion } from "@/services/ai-service";

interface AIEnhancementPanelProps {
  promptId: string;
  currentContent: string;
  currentTags: string[];
  onTagsUpdate?: (tags: string[]) => void;
  onContentUpdate?: (content: string) => void;
}

export function AIEnhancementPanel({
  promptId,
  currentContent,
  currentTags,
  onTagsUpdate,
  onContentUpdate,
}: AIEnhancementPanelProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [isFindingSimilar, setIsFindingSimilar] = useState(false);
  const [enhancement, setEnhancement] = useState<{
    enhancedContent: string;
    suggestions: AIEnhancementSuggestion[];
    explanation: string;
  } | null>(null);
  const [suggestedTags, setSuggestedTags] = useState<{
    tags: string[];
    confidence: { [tag: string]: number };
  } | null>(null);
  const [similarPrompts, setSimilarPrompts] = useState<
    Array<{
      id: string;
      title: string;
      description?: string | null;
      similarity: number;
      tags: Array<{ name: string }>;
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleEnhance = async () => {
    setIsEnhancing(true);
    setError(null);
    try {
      const result = await enhancePrompt(promptId);
      if (result.success && !result.alreadyEnhanced) {
        setEnhancement({
          enhancedContent: result.enhancedContent!,
          suggestions: result.suggestions as AIEnhancementSuggestion[],
          explanation: (result as { explanation?: string }).explanation || "",
        });
      } else if (result.alreadyEnhanced) {
        setEnhancement({
          enhancedContent: result.enhancedContent!,
          suggestions: result.suggestions as AIEnhancementSuggestion[],
          explanation: "This prompt has already been enhanced.",
        });
      } else {
        setError(result.error || "Failed to enhance prompt");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerateTags = async () => {
    setIsGeneratingTags(true);
    setError(null);
    try {
      const result = await generateAutoTags(promptId);
      if (result.success && 'tags' in result) {
        setSuggestedTags({
          tags: result.tags,
          confidence: result.confidence,
        });
      } else {
        setError(result.error || "Failed to generate tags");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsGeneratingTags(false);
    }
  };

  const handleApplyTags = async (tags: string[]) => {
    try {
      const result = await applyAutoTags(promptId, tags);
      if (result.success) {
        onTagsUpdate?.([...currentTags, ...tags]);
        setSuggestedTags(null);
      } else {
        setError(result.error || "Failed to apply tags");
      }
    } catch {
      setError("An unexpected error occurred");
    }
  };

  const handleFindSimilar = async () => {
    setIsFindingSimilar(true);
    setError(null);
    try {
      const result = await findSimilarPrompts(promptId);
      if (result.success) {
        setSimilarPrompts(result.similarPrompts!);
      } else {
        setError(result.error || "Failed to find similar prompts");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsFindingSimilar(false);
    }
  };

  const handleCopyEnhancement = async () => {
    if (enhancement) {
      try {
        await navigator.clipboard.writeText(enhancement.enhancedContent);
        setCopiedId("enhanced");
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        setError("Failed to copy to clipboard");
      }
    }
  };

  const handleApplyEnhancement = () => {
    if (enhancement && onContentUpdate) {
      onContentUpdate(enhancement.enhancedContent);
      setEnhancement(null);
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "clarity":
        return "💡";
      case "specificity":
        return "🎯";
      case "context":
        return "📝";
      case "structure":
        return "🏗️";
      case "alternative":
        return "🔄";
      default:
        return "✨";
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Enhancement Tools
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Enhancement Button */}
          <div>
            <Button
              onClick={handleEnhance}
              disabled={isEnhancing || !currentContent}
              className="w-full"
              variant="outline"
            >
              {isEnhancing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Enhance Prompt
            </Button>
          </div>

          {/* Enhancement Results */}
          {enhancement && (
            <Card className="bg-blue-50 dark:bg-blue-100">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Enhanced Version</h4>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyEnhancement}
                    >
                      {copiedId === "enhanced" ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <Button size="sm" onClick={handleApplyEnhancement}>
                      Apply
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm p-3 bg-white dark:bg-gray-900 rounded border">
                  {enhancement.enhancedContent}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Suggestions:
                  </p>
                  {enhancement.suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="text-xs p-2 bg-white dark:bg-gray-900 rounded border"
                    >
                      <div className="flex items-start gap-2">
                        <span>{getSuggestionIcon(suggestion.type)}</span>
                        <div className="flex-1">
                          <p className="font-medium">{suggestion.suggestion}</p>
                          {suggestion.example && (
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                              Example: {suggestion.example}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {enhancement.explanation && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <Info className="h-3 w-3 mt-0.5" />
                    <p>{enhancement.explanation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Auto-Tagging */}
          <div>
            <Button
              onClick={handleGenerateTags}
              disabled={isGeneratingTags || !currentContent}
              className="w-full"
              variant="outline"
            >
              {isGeneratingTags ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Tag className="h-4 w-4 mr-2" />
              )}
              Generate Auto-Tags
            </Button>
          </div>

          {/* Suggested Tags */}
          {suggestedTags && (
            <Card className="bg-green-50 dark:bg-green-100">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Suggested Tags</h4>
                  <Button
                    size="sm"
                    onClick={() => handleApplyTags(suggestedTags.tags)}
                  >
                    Apply All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {suggestedTags.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className={cn(
                        "cursor-pointer transition-all",
                        suggestedTags.confidence[tag] > 0.8
                          ? "border-green-500"
                          : suggestedTags.confidence[tag] > 0.6
                          ? "border-yellow-500"
                          : "border-gray-300"
                      )}
                      onClick={() => handleApplyTags([tag])}
                    >
                      {tag}
                      <span className="ml-1 text-xs opacity-60">
                        {Math.round(suggestedTags.confidence[tag] * 100)}%
                      </span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Similar Prompts */}
          <div>
            <Button
              onClick={handleFindSimilar}
              disabled={isFindingSimilar || !currentContent}
              className="w-full"
              variant="outline"
            >
              {isFindingSimilar ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Find Similar Prompts
            </Button>
          </div>

          {/* Similar Prompts Results */}
          {similarPrompts.length > 0 && (
            <Card className="bg-purple-50 dark:bg-purple-100">
              <CardHeader className="pb-3">
                <h4 className="text-sm font-medium">Similar Prompts</h4>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {similarPrompts.map((prompt) => (
                    <a
                      key={prompt.id}
                      href={`/prompts/${prompt.id}`}
                      className="block p-2 bg-white dark:bg-gray-900 rounded border hover:border-purple-500 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {prompt.title}
                          </p>
                          {prompt.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              {prompt.description}
                            </p>
                          )}
                          <div className="flex gap-1 mt-1">
                            {prompt.tags.slice(0, 3).map((tag) => (
                              <Badge
                                key={tag.name}
                                variant="outline"
                                className="text-xs"
                              >
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <span className="text-xs text-gray-500">
                            {Math.round(prompt.similarity * 100)}%
                          </span>
                          <ChevronRight className="h-3 w-3 text-gray-400" />
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}