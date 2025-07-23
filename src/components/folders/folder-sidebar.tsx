"use client";

import { useEffect, useState, useRef, memo } from "react";
import { Tree, NodeApi, NodeRendererProps, TreeApi } from "react-arborist";
import { Icons } from "../ui/icons";
import { Button } from "../ui/button";
import { getFolders } from "@/app/actions/folder.actions.cached";
import { useModal } from "@/hooks/use-modal-store";
import { dellFolderItem } from "@/lib/styles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Skeleton } from "../ui/skeleton";

type FolderNode = {
  id: string;
  name: string;
  children?: FolderNode[];
  isDefault?: boolean;
};

interface FolderSidebarProps {
  onSelectFolder: (id: string, name: string) => void;
  selectedFolder?: { id: string | null; name: string };
}

interface FolderWithChildren {
  id: string;
  name: string;
  children?: FolderWithChildren[];
}

interface FolderNodeComponentProps extends NodeRendererProps<FolderNode> {
  onRefresh: () => void;
}

const FolderNodeComponent = memo(({ node, style, dragHandle, onRefresh }: FolderNodeComponentProps) => {
  const { onOpen } = useModal();
  const [isHovered, setIsHovered] = useState(false);

  const handleSelect = () => {
    // We'll handle selection in the parent component through node.select()
    node.select();
  };

  const handleCreateSubfolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.data.isDefault) {
      // For Default folder, pass "default" as parentId to create children under Default
      onOpen("createFolder", {
        parentId: "default",
        onSuccess: onRefresh
      });
    } else {
      onOpen("createFolder", {
        parentId: node.data.id,
        onSuccess: onRefresh
      });
    }
  };

  const canCreateChildren = node.level < 4; // Max 5 levels (0-4)

  return (
    <div
      style={style}
      className={dellFolderItem(
        node.isSelected,
        node.data.isDefault,
        "group"
      )}
      onClick={handleSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Expand/Collapse Button */}
      <div className="w-6 h-6 flex items-center justify-center">
        {node.children && node.children.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="w-4 h-4 p-0"
            onClick={(e) => {
              e.stopPropagation();
              node.toggle();
            }}
          >
            <Icons.ChevronRight
              className={`h-3 w-3 transition-transform duration-200 ${
                node.isOpen ? "rotate-90" : ""
              }`}
            />
          </Button>
        )}
      </div>

      {/* Folder Icon */}
      <Icons.Folder
        className={`h-2.5 w-2.5 mr-1.5 ${
          node.isSelected
            ? 'text-dell-blue-600'
            : node.isOpen
              ? 'text-dell-blue-500'
              : 'text-gray-500'
        } ${node.data.isDefault && !node.isSelected ? 'text-dell-blue-600' : ''} transition-colors duration-200`}
      />

      {/* Folder Name */}
      <span
        ref={dragHandle}
        className="flex-1 truncate select-none text-xs"
      >
        {node.data.name}
      </span>

      {/* Add Subfolder Button */}
      {canCreateChildren && (
        <Button
          variant="ghost"
          size="icon"
          className={`w-5 h-5 ml-1 transition-opacity ${
            isHovered || node.isSelected ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={handleCreateSubfolder}
        >
          <Icons.Plus className="h-3 w-3" />
        </Button>
      )}

      {/* Dropdown Menu - Only for non-default folders */}
      {!node.data.isDefault && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-5 h-5 ml-1"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <Icons.MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white">
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpen("renameFolder", { 
                  folder: {
                    id: node.data.id,
                    name: node.data.name,
                    parentId: null,
                    userId: "",
                    order: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                  },
                  onSuccess: onRefresh
                });
              }}
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpen("deleteFolder", { 
                  folder: {
                    id: node.data.id,
                    name: node.data.name,
                    parentId: null,
                    userId: "",
                    order: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                  },
                  onSuccess: onRefresh
                });
              }}
              className="text-red-600"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
});

FolderNodeComponent.displayName = 'FolderNodeComponent';

export const FolderSidebar = ({ onSelectFolder, selectedFolder }: FolderSidebarProps) => {
  const [data, setData] = useState<FolderNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const treeRef = useRef<TreeApi<FolderNode>>(null);
  const [initialFolderSelected, setInitialFolderSelected] = useState(false);

  const fetchFolders = async () => {
    try {
      setIsLoading(true);
      const fetchedFolders = await getFolders();
      
      // Transform folder data for react-arborist
      const transformFolder = (folder: FolderWithChildren): FolderNode => ({
        id: folder.id,
        name: folder.name,
        children: folder.children?.map(transformFolder) || []
      });

      // Add Default folder at the beginning with all top-level folders as its children
      const defaultFolder: FolderNode = {
        id: "default",
        name: "Default",
        isDefault: true,
        children: fetchedFolders.map(transformFolder)
      };

      const transformedData = [defaultFolder];

      setData(transformedData);
    } catch (error) {
      console.error("Error fetching folders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  // Auto-select folder when data is loaded (either persisted or default)
  useEffect(() => {
    if (data.length > 0 && treeRef.current && !initialFolderSelected) {
      // Small delay to ensure tree is rendered
      setTimeout(() => {
        const tree = treeRef.current;
        if (tree && tree.root.children && tree.root.children.length > 0) {
          let folderSelected = false;
          // If we have a selected folder from props, try to find and select it
          if (selectedFolder && selectedFolder.id) {
            const findAndSelectNode = (nodes: NodeApi<FolderNode>[]): boolean => {
              for (const node of nodes) {
                if (node.data.id === selectedFolder.id) {
                  if (node.children && node.children.length > 0) node.open();
                  node.select();
                  return true;
                }
                if (node.children && findAndSelectNode(node.children)) {
                  node.open(); // Open parent to reveal child
                  return true;
                }
              }
              return false;
            };

            if (findAndSelectNode(tree.root.children)) {
              folderSelected = true;
            }
          }
          
          // If no folder was selected (either not persisted or not found), select Default
          if (!folderSelected) {
            const defaultNode = tree.root.children[0];
            if (defaultNode) {
              if (defaultNode.children && defaultNode.children.length > 0) {
                defaultNode.open();
              }
              defaultNode.select();
              onSelectFolder("", "Default");
            }
          }
          setInitialFolderSelected(true);
        }
      }, 50);
    }
  }, [data, selectedFolder, initialFolderSelected, onSelectFolder]);

  // Note: Removed useEffect refresh pattern - now using onSuccess callbacks in modals

  const handleSelectionChange = (nodes: NodeApi<FolderNode>[]) => {
    if (nodes.length > 0) {
      const selectedNode = nodes[0];
      
      // Expand the selected node to show its children
      if (selectedNode.children && selectedNode.children.length > 0) {
        selectedNode.open();
      }
      
      if (selectedNode.data.isDefault) {
        onSelectFolder("", "Default");
      } else {
        onSelectFolder(selectedNode.data.id, selectedNode.data.name);
      }
    }
  };

  return (
    <div className="border-r pb-4 pr-4">
      <div className="flex justify-between items-center mb-4">
        <span className="font-medium">Folders</span>
      </div>
      
      <div className="h-[calc(100vh-12rem)] overflow-auto">
        {isLoading ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-24" />
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-2 ml-6">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <Tree
          ref={treeRef}
          data={data}
          openByDefault={false}
          width="100%"
          height={600}
          indent={24}
          rowHeight={32}
          overscanCount={8}
          onSelect={handleSelectionChange}
        >
          {(props: NodeRendererProps<FolderNode>) => (
            <FolderNodeComponent {...props} onRefresh={fetchFolders} />
          )}
        </Tree>
        )}
      </div>
    </div>
  );
};