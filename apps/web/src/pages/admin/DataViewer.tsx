import { useState } from "react";
import { Panel } from "../../components/Panel";
import { getAdminData, syncAdminDraw } from "../../services/admin";

export function AdminDataViewerPage() {
  const [account, setAccount] = useState("");
  const [expect, setExpect] = useState("");
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await getAdminData(account, expect);
      setResult(JSON.stringify(data, null, 2));
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncDraw() {
    setLoading(true);
    setError(null);

    try {
      await syncAdminDraw(expect || undefined);
    } catch (syncError) {
      setError((syncError as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-stack">
      <Panel title="按 account + expect 查看数据" action={<button className="ghost-button" type="button" onClick={handleSyncDraw}>手动同步开奖</button>}>
        <form className="form-grid" onSubmit={handleSubmit}>
          <input className="text-input" placeholder="account" value={account} onChange={(event) => setAccount(event.target.value)} />
          <input className="text-input" placeholder="expect" value={expect} onChange={(event) => setExpect(event.target.value)} />
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "查询中..." : "查询"}
          </button>
        </form>
        {error ? <p className="error-text">{error}</p> : null}
      </Panel>

      <Panel title="数据结果">
        <pre className="code-block">{result || "暂无数据"}</pre>
      </Panel>
    </div>
  );
}
