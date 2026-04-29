import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Folder as FolderIcon,
  Plus,
  Box,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronRight,
  Settings,
  PlusIcon,
  Mail,
} from "lucide-react";
import { Folder, STLModel, StorageStats } from "../types";
import { api } from "../services/api";

import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { TreeViewDefaultItemModelProperties } from "@mui/x-tree-view/models";
import { useTreeItemUtils } from "@mui/x-tree-view/hooks";
import {
  UseTreeItemContentSlotOwnProps,
  UseTreeItemLabelSlotOwnProps,
  UseTreeItemStatus,
} from "@mui/x-tree-view/useTreeItem";
import { RichTreeView } from "@mui/x-tree-view/RichTreeView";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import {
  TreeItem,
  TreeItemProps,
  TreeItemSlotProps,
} from "@mui/x-tree-view/TreeItem";
import Container from "@mui/material/Container";
import Button from "@mui/material/Button";
import OutlinedInput from "@mui/material/OutlinedInput";
import Badge from "@mui/material/Badge";
import { useAuth } from "@/contexts/AuthContext";
import { APP_NAME } from "@/contexts/constants";

interface SidebarProps {
  folders: Folder[];
  models: STLModel[];
  currentFolderId: string;
  storageStats: StorageStats;
  onSelectFolder: (id: string) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onRenameFolder: (id: string, newName: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveToFolder: (folderId: string, modelIds: string[]) => void;
  onUploadToFolder: (folderId: string, files: FileList) => void;
  variant?: "desktop" | "mobile";
}

const Sidebar: React.FC<SidebarProps> = ({
  folders,
  models,
  currentFolderId,
  storageStats,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveToFolder,
  onUploadToFolder,
  variant = "desktop",
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDesktopVariant = variant === "desktop";
  const [isCreatingRoot, setIsCreatingRoot] = useState(false);
  const [newRootName, setNewRootName] = useState({name: "", abbrev: ""});
  const [showContact, setShowContact] = useState(false);
  const [adminContacts, setAdminContacts] = useState<{ email: string; display_name: string | null }[]>([]);
  const [contactLoading, setContactLoading] = useState(false);

  // State for tree interactions
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatingSubfolderId, setCreatingSubfolderId] = useState<string | null>(
    null,
  );
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);

  // Resize state
  const [width, setWidth] = useState(330);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback(
    (e: React.MouseEvent) => {
      if (!isDesktopVariant) return;
      e.preventDefault(); // Prevent text selection
      setIsResizing(true);
    },
    [isDesktopVariant],
  );

  // Calculate direct counts only (not recursive, matching file system behavior usually)
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    models.forEach((m) => {
      counts[m.folderId] = (counts[m.folderId] || 0) + 1;
    });
    folders.forEach((f) => {
      counts[f.parentId] = (counts[f.parentId] || 0) + 1;
    });
    return counts;
  }, [models, folders]);

  useEffect(() => {
    if (!isDesktopVariant) return;
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Limit width between 200px and 600px
      const newWidth = Math.min(Math.max(e.clientX, 200), 600);
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    // Add grabbing cursor to body during resize
    document.body.style.cursor = "col-resize";

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
    };
  }, [isResizing, isDesktopVariant]);

  // Ensure parents of current folder are expanded
  useEffect(() => {
    if (currentFolderId && currentFolderId !== "all") {
      const expandPath = (id: string, path: Set<string>) => {
        const folder = folders.find((f) => f.id === id);
        if (folder && folder.parentId) {
          path.add(folder.parentId);
          expandPath(folder.parentId, path);
        }
      };

      setExpandedIds((prev) => {
        const next = new Set<string>(prev);
        expandPath(currentFolderId, next);
        return next;
      });
    }
  }, [currentFolderId, folders]);

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newRootName.name.trim();
    if (!name) return;
    if (!creatingSubfolderId) {
      onCreateFolder(name, null);
    } else {
      onCreateFolder(name, creatingSubfolderId);
      setCreatingSubfolderId("");
    }
    setNewRootName({ ...newRootName, name: "" });
    setIsCreatingRoot(false);
  };

  const handleContactAdmin = async () => {
    setShowContact(true);
    if (adminContacts.length === 0) {
      setContactLoading(true);
      try {
        const contacts = await api.getAdminContact();
        setAdminContacts(contacts);
      } catch {
        setAdminContacts([]);
      } finally {
        setContactLoading(false);
      }
    }
  };

  const toggleExpand = (id: string) => {
    onSelectFolder(id);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExpand = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const handleDeleteRequest = (id: string, count: number) => {
    if (count > 0) {
      alert("Folder must be empty to delete (no files and no subfolders).");
      return;
    }
    onDeleteFolder(id);
  };

  // Drag Handlers
  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragTargetId !== folderId) {
      setDragTargetId(folderId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragTargetId(null);

    // Check for Files first (Upload to folder)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadToFolder(folderId, e.dataTransfer.files);
      return;
    }

    // Check for internal move (Move existing cards to folder)
    try {
      const data = e.dataTransfer.getData("application/json");
      if (data) {
        const { modelIds } = JSON.parse(data);
        if (Array.isArray(modelIds) && modelIds.length > 0) {
          onMoveToFolder(folderId, modelIds);
        }
      }
    } catch (err) {
      console.error("Failed to process drop", err);
    }
  };

  // Format Storage Display
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const percentUsed =
    storageStats.total > 0
      ? Math.min((storageStats.used / storageStats.total) * 100, 100)
      : 0;

  // Root folders
  const rootFolders = folders.filter((f) => f.parentId === null);

  //builds the treeview structure recursively to any depth
  const treefolders = () => {
    const buildTree = (parentId: string | null): TreeViewDefaultItemModelProperties[] =>
      folders
        .filter((f) => f.parentId === parentId)
        .map((f) => ({ id: f.id, label: f.name, children: buildTree(f.id) }))
        .sort((a, b) => a.label.localeCompare(b.label));
    return buildTree(null);
  };

  interface CustomLabelProps extends UseTreeItemLabelSlotOwnProps {
    status: UseTreeItemStatus;
    onClick: React.MouseEventHandler<HTMLElement>;
    onPlusClick: React.MouseEventHandler<HTMLElement>;
    isPending: boolean;
    isSuperuser: boolean;
  }

  function CustomLabel({
    children,
    status,
    onClick,
    onPlusClick,
    isPending,
    isSuperuser,
    ...props
  }: CustomLabelProps) {
    return (
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexGrow={1}
        sx={{ minWidth: 0 }}
        {...props}
      >
        <Typography noWrap sx={{ color: isPending ? "warning.main" : "text.primary" }}>
          {children}{isPending ? " (pending)" : ""}
        </Typography>
        {isSuperuser && (
          <Stack direction="row">
            <IconButton
              onClick={onPlusClick}
              aria-label="add subfolder"
              size="small"
              sx={{ color: "grey.300" }}
            >
              <PlusIcon className="hover:text-green-400"/>
            </IconButton>
            <IconButton
              onClick={onClick}
              aria-label="delete folder"
              size="small"
              edge="end"
              sx={{ color: "grey.300" }}
            >
              <Trash2 className="hover:text-red-500"/>
            </IconButton>
          </Stack>
        )}
      </Stack>
    );
  }

  const CustomTreeItem = React.forwardRef(function CustomTreeItem(
    props: TreeItemProps,
    ref: React.Ref<HTMLLIElement>,
  ) {
    const { status } = useTreeItemUtils({
      itemId: props.itemId,
      children: props.children,
    });

    const handleContentClick: UseTreeItemContentSlotOwnProps["onClick"] = () => {
      onSelectFolder(props.itemId);
    };
    const count = folderCounts[props.itemId] || 0;
    const folder = folders.find((f) => f.id === props.itemId);
    const isPending = folder?.status === "pending";

    const handleIconButtonClick = (event: React.MouseEvent) => {
      event.stopPropagation();
      handleDeleteRequest(props.itemId, count);
    };

    const handlePlusClick = (event: React.MouseEvent) => {
      event.stopPropagation();
      setCreatingSubfolderId(props.itemId);
      setIsCreatingRoot(true);
      document.getElementById("folder-name-input").focus();
    };

    return (
      <TreeItem
        {...props}
        ref={ref}
        onDragOver={(e) => handleDragOver(e, props.itemId)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, props.itemId)}
        className={
          props.itemId === dragTargetId
            ? "bg-white/10 rounded-md ring-2 ring-white"
            : ""
        }
        slots={{
          label: CustomLabel,
        }}
        slotProps={
          {
            label: {
              onClick: handleIconButtonClick,
              onPlusClick: handlePlusClick,
              status,
              isPending,
              isSuperuser: !!user?.is_superuser,
            },
            content: { onClick: handleContentClick },
          } as TreeItemSlotProps
        }
      />
    );
  });

  return (
    <Container
      disableGutters
      sx={{ bgcolor: "background.default" }}
      className="border-r border-vault-700 flex flex-col h-full select-none relative shrink-0 group/sidebar mr-6"
      style={isDesktopVariant ? { width } : undefined}
      onDragLeave={() => setDragTargetId(null)}
    >
      <div className="px-4 py-5 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/30 shrink-0">
          <Box className="w-6 h-6 text-white" />
        </div>
        <div className="min-w-0">
          <Typography variant="h5" fontWeight={700} noWrap>
            {APP_NAME.short}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }} noWrap>
            {APP_NAME.full}
          </Typography>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 space-y-0.5 scrollbar-thin scrollbar-thumb-vault-700 scrollbar-track-transparent overflow-y-scroll">
        {user?.is_superuser && (
          <div className="px-4 mb-4">
            <Button
              fullWidth
              startIcon={<Plus />}
              onClick={() => {
                setIsCreatingRoot(true);
                document.getElementById("folder-name-input").focus();
              }}
              variant="outlined"
            >
              New Root Folder
            </Button>
          </div>
        )}

        <form
          onSubmit={handleCreateFolderSubmit}
          className={`px-4 mb-4 transition-all duration-400 ${
            isCreatingRoot ? "opacity-100" : "opacity-0 origin-top h-0"
          }`}
        >
          <div className="flex flex-col items-center gap-2 py-0 mb-3">
            <OutlinedInput
              id="folder-name-input"
              type="text"
              className="w-full"
              placeholder="Folder Name..."
              value={newRootName.name}
              onChange={(e) => setNewRootName({...newRootName, name: e.target.value})}
              onBlur={() => {
                !newRootName.name.trim();
                setIsCreatingRoot(false);
                setCreatingSubfolderId("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setIsCreatingRoot(false);
                  setCreatingSubfolderId("");
                }
              }}
            />
          </div>
        </form>

        <div
          // startIcon={<LayoutGrid />}
          color={currentFolderId === "all" ? "info" : "primary"}
      
          className="w-full rounded-md bg-vault-700/50 flex justify-between items-center p-2 px-4"
          // sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          All Models
          <Badge badgeContent={models.filter((m) => m.status === "approved").length} className="mr-2"></Badge>
        </div>

        <div className="pt-2 pb-1 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider flex justify-between items-center">
          <Typography variant="subtitle1">Library</Typography>
        </div>

        <div className="space-y-1 pb-4 ">
          <RichTreeView
            items={treefolders()}
            slots={{ item: CustomTreeItem }}
            expansionTrigger="iconContainer"
            onItemExpansionToggle={handleExpand}
          />
        </div>
      </nav>

      <div className="p-4 border-t border-vault-700 z-10 gap-3 flex flex-col">
        <Button
          variant="outlined"
          startIcon={<Settings />}
          color="info"
          onClick={() => navigate('/settings')}
          className="w-full"
          sx={{ alignItems: "center", justifyContent: "center" }}
        >
          Settings
        </Button>

        {!user?.is_superuser && (
          <Button
            variant="outlined"
            startIcon={<Mail />}
            color="secondary"
            onClick={handleContactAdmin}
            className="w-full"
            sx={{ alignItems: "center", justifyContent: "center" }}
          >
            Contact Admin
          </Button>
        )}

        {/* Contact Admin modal */}
        {showContact && (
          <div className="absolute inset-0 z-50 flex items-end justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-vault-800 border border-vault-700 rounded-xl shadow-2xl w-full p-5 space-y-3">
              <div className="flex justify-between items-center">
                <Typography variant="h6">Contact Admin</Typography>
                <IconButton size="small" onClick={() => setShowContact(false)} sx={{ color: "grey.400" }}>
                  <X className="w-4 h-4" />
                </IconButton>
              </div>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Reach out to an administrator for help or questions.
              </Typography>
              {contactLoading ? (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>Loading...</Typography>
              ) : adminContacts.length === 0 ? (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>No admin contacts found.</Typography>
              ) : (
                <div className="space-y-2">
                  {adminContacts.map((a) => (
                    <div key={a.email} className="flex items-center justify-between gap-2 bg-vault-700/40 rounded-md px-3 py-2">
                      <div className="min-w-0">
                        {a.display_name && (
                          <Typography variant="body2" fontWeight={600} noWrap>{a.display_name}</Typography>
                        )}
                        <Typography variant="caption" sx={{ color: "text.secondary" }} noWrap>{a.email}</Typography>
                      </div>
                      <Button
                        size="small"
                        variant="contained"
                        href={`mailto:${a.email}`}
                        startIcon={<Mail className="w-3 h-3" />}
                      >
                        Email
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}


        {user?.is_superuser && <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-md p-3 shadow-lg">
          <p className="text-xs text-white/80 font-medium mb-1 truncate mb-2">
            Storage Used
          </p>
          <div className="w-full bg-black/20 rounded-full h-1.5 mb-1 overflow-hidden">
            <div
              className="bg-white h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percentUsed}%` }}
            ></div>
          </div>
          <p className="text-[10px] text-white/60 flex justify-between">
            <span>{formatSize(storageStats.used)}</span>
            <span>{formatSize(storageStats.total)}</span>
          </p>
        </div>}
      </div>

      {/* Resizer Handle */}
      {isDesktopVariant && (
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors z-50 ${
            isResizing ? "bg-blue-500" : "bg-transparent"
          }`}
          onMouseDown={startResizing}
        />
      )}
    </Container>
  );
};

export default Sidebar;
