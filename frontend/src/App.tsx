import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "react-hot-toast";
import { useTheme } from "./contexts/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const SkillTreeListPage = lazy(() => import("./pages/SkillTreeListPage"));
const SkillTreeDetailPage = lazy(() => import("./pages/SkillTreeDetailPage"));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const queryClient = new QueryClient();

function App() {
  const { isDarkMode } = useTheme();
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AuthProvider>
          <Toaster
            toastOptions={{
              style: {
                background: isDarkMode ? "#1e293b" : "#ffffff",
                color: isDarkMode ? "#e2e8f0" : "#1f2937",
              },
            }}
          />
          <Navbar />
          <MainRoutes />
        </AuthProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

function MainRoutes() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-500 dark:text-slate-400">
          Chargement...
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<SkillTreeListPage />} />
        <Route path="/tree/:id" element={<SkillTreeDetailPage />} />
        <Route path="/user/:username" element={<UserProfilePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<div className="p-8">Page non trouvée</div>} />
      </Routes>
    </Suspense>
  );
}

export default App;
