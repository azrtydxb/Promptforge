import { create } from 'zustand';
import type { Folder, Prompt } from '@/generated/prisma';

export type ModalType =
  | 'createFolder'
  | 'renameFolder'
  | 'deleteFolder'
  | 'createPrompt'
  | 'renamePrompt'
  | 'movePrompt'
  | 'deletePrompt'
  | 'createTag'
  | 'editTag'
  | 'deleteTag'
  | 'changePassword'
  | 'saveVersion'
  | 'sharePrompt'
  | 'quickPreview'
  | 'inviteMember';

// Simple tag interface for modal data
export interface TagData {
  id: string;
  name: string;
  description: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface QuickPreviewData {
  promptId?: string;
  sharedId?: string;
  title: string;
  category?: string;
  content: string;
  author?: {
    name: string;
    avatar?: string;
  };
  rating?: number;
  views?: number;
  likes?: number;
  copies?: number;
}

interface InviteMemberData {
  teamId: string;
  teamName: string;
  seatsAvailable?: number;
  seatsTotal?: number;
  domain?: string;
}

interface ModalData {
  folder?: Folder;
  prompt?: Prompt;
  promptData?: {
    id: string;
    content: string;
    title: string;
    description: string;
  };
  tag?: TagData;
  parentId?: string;
  folderId?: string;
  onSuccess?: (result?: TagData | void) => void;
  onConfirm?: () => void;
  quickPreview?: QuickPreviewData;
  inviteMember?: InviteMemberData;
}

interface ModalStore {
  type: ModalType | null;
  data: ModalData;
  isOpen: boolean;
  onOpen: (type: ModalType, data?: ModalData) => void;
  onClose: () => void;
}

export const useModal = create<ModalStore>((set) => ({
  type: null,
  data: {},
  isOpen: false,
  onOpen: (type, data = {}) => set({ isOpen: true, type, data }),
  onClose: () => set({ type: null, isOpen: false, data: {} }),
}));
