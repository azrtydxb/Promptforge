"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, X } from "lucide-react";
import { createTemplate } from "@/app/actions/template.actions";
import { toast } from "sonner";

const categories = [
  "coding",
  "writing",
  "chat",
  "business",
  "education",
  "creative",
  "analysis",
];

interface Variable {
  name: string;
  description: string;
  example?: string;
}

export default function NewTemplatePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "coding",
    content: "",
    example: "",
    isPublic: true,
  });
  const [variables, setVariables] = useState<Variable[]>([]);
  const [newVariable, setNewVariable] = useState<Variable>({
    name: "",
    description: "",
    example: "",
  });

  const handleAddVariable = () => {
    if (newVariable.name && newVariable.description) {
      setVariables([...variables, newVariable]);
      setNewVariable({ name: "", description: "", example: "" });
    }
  };

  const handleRemoveVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const variablesObj = variables.reduce((acc, v) => {
        acc[v.name] = { description: v.description, example: v.example };
        return acc;
      }, {} as Record<string, { description: string; example?: string }>);

      await createTemplate({
        ...formData,
        variables: variablesObj,
      });

      toast.success("Template created successfully!");
      router.push("/templates");
    } catch (error) {
      toast.error("Failed to create template");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button
          onClick={() => router.back()}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Code Review Assistant"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of what this template does"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Template Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="content">
                Prompt Template
                <span className="text-sm text-muted-foreground ml-2">
                  Use {"{{variable}}"} syntax for variables
                </span>
              </Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="Enter your prompt template with {{variables}}"
                rows={8}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="example">Example Usage (Optional)</Label>
              <Textarea
                id="example"
                value={formData.example}
                onChange={(e) =>
                  setFormData({ ...formData, example: e.target.value })
                }
                placeholder="Show an example of how to use this template"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Variables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {variables.length > 0 && (
              <div className="space-y-2">
                {variables.map((variable, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-3 bg-muted rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {"{{"}{variable.name}{"}}"} 
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {variable.description}
                      </div>
                      {variable.example && (
                        <div className="text-sm text-muted-foreground">
                          Example: {variable.example}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveVariable(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Variable name"
                  value={newVariable.name}
                  onChange={(e) =>
                    setNewVariable({ ...newVariable, name: e.target.value })
                  }
                />
                <Input
                  placeholder="Description"
                  value={newVariable.description}
                  onChange={(e) =>
                    setNewVariable({
                      ...newVariable,
                      description: e.target.value,
                    })
                  }
                />
                <Input
                  placeholder="Example (optional)"
                  value={newVariable.example || ""}
                  onChange={(e) =>
                    setNewVariable({ ...newVariable, example: e.target.value })
                  }
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddVariable}
                disabled={!newVariable.name || !newVariable.description}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Variable
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Template"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}