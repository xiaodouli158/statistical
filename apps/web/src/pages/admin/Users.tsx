import { useEffect, useState } from "react";
import type { UserRecord } from "@statisticalsystem/shared";
import { LoadingScreen } from "../../components/LoadingScreen";
import { Panel } from "../../components/Panel";
import { createAdminUser, getAdminUsers, updateAdminUser } from "../../services/admin";

type UserFormState = {
  username: string;
  password: string;
  role: "user" | "admin";
  account: string;
  status: "active" | "disabled";
};

const EMPTY_FORM: UserFormState = {
  username: "",
  password: "",
  role: "user",
  account: "",
  status: "active"
};

export function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, UserFormState>>({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    try {
      const nextUsers = await getAdminUsers();
      setUsers(nextUsers);
      setDrafts(
        Object.fromEntries(
          nextUsers.map((user) => [
            user.id,
            {
              username: user.username,
              password: "",
              role: user.role,
              account: user.account ?? "",
              status: user.status
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
    void loadUsers();
  }, []);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createAdminUser({
      username: form.username,
      password: form.password,
      role: form.role,
      account: form.account || null,
      status: form.status
    });
    setForm(EMPTY_FORM);
    await loadUsers();
  }

  async function saveUser(userId: string) {
    const draft = drafts[userId];

    if (!draft) {
      return;
    }

    await updateAdminUser(userId, {
      username: draft.username,
      password: draft.password || undefined,
      role: draft.role,
      account: draft.account || null,
      status: draft.status
    });
    await loadUsers();
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="page-stack">
      <Panel title="新增用户">
        <form className="form-grid" onSubmit={handleCreate}>
          <input className="text-input" placeholder="用户名" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
          <input className="text-input" placeholder="密码" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          <select className="text-input" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as typeof form.role })}>
            <option value="user">用户</option>
            <option value="admin">管理员</option>
          </select>
          <input className="text-input" placeholder="绑定 account（管理员可留空）" value={form.account} onChange={(event) => setForm({ ...form, account: event.target.value })} />
          <button className="primary-button" type="submit">
            创建用户
          </button>
        </form>
      </Panel>

      <Panel title="用户列表">
        {error ? <p className="error-text">{error}</p> : null}
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>用户名</th>
                <th>角色</th>
                <th>账号</th>
                <th>状态</th>
                <th>新密码</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <input
                      className="text-input text-input--compact"
                      value={drafts[user.id]?.username ?? user.username}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [user.id]: { ...(current[user.id] ?? EMPTY_FORM), username: event.target.value }
                        }))
                      }
                    />
                  </td>
                  <td>
                    <select
                      className="text-input text-input--compact"
                      value={drafts[user.id]?.role ?? user.role}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [user.id]: { ...(current[user.id] ?? EMPTY_FORM), role: event.target.value as "admin" | "user" }
                        }))
                      }
                    >
                      <option value="user">用户</option>
                      <option value="admin">管理员</option>
                    </select>
                  </td>
                  <td>
                    <input
                      className="text-input text-input--compact"
                      value={drafts[user.id]?.account ?? user.account ?? ""}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [user.id]: { ...(current[user.id] ?? EMPTY_FORM), account: event.target.value }
                        }))
                      }
                    />
                  </td>
                  <td>
                    <select
                      className="text-input text-input--compact"
                      value={drafts[user.id]?.status ?? user.status}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [user.id]: { ...(current[user.id] ?? EMPTY_FORM), status: event.target.value as "active" | "disabled" }
                        }))
                      }
                    >
                      <option value="active">active</option>
                      <option value="disabled">disabled</option>
                    </select>
                  </td>
                  <td>
                    <input
                      className="text-input text-input--compact"
                      placeholder="留空则不改"
                      type="password"
                      value={drafts[user.id]?.password ?? ""}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [user.id]: { ...(current[user.id] ?? EMPTY_FORM), password: event.target.value }
                        }))
                      }
                    />
                  </td>
                  <td>
                    <button className="ghost-button" type="button" onClick={() => saveUser(user.id)}>
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
