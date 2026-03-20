import { useEffect, useState } from "react";
import { LOTTERY_LABELS, type LotteryType } from "@statisticalsystem/shared";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { SegmentedControl } from "../components/SegmentedControl";
import { useLotteryType } from "../hooks/useLotteryType";
import { getUserMe, logoutUser } from "../services/user";

export function UserLayout() {
  const navigate = useNavigate();
  const { lotteryType, lotterySearch, setLotteryType } = useLotteryType();
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    async function loadCurrentUser() {
      try {
        const currentUser = await getUserMe();

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
    await logoutUser();
    navigate("/login", { replace: true });
  }

  const brandLabel = username ? `用户端（${username}）` : "用户端";

  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <div className="brand">
          <span className="brand__eyebrow brand__account">{brandLabel}</span>
          <strong>StatisticalSystem</strong>
          <div className="brand__switch">
            <SegmentedControl<LotteryType>
              fullWidth
              variant="dark"
              value={lotteryType}
              options={[
                { label: LOTTERY_LABELS.macau, value: "macau" },
                { label: LOTTERY_LABELS.hongkong, value: "hongkong" }
              ]}
              onChange={setLotteryType}
            />
          </div>
        </div>
        <nav className="nav-list">
          <NavLink className="nav-link" to={{ pathname: "/expects", search: lotterySearch }}>
            历史期数
          </NavLink>
          <NavLink className="nav-link" to={{ pathname: "/help", search: lotterySearch }}>
            投注帮助
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
