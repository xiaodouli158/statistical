import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { getAdminMe, logoutAdmin } from "../services/admin";

export function AdminLayout() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadCurrentUser() {
      try {
        const currentUser = await getAdminMe();

        if (mounted) {
          setUsername(currentUser.username);
        }
      } catch {
        if (mounted) {
          setUsername("");
        }
      }
    }

    void loadCurrentUser();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    await logoutAdmin();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <div className="brand">
          <div className="brand__account-row">
            <span className="brand__eyebrow brand__account">{username || "未登录"}</span>
            <button className="ghost-button ghost-button--sidebar-compact" type="button" onClick={handleLogout}>
              退出登录
            </button>
          </div>
          <strong>StatisticalSystem</strong>
        </div>
        <nav className="nav-list">
          <NavLink className="nav-link" to="/admin/users">
            用户管理
          </NavLink>
          <NavLink className="nav-link" to="/admin/data">
            数据查看
          </NavLink>
        </nav>
      </aside>
      <main className="shell__content">
        <Outlet />
      </main>
    </div>
  );
}
