import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logoutUser } from "../services/user";

export function UserLayout() {
  const navigate = useNavigate();

  async function handleLogout() {
    await logoutUser();
    navigate("/login", { replace: true });
  }

  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <div className="brand">
          <span className="brand__eyebrow">用户端</span>
          <strong>StatisticalSystem</strong>
        </div>
        <nav className="nav-list">
          <NavLink className="nav-link" to="/expects">
            历史期数
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
