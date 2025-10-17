"use client";

import { useModal } from "@/hooks/use-modal-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { LoadingButton } from "../ui/loading-button";
import { useState } from "react";
import { deleteFolder } from "@/app/actions/folder.actions";

export const DeleteFolderModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const [isDeleting, setIsDeleting] = useState(false);

  const isModalOpen = isOpen && type === "deleteFolder";

  const handleDelete = async () => {
    if (!data.folder) {
      alert("No folder selected for deletion");
      return;
    }

    setIsDeleting(true);
    try {
      console.log("Deleting folder with data:", { folderId: data.folder.id, folderName: data.folder.name });

      const result = await deleteFolder(data.folder.id);

      console.log("Folder deleted successfully:", result);

      onClose();

      // Call the success callback if provided
      if (data.onSuccess) {
        data.onSuccess();
      }
    } catch (error) {
      console.error("Error deleting folder:", error);
      alert("Failed to delete folder. Please check the console for details.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Folder</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this folder? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <LoadingButton
            variant="destructive"
            onClick={handleDelete}
            loading={isDeleting}
            loadingText="Deleting..."
          >
            Delete
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};