"use client";

import { useState } from "react";
import { useModal } from "@/hooks/use-modal-store";
import { deletePrompt } from "@/app/actions/prompt.actions";
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

export const DeletePromptModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const [loading, setLoading] = useState(false);

  const isModalOpen = isOpen && type === "deletePrompt";
  const { prompt, onConfirm } = data;

  const handleDelete = async () => {
    if (!prompt) return;
    
    try {
      setLoading(true);
      
      // Call the optimistic update callback immediately
      if (onConfirm) {
        onConfirm();
      }
      
      // Close the modal
      onClose();
      
      // Delete the prompt in the background
      await deletePrompt(prompt.id);
    } catch (error) {
      console.error("Failed to delete prompt:", error);
      // Note: In a production app, you might want to revert the optimistic update here
      // and show an error message to the user
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Prompt</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &ldquo;{prompt?.title}&rdquo;? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <LoadingButton 
            type="button" 
            variant="destructive" 
            onClick={handleDelete} 
            loading={loading}
            loadingText="Deleting..."
          >
            Delete
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};