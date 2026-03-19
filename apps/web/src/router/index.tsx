import { createBrowserRouter, Navigate } from "react-router-dom";
import { App } from "../App";
import { RequireSession } from "../components/RequireSession";
import { AdminLayout } from "../layouts/AdminLayout";
import { UserLayout } from "../layouts/UserLayout";
import { AdminAccountsPage } from "../pages/admin/Accounts";
import { AdminDataViewerPage } from "../pages/admin/DataViewer";
import { AdminLoginPage } from "../pages/admin/Login";
import { AdminUsersPage } from "../pages/admin/Users";
import { ExpectDetailPage } from "../pages/user/ExpectDetail";
import { ExpectsPage } from "../pages/user/Expects";
import { UserLoginPage } from "../pages/user/Login";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate replace to="/expects" />
      },
      {
        path: "login",
        element: <UserLoginPage />
      },
      {
        element: <RequireSession redirectTo="/login" role="user" />,
        children: [
          {
            element: <UserLayout />,
            children: [
              {
                path: "expects",
                element: <ExpectsPage />
              },
              {
                path: "expects/:expect",
                element: <ExpectDetailPage />
              }
            ]
          }
        ]
      },
      {
        path: "admin/login",
        element: <AdminLoginPage />
      },
      {
        element: <RequireSession redirectTo="/admin/login" role="admin" />,
        children: [
          {
            path: "admin",
            element: <AdminLayout />,
            children: [
              {
                index: true,
                element: <Navigate replace to="/admin/users" />
              },
              {
                path: "users",
                element: <AdminUsersPage />
              },
              {
                path: "accounts",
                element: <AdminAccountsPage />
              },
              {
                path: "data",
                element: <AdminDataViewerPage />
              }
            ]
          }
        ]
      }
    ]
  }
]);
