import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { getAdminMe, logoutAdmin } from "../services/admin";

export function AdminLayout() {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>("");

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

  const brandLabel = username ? `管理端（${username}）` : "管理端";

  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <div className="brand">
          <span className="brand__eyebrow brand__account">{brandLabel}</span>
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
        <button className="ghost-button ghost-button--full" type="button" onClick={handleLogout}>
          退出登录
        </button>
      </aside>
      <main className="shell__content">
        <Outlet />
      </main>
    </div>
  );
}
