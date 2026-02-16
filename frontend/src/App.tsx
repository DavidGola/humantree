import SkillTreeListPage from "./pages/SkillTreeListPage";
import SkillTreeDetailPage from "./pages/SkillTreeDetailPage";
import UserProfilePage from "./pages/UserProfilePage";
import { Routes, Route } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "react-hot-toast";
import { useTheme } from "./contexts/ThemeContext";

function App() {
  const { isDarkMode } = useTheme();
  return (
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
  );
}

function MainRoutes() {
  return (
    <Routes>
      <Route path="/" element={<SkillTreeListPage />} />
      <Route path="/tree/:id" element={<SkillTreeDetailPage />} />
      <Route path="/user/:username" element={<UserProfilePage />} />
    </Routes>
  );
}

export default App;
