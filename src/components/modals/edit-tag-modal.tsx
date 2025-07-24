"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ModalWrapper } from "@/components/ui/modal-wrapper";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useModal } from "@/hooks/use-modal-store";
import { updateTag } from "@/app/actions/tag-management.actions";

export function EditTagModal() {
  const { isOpen, onClose, type, data } = useModal();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const isModalOpen = isOpen && type === "editTag";

  useEffect(() => {
    if (data.tag) {
      setFormData({
        name: data.tag.name || "",
        description: data.tag.description || "",
      });
    }
  }, [data.tag]);

  const handleClose = () => {
    setFormData({ name: "", description: "" });
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.name.trim() || !data.tag?.id) return;

    try {
      setIsLoading(true);
      const updatedTag = await updateTag({
        id: data.tag.id,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });
      
      if (data.onSuccess) {
        data.onSuccess(updatedTag);
      }
      
      handleClose();
    } catch (error) {
      console.error("Error updating tag:", error);
      alert("Failed to update tag. Please check the console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalWrapper
      open={isModalOpen}
      onOpenChange={handleClose}
      title="Edit Tag"
      description="Update the tag name and description."
      footer={
        <>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading || !formData.name.trim()}
            onClick={handleSubmit as any}
          >
            {isLoading ? "Updating..." : "Update Tag"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Tag Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., JavaScript, AI, Tutorial"
            disabled={isLoading}
            maxLength={50}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe what this tag is used for..."
            disabled={isLoading}
            maxLength={500}
            rows={3}
          />
        </div>
      </form>
    </ModalWrapper>
  );
}