import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

import App from "./App";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./routes/Login";
import Register from "./routes/Register";
import VerifyEmail from "./routes/VerifyEmail";
import ForgotPassword from "./routes/ForgotPassword";
import Dashboard from "./routes/Dashboard";
import Profile from "./routes/Profile";
import AdminDashboard from "./routes/AdminDashboard";
import Settings from "./routes/Settings";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0f172a", // vault-900
      paper: "#1e293b",   // vault-800
    },
    primary: {
      main: "#3b82f6",    // blue-500
      dark: "#2563eb",
      light: "#60a5fa",
    },
    secondary: {
      main: "#475569",    // vault-600
    },
    divider: "#334155",   // vault-700
    text: {
      primary: "#e2e8f0",
      secondary: "#94a3b8",
      disabled: "#475569",
    },
    action: {
      hover: "rgba(59, 130, 246, 0.08)",
      selected: "rgba(59, 130, 246, 0.16)",
      focus: "rgba(59, 130, 246, 0.12)",
    },
    error: { main: "#ef4444" },
    warning: { main: "#f59e0b" },
    success: { main: "#22c55e" },
    info: { main: "#38bdf8" },
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: "inherit",
    button: { textTransform: "none" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#0f172a",
          colorScheme: "dark",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#1e293b",
          borderColor: "#334155",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", borderRadius: 6 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "#334155" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#475569" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#3b82f6" },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 8,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: "#1e293b",
          border: "1px solid #334155",
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          "&:hover": { backgroundColor: "rgba(59, 130, 246, 0.08)" },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: "#334155" },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: "none" },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#1e293b",
          border: "1px solid #334155",
          color: "#e2e8f0",
        },
        arrow: { color: "#334155" },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: "#334155",
          color: "#e2e8f0",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#1e293b",
          borderBottom: "1px solid #334155",
          boxShadow: "none",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: "#0f172a", border: "none" },
      },
    },
  },
});

// Redirects unauthenticated users to /login
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Redirects non-admins to /
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.is_superuser) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const RouterRoot: React.FC = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/verify" element={<VerifyEmail />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route
      path="/dashboard"
      element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
    />
    <Route
      path="/profile"
      element={<ProtectedRoute><Profile /></ProtectedRoute>}
    />
    <Route
      path="/admin"
      element={<AdminRoute><AdminDashboard /></AdminRoute>}
    />
    <Route
      path="/settings"
      element={<ProtectedRoute><Settings /></ProtectedRoute>}
    />
    <Route
      path="/*"
      element={
        <ProtectedRoute>
          <App />
        </ProtectedRoute>
      }
    />
  </Routes>
);

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <RouterRoot />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
