import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logoutAdmin } from "../services/admin";

export function AdminLayout() {
  const navigate = useNavigate();

  async function handleLogout() {
    await logoutAdmin();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <div className="brand">
          <span className="brand__eyebrow">管理端</span>
          <strong>StatisticalSystem</strong>
        </div>
        <nav className="nav-list">
          <NavLink className="nav-link" to="/admin/users">
            用户管理
          </NavLink>
          <NavLink className="nav-link" to="/admin/accounts">
            账号管理
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
