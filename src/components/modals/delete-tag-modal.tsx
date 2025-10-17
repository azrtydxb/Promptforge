"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useModal } from "@/hooks/use-modal-store";
import { deleteTag } from "@/app/actions/tag-management.actions";
import { AlertTriangle } from "lucide-react";

export function DeleteTagModal() {
  const { isOpen, onClose, type, data } = useModal();
  const [isLoading, setIsLoading] = useState(false);

  const isModalOpen = isOpen && type === "deleteTag";

  const handleClose = () => {
    onClose();
  };

  const handleConfirm = async () => {
    if (!data.tag?.id) return;

    try {
      setIsLoading(true);
      await deleteTag(data.tag.id);
      
      if (data.onSuccess) {
        data.onSuccess();
      }
      
      handleClose();
    } catch (error) {
      console.error("Error deleting tag:", error);
      alert("Failed to delete tag. Please check the console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Tag
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the tag &ldquo;{data.tag?.name}&rdquo;? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="rounded-lg border border-red-300 bg-red-100 p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Warning:</strong> Deleting this tag will remove it from all prompts that currently use it.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <LoadingButton
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            loading={isLoading}
            loadingText="Deleting..."
          >
            Delete Tag
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}