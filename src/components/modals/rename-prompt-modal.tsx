"use client";

import { useState } from "react";
import { useModal } from "@/hooks/use-modal-store";
import { renamePrompt } from "@/app/actions/prompt.actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const RenamePromptModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const isModalOpen = isOpen && type === "renamePrompt";
  const { prompt } = data;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt || !title.trim()) return;
    
    try {
      setLoading(true);
      await renamePrompt(prompt.id, title.trim());
      handleClose();
      window.location.reload(); // Refresh to show changes
    } catch (error) {
      console.error("Failed to rename prompt:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  // Set initial title when prompt changes
  if (prompt && title === "") {
    setTitle(prompt.title);
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename Prompt</DialogTitle>
          <DialogDescription>
            Enter a new name for your prompt.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3"
                placeholder="Enter prompt title..."
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              loading={loading}
              loadingText="Renaming..."
              disabled={!title.trim()}
            >
              Rename
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};