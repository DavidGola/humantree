import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "react-hot-toast";
import { useTheme } from "./contexts/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center text-gray-500 dark:text-slate-400">
                Chargement...
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </AuthProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
