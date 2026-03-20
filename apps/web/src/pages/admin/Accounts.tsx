import { useEffect, useState } from "react";
import type { AccountRecord } from "@statisticalsystem/shared";
import { LoadingScreen } from "../../components/LoadingScreen";
import { Panel } from "../../components/Panel";
import { createAdminAccount, getAdminAccounts, updateAdminAccount } from "../../services/admin";

type AccountFormState = {
  account: string;
  macauInbox: string;
  hongkongInbox: string;
  enabled: boolean;
};

const EMPTY_FORM: AccountFormState = {
  account: "",
  macauInbox: "",
  hongkongInbox: "",
  enabled: true
};

export function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, AccountFormState>>({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAccounts() {
    setLoading(true);
    try {
      const nextAccounts = await getAdminAccounts();
      setAccounts(nextAccounts);
      setDrafts(
        Object.fromEntries(
          nextAccounts.map((account) => [
            account.account,
            {
              account: account.account,
              macauInbox: account.macauInbox ?? "",
              hongkongInbox: account.hongkongInbox ?? "",
              enabled: account.enabled
            }
          ])
        )
      );
      setError(null);
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAccounts();
  }, []);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createAdminAccount(form.account, {
      macauInbox: form.macauInbox || null,
      hongkongInbox: form.hongkongInbox || null,
      enabled: form.enabled
    });
    setForm(EMPTY_FORM);
    await loadAccounts();
  }

  async function saveAccount(accountId: string) {
    const draft = drafts[accountId];

    if (!draft) {
      return;
    }

    await updateAdminAccount(accountId, {
      macauInbox: draft.macauInbox || null,
      hongkongInbox: draft.hongkongInbox || null,
      enabled: draft.enabled
    });
    await loadAccounts();
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="page-stack">
      <Panel title="新增 account">
        <form className="form-grid" onSubmit={handleCreate}>
          <input className="text-input" placeholder="account，例如 c001" value={form.account} onChange={(event) => setForm({ ...form, account: event.target.value })} />
          <input className="text-input" placeholder="澳门收件邮箱（aaa@...）" value={form.macauInbox} onChange={(event) => setForm({ ...form, macauInbox: event.target.value })} />
          <input className="text-input" placeholder="香港收件邮箱（xxx@...）" value={form.hongkongInbox} onChange={(event) => setForm({ ...form, hongkongInbox: event.target.value })} />
          <label className="checkbox-line">
            <input checked={form.enabled} type="checkbox" onChange={(event) => setForm({ ...form, enabled: event.target.checked })} />
            启用
          </label>
          <button className="primary-button" type="submit">
            创建 account
          </button>
        </form>
      </Panel>

      <Panel title="account 列表">
        {error ? <p className="error-text">{error}</p> : null}
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>account</th>
                <th>澳门 inbox</th>
                <th>香港 inbox</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.account}>
                  <td>{account.account}</td>
                  <td>
                    <input
                      className="text-input text-input--compact"
                      value={drafts[account.account]?.macauInbox ?? account.macauInbox ?? ""}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [account.account]: { ...(current[account.account] ?? EMPTY_FORM), account: account.account, macauInbox: event.target.value }
                        }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="text-input text-input--compact"
                      value={drafts[account.account]?.hongkongInbox ?? account.hongkongInbox ?? ""}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [account.account]: { ...(current[account.account] ?? EMPTY_FORM), account: account.account, hongkongInbox: event.target.value }
                        }))
                      }
                    />
                  </td>
                  <td>
                    <label className="checkbox-line">
                      <input
                        checked={drafts[account.account]?.enabled ?? account.enabled}
                        type="checkbox"
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [account.account]: {
                              ...(current[account.account] ?? EMPTY_FORM),
                              account: account.account,
                              enabled: event.target.checked
                            }
                          }))
                        }
                      />
                      启用
                    </label>
                  </td>
                  <td>
                    <button className="ghost-button" type="button" onClick={() => saveAccount(account.account)}>
                      保存
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
