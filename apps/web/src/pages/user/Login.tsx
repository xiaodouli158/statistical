import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../../services/user";

export function UserLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await loginUser({ username, password });
      navigate("/expects", { replace: true });
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="center-panel">
      <form className="panel auth-form" onSubmit={handleSubmit}>
        <span className="brand__eyebrow">用户登录</span>
        <h1>查看历史期数与结算结果</h1>
        <label>
          用户名
          <input className="text-input" value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label>
          密码
          <input className="text-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? "登录中..." : "登录"}
        </button>
      </form>
    </div>
  );
}
