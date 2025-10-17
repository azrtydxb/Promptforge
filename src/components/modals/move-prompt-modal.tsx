"use client";

import { useState, useEffect } from "react";
import { useModal } from "@/hooks/use-modal-store";
import { movePrompt } from "@/app/actions/prompt.actions";
import { getFoldersRedis as getFolders } from "@/app/actions/folder.actions.redis";
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
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Folder {
  id: string;
  name: string;
}

export const MovePromptModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [selectedFolderName, setSelectedFolderName] = useState<string>("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);

  const isModalOpen = isOpen && type === "movePrompt";
  const { prompt } = data;

  useEffect(() => {
    if (isModalOpen) {
      loadFolders();
    }
  }, [isModalOpen]);

  const loadFolders = async () => {
    try {
      setLoadingFolders(true);
      const foldersData = await getFolders();
      setFolders(foldersData);
    } catch (error) {
      console.error("Failed to load folders:", error);
    } finally {
      setLoadingFolders(false);
    }
  };

  const handleFolderSelect = (folderId: string, folderName: string) => {
    setSelectedFolderId(folderId);
    setSelectedFolderName(folderName);
  };

  const handleMove = async () => {
    if (!prompt) return;
    
    try {
      setLoading(true);
      const targetFolderId = selectedFolderId === "none" ? null : selectedFolderId;
      await movePrompt(prompt.id, targetFolderId, 0);
      handleClose();
      window.location.reload(); // Refresh to show changes
    } catch (error) {
      console.error("Failed to move prompt:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedFolderId("");
    setSelectedFolderName("");
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
          <DialogTitle>Move Prompt</DialogTitle>
          <DialogDescription>
            Choose a folder to move &ldquo;{prompt?.title}&rdquo; to.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="folder" className="text-right">
              Folder
            </Label>
            <div className="col-span-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    disabled={loadingFolders || loading}
                  >
                    {loadingFolders 
                      ? "Loading..." 
                      : selectedFolderName || "Select a folder"
                    }
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full bg-white">
                  <DropdownMenuItem 
                    onClick={() => handleFolderSelect("none", "No Folder (Root)")}
                  >
                    No Folder (Root)
                  </DropdownMenuItem>
                  {folders.map((folder) => (
                    <DropdownMenuItem 
                      key={folder.id} 
                      onClick={() => handleFolderSelect(folder.id, folder.name)}
                    >
                      {folder.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <LoadingButton
            type="button"
            onClick={handleMove}
            loading={loading}
            loadingText="Moving..."
            disabled={loadingFolders || !selectedFolderId}
          >
            Move
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};