"use client";

import { useModal } from "@/hooks/use-modal-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { LoadingButton } from "../ui/loading-button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useState } from "react";
import { createFolder } from "@/app/actions/folder.actions";
export const CreateFolderModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const isModalOpen = isOpen && type === "createFolder";

  const handleClose = () => {
    setName("");
    onClose();
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      alert("Please enter a folder name");
      return;
    }

    setIsCreating(true);
    try {
      // Handle parentId: "default" becomes null, undefined becomes null
      let parentId: string | null = data.parentId || null;
      if (parentId === "default") {
        parentId = null;
      }

      console.log("Creating folder with data:", { name: name.trim(), parentId });

      const result = await createFolder({ name: name.trim(), parentId });

      console.log("Folder created successfully:", result);

      setName("");
      onClose();

      // Call the success callback if provided
      if (data.onSuccess) {
        data.onSuccess();
      }

      // Note: Removed router.refresh() - the server action already calls
      // revalidatePath("/prompts") which automatically refreshes the UI
    } catch (error) {
      console.error("Error creating folder:", error);
      alert("Failed to create folder. Please check the console for details.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Folder</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter folder name"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <LoadingButton
            onClick={handleCreate}
            variant="default"
            loading={isCreating}
            loadingText="Creating..."
          >
            Create
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};