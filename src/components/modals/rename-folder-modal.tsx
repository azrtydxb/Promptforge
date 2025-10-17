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
import { useEffect, useState } from "react";
import { updateFolder } from "@/app/actions/folder.actions";

export const RenameFolderModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const [name, setName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  const isModalOpen = isOpen && type === "renameFolder";

  useEffect(() => {
    if (data.folder) {
      setName(data.folder.name);
    }
  }, [data.folder]);

  const handleRename = async () => {
    if (!name.trim() || !data.folder) {
      alert("Please enter a folder name");
      return;
    }

    setIsRenaming(true);
    try {
      console.log("Renaming folder with data:", { folderId: data.folder.id, name: name.trim() });

      const result = await updateFolder(data.folder.id, name.trim());

      console.log("Folder renamed successfully:", result);

      onClose();

      // Call the success callback if provided
      if (data.onSuccess) {
        data.onSuccess();
      }
    } catch (error) {
      console.error("Error renaming folder:", error);
      alert("Failed to rename folder. Please check the console for details.");
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Folder</DialogTitle>
        </DialogHeader>
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <LoadingButton
            onClick={handleRename}
            variant="default"
            loading={isRenaming}
            loadingText="Renaming..."
          >
            Rename
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};