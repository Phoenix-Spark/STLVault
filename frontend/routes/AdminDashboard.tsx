import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { api } from "../services/api";
import { Folder, STLModel } from "../types";
import Viewer3D from "../components/Viewer3D";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { CheckCircle, XCircle, Box as BoxIcon, Clock, FolderOpen } from "lucide-react";

type PendingFolder = Folder & { requested_by_email?: string; parent_name?: string | null };

const formatSize = (bytes: number): string => {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const formatDate = (ms: number): string =>
  new Date(ms).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const AdminDashboard: React.FC = () => {
  const [tab, setTab] = useState<"models" | "folders">("models");

  // Pending models state
  const [pending, setPending] = useState<STLModel[]>([]);
  const [selected, setSelected] = useState<STLModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [denyOpen, setDenyOpen] = useState(false);
  const [denyReason, setDenyReason] = useState("");

  // Pending folders state
  const [pendingFolders, setPendingFolders] = useState<PendingFolder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [folderError, setFolderError] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approveNames, setApproveNames] = useState<Record<string, string>>({});
  const [folderDenyOpen, setFolderDenyOpen] = useState(false);
  const [folderDenyTarget, setFolderDenyTarget] = useState<PendingFolder | null>(null);
  const [folderDenyReason, setFolderDenyReason] = useState("");
  const [folderActionLoading, setFolderActionLoading] = useState(false);

  useEffect(() => {
    api
      .getAdminPending()
      .then(setPending)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load pending models")
      )
      .finally(() => setLoading(false));

    api
      .getPendingFolders()
      .then((data) => {
        setPendingFolders(data);
        const names: Record<string, string> = {};
        data.forEach((f) => { names[f.id] = f.name; });
        setApproveNames(names);
      })
      .catch((e: unknown) =>
        setFolderError(e instanceof Error ? e.message : "Failed to load pending folders")
      )
      .finally(() => setFoldersLoading(false));
  }, []);

  const removeFromList = (id: string) => {
    setPending((prev) => prev.filter((m) => m.id !== id));
    setSelected((cur) => (cur?.id === id ? null : cur));
  };

  const handleApprove = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await api.approveModel(selected.id);
      removeFromList(selected.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDenyConfirm = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await api.denyModel(selected.id, denyReason);
      removeFromList(selected.id);
      setDenyOpen(false);
      setDenyReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deny failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveFolder = async (folder: PendingFolder) => {
    setFolderActionLoading(true);
    try {
      await api.approveFolder(folder.id, approveNames[folder.id]);
      setPendingFolders((prev) => prev.filter((f) => f.id !== folder.id));
      setApprovingId(null);
    } catch (e) {
      setFolderError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setFolderActionLoading(false);
    }
  };

  const handleFolderDenyConfirm = async () => {
    if (!folderDenyTarget) return;
    setFolderActionLoading(true);
    try {
      await api.denyFolder(folderDenyTarget.id, folderDenyReason);
      setPendingFolders((prev) => prev.filter((f) => f.id !== folderDenyTarget.id));
      setFolderDenyOpen(false);
      setFolderDenyReason("");
      setFolderDenyTarget(null);
    } catch (e) {
      setFolderError(e instanceof Error ? e.message : "Deny failed");
    } finally {
      setFolderActionLoading(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", bgcolor: "background.default" }}>
      <Navbar showMenuButton={false} />

      {error && (
        <Box sx={{ px: 3, py: 1, bgcolor: "error.dark" }}>
          <Typography variant="body2" color="error.contrastText">
            {error}
          </Typography>
        </Box>
      )}

      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left panel — tabs */}
        <Box
          sx={{
            width: 320,
            flexShrink: 0,
            borderRight: 1,
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Tabs
            value={tab}
            onChange={(_e, v) => setTab(v)}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: "divider", flexShrink: 0 }}
          >
            <Tab
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  Models
                  {pending.length > 0 && (
                    <Chip label={pending.length} size="small" color="warning" />
                  )}
                </Box>
              }
              value="models"
            />
            <Tab
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  Folders
                  {pendingFolders.length > 0 && (
                    <Chip label={pendingFolders.length} size="small" color="warning" />
                  )}
                </Box>
              }
              value="folders"
            />
          </Tabs>

          <Box sx={{ flex: 1, overflowY: "auto" }}>
          {/* Models tab */}
          {tab === "models" && (
            <>
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {!loading && pending.length === 0 && (
            <Box sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
              <CheckCircle size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
              <Typography variant="body2">No pending uploads</Typography>
            </Box>
          )}

          {pending.map((m) => (
            <Box
              key={m.id}
              onClick={() => setSelected(m)}
              sx={{
                display: "flex",
                gap: 1.5,
                p: 1.5,
                cursor: "pointer",
                borderBottom: 1,
                borderColor: "divider",
                bgcolor: selected?.id === m.id ? "action.selected" : "transparent",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              {/* Thumbnail */}
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  flexShrink: 0,
                  borderRadius: 1,
                  overflow: "hidden",
                  bgcolor: "action.hover",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {m.thumbnail ? (
                  <img
                    src={m.thumbnail}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <BoxIcon size={24} style={{ opacity: 0.4 }} />
                )}
              </Box>

              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap title={m.name}>
                  {m.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" noWrap>
                  {m.uploaded_by_email ?? "Unknown user"}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {formatDate(m.dateAdded)}
                </Typography>
              </Box>
            </Box>
          ))}
            </>
          )}

          {/* Folders tab */}
          {tab === "folders" && (
            <>
              {foldersLoading && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                  <CircularProgress size={24} />
                </Box>
              )}
              {!foldersLoading && folderError && (
                <Typography color="error" sx={{ p: 2 }}>{folderError}</Typography>
              )}
              {!foldersLoading && pendingFolders.length === 0 && (
                <Box sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
                  <CheckCircle size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <Typography variant="body2">No pending folder requests</Typography>
                </Box>
              )}
              {pendingFolders.map((f) => (
                <Box
                  key={f.id}
                  sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}
                >
                  <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", mb: 1 }}>
                    <FolderOpen size={20} style={{ marginTop: 2, opacity: 0.6, flexShrink: 0 }} />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {f.name}
                      </Typography>
                      {f.parent_name && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Under: {f.parent_name}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary" display="block" noWrap>
                        By: {f.requested_by_email ?? "Unknown"}
                      </Typography>
                    </Box>
                  </Box>

                  {approvingId === f.id ? (
                    <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                      <TextField
                        size="small"
                        value={approveNames[f.id] ?? f.name}
                        onChange={(e) => setApproveNames((prev) => ({ ...prev, [f.id]: e.target.value }))}
                        placeholder="Folder name"
                        fullWidth
                        autoFocus
                      />
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={() => handleApproveFolder(f)}
                        disabled={folderActionLoading || !approveNames[f.id]?.trim()}
                      >
                        OK
                      </Button>
                      <Button size="small" onClick={() => setApprovingId(null)}>✕</Button>
                    </Box>
                  ) : (
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={<CheckCircle size={14} />}
                        onClick={() => setApprovingId(f.id)}
                        disabled={folderActionLoading}
                        sx={{ flex: 1 }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<XCircle size={14} />}
                        onClick={() => { setFolderDenyTarget(f); setFolderDenyOpen(true); }}
                        disabled={folderActionLoading}
                        sx={{ flex: 1 }}
                      >
                        Deny
                      </Button>
                    </Box>
                  )}
                </Box>
              ))}
            </>
          )}
          </Box>
        </Box>

        {/* Right panel — detail + viewer */}
        {!selected ? (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "text.secondary",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Clock size={40} style={{ opacity: 0.3 }} />
            <Typography variant="body2">Select a pending upload to review</Typography>
          </Box>
        ) : (
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* 3D viewer */}
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <Viewer3D
                url={selected.url}
                filename={selected.name}
                thumbnail={selected.thumbnail}
              />
            </Box>

            <Divider />

            {/* Info + actions */}
            <Box sx={{ p: 2.5, overflowY: "auto", flexShrink: 0 }}>
              <Typography variant="h6" fontWeight={700} mb={0.5} noWrap title={selected.name}>
                {selected.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={0.5}>
                Submitted by: <strong>{selected.uploaded_by_email ?? "Unknown"}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={0.5}>
                Date: {formatDate(selected.dateAdded)} &nbsp;|&nbsp; Size: {formatSize(selected.size)}
              </Typography>

              {selected.tags && selected.tags.length > 0 && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
                  {selected.tags.map((t) => (
                    <Chip key={t} label={t} size="small" />
                  ))}
                </Box>
              )}

              {selected.description && (
                <Typography variant="body2" sx={{ mb: 1.5, whiteSpace: "pre-wrap" }}>
                  {selected.description}
                </Typography>
              )}

              <Box sx={{ display: "flex", gap: 1.5, mt: 1 }}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircle size={16} />}
                  onClick={handleApprove}
                  disabled={actionLoading}
                  sx={{ flex: 1 }}
                >
                  Approve
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<XCircle size={16} />}
                  onClick={() => setDenyOpen(true)}
                  disabled={actionLoading}
                  sx={{ flex: 1 }}
                >
                  Deny
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {/* Folder deny dialog */}
      <Dialog open={folderDenyOpen} onClose={() => setFolderDenyOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Deny Folder Request</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Denying will delete the folder request and deny all files uploaded to it. Optionally provide a reason.
          </Typography>
          <TextField
            label="Reason (optional)"
            multiline
            rows={3}
            fullWidth
            value={folderDenyReason}
            onChange={(e) => setFolderDenyReason(e.target.value)}
            placeholder="e.g. Duplicate of existing folder, inappropriate name…"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setFolderDenyOpen(false); setFolderDenyReason(""); setFolderDenyTarget(null); }}>
            Cancel
          </Button>
          <Button
            onClick={handleFolderDenyConfirm}
            color="error"
            variant="contained"
            disabled={folderActionLoading}
          >
            Confirm Deny
          </Button>
        </DialogActions>
      </Dialog>

      {/* Model deny dialog */}
      <Dialog open={denyOpen} onClose={() => setDenyOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Deny Upload</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Denying will delete the file and notify the uploader by email. Optionally provide a reason.
          </Typography>
          <TextField
            label="Reason (optional)"
            multiline
            rows={3}
            fullWidth
            value={denyReason}
            onChange={(e) => setDenyReason(e.target.value)}
            placeholder="e.g. Does not meet size requirements, suspected non-.mil content…"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDenyOpen(false); setDenyReason(""); }}>
            Cancel
          </Button>
          <Button
            onClick={handleDenyConfirm}
            color="error"
            variant="contained"
            disabled={actionLoading}
          >
            Confirm Deny
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;
