import { createBrowserRouter } from "react-router-dom";
import { lazy } from "react";
import App from "./App";

const SkillTreeListPage = lazy(() => import("./pages/SkillTreeListPage"));
const SkillTreeDetailPage = lazy(() => import("./pages/SkillTreeDetailPage"));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <SkillTreeListPage /> },
      { path: "tree/:id", element: <SkillTreeDetailPage /> },
      { path: "user/:username", element: <UserProfilePage /> },
      { path: "search", element: <SearchPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
