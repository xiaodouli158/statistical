import { useEffect, useState } from "react";
import type { Role, UserRecord, UserStatus } from "@statisticalsystem/shared";
import { LoadingScreen } from "../../components/LoadingScreen";
import { Panel } from "../../components/Panel";
import { createAdminUser, getAdminUsers, updateAdminUser } from "../../services/admin";

const DEFAULT_USER_PASSWORD = "123456";
const PROTECTED_ADMIN_ACCOUNT = "c0001";

type UserDraft = {
  username: string;
  password: string;
  role: Role;
  status: UserStatus;
  memberExpiresOn: string;
};

type CreateUserForm = {
  username: string;
  password: string;
  role: Role;
  memberExpiresOn: string;
};

const EMPTY_CREATE_FORM: CreateUserForm = {
  username: "",
  password: DEFAULT_USER_PASSWORD,
  role: "user",
  memberExpiresOn: ""
};

function toDraft(user: UserRecord): UserDraft {
  return {
    username: user.username,
    password: "",
    role: user.role,
    status: user.status,
    memberExpiresOn: user.memberExpiresOn ?? ""
  };
}

function isProtectedAdmin(user: UserRecord): boolean {
  return user.role === "admin" && user.account === PROTECTED_ADMIN_ACCOUNT;
}

function statusLabel(user: UserRecord, draft: UserDraft | undefined): string {
  if (user.isExpired) {
    return "已过期";
  }

  if ((draft?.status ?? user.status) === "disabled") {
    return "已停用";
  }

  return "已启用";
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
  const [createForm, setCreateForm] = useState<CreateUserForm>(EMPTY_CREATE_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);

    try {
      const nextUsers = await getAdminUsers();
      setUsers(nextUsers);
      setDrafts(Object.fromEntries(nextUsers.map((user) => [user.id, toDraft(user)])));
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

  function updateDraft(userId: string, updater: (current: UserDraft) => UserDraft) {
    setDrafts((current) => {
      const base = current[userId];

      if (!base) {
        return current;
      }

      return {
        ...current,
        [userId]: updater(base)
      };
    });
  }

  function closeCreateModal() {
    setShowCreateModal(false);
    setCreateForm(EMPTY_CREATE_FORM);
  }

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError(null);

    try {
      await createAdminUser({
        username: createForm.username,
        password: createForm.password || DEFAULT_USER_PASSWORD,
        role: createForm.role,
        status: "active",
        memberExpiresOn: createForm.role === "user" ? createForm.memberExpiresOn || null : null
      });
      closeCreateModal();
      await loadUsers();
    } catch (createError) {
      setError((createError as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveUser(user: UserRecord) {
    const draft = drafts[user.id];

    if (!draft) {
      return;
    }

    setSaving(user.id);
    setError(null);

    try {
      await updateAdminUser(user.id, {
        username: isProtectedAdmin(user) ? user.username : draft.username,
        password: draft.password || undefined,
        role: isProtectedAdmin(user) ? "admin" : draft.role,
        status: isProtectedAdmin(user) ? "active" : draft.status,
        memberExpiresOn: isProtectedAdmin(user) ? null : draft.role === "user" ? draft.memberExpiresOn || null : null
      });
      await loadUsers();
    } catch (saveError) {
      setError((saveError as Error).message);
    } finally {
      setSaving(null);
    }
  }

  function toggleStatus(user: UserRecord) {
    if (isProtectedAdmin(user)) {
      return;
    }

    updateDraft(user.id, (current) => ({
      ...current,
      status: current.status === "active" ? "disabled" : "active"
    }));
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="page-stack">
      <Panel
        title="用户管理"
        action={
          <button className="primary-button" type="button" onClick={() => setShowCreateModal(true)}>
            创建用户
          </button>
        }
      >
        {error ? <p className="error-text">{error}</p> : null}
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>编号</th>
                <th>邮箱账号</th>
                <th>角色</th>
                <th>新密码</th>
                <th>会员期</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const draft = drafts[user.id];
                const protectedAdmin = isProtectedAdmin(user);
                const expiryClassName = user.isExpired ? "text-input text-input--compact text-input--danger" : "text-input text-input--compact";

                return (
                  <tr key={user.id}>
                    <td>{user.account}</td>
                    <td>
                      <input
                        className="text-input text-input--compact"
                        disabled={protectedAdmin}
                        value={draft?.username ?? user.username}
                        onChange={(event) =>
                          updateDraft(user.id, (current) => ({
                            ...current,
                            username: event.target.value
                          }))
                        }
                      />
                    </td>
                    <td>
                      <select
                        className="text-input text-input--compact"
                        disabled={protectedAdmin}
                        value={draft?.role ?? user.role}
                        onChange={(event) =>
                          updateDraft(user.id, (current) => {
                            const nextRole = event.target.value as Role;

                            return {
                              ...current,
                              role: nextRole,
                              memberExpiresOn: nextRole === "user" ? current.memberExpiresOn : ""
                            };
                          })
                        }
                      >
                        <option value="user">用户</option>
                        <option value="admin">管理员</option>
                      </select>
                    </td>
                    <td>
                      <input
                        className="text-input text-input--compact"
                        placeholder="留空则不修改"
                        type="password"
                        value={draft?.password ?? ""}
                        onChange={(event) =>
                          updateDraft(user.id, (current) => ({
                            ...current,
                            password: event.target.value
                          }))
                        }
                      />
                    </td>
                    <td>
                      <div className="table-field-stack">
                        <input
                          className={expiryClassName}
                          disabled={protectedAdmin || (draft?.role ?? user.role) === "admin"}
                          type="date"
                          value={protectedAdmin ? "" : draft?.memberExpiresOn ?? user.memberExpiresOn ?? ""}
                          onChange={(event) =>
                            updateDraft(user.id, (current) => ({
                              ...current,
                              memberExpiresOn: event.target.value
                            }))
                          }
                        />
                        <span className={user.isExpired ? "table-field-note table-field-note--danger" : "table-field-note"}>
                          {protectedAdmin
                            ? "系统管理员永不过期"
                            : user.isExpired
                              ? "会员已到期"
                              : (draft?.role ?? user.role) === "admin"
                                ? "管理员可留空"
                                : "到期当天结束后失效"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="table-action-group">
                        <span className={user.isExpired ? "status-chip status-chip--danger" : "status-chip"}>{statusLabel(user, draft)}</span>
                        {protectedAdmin ? (
                          <span className="table-field-note">仅支持密码修改</span>
                        ) : (
                          <button className="ghost-button" type="button" onClick={() => toggleStatus(user)}>
                            {draft?.status === "disabled" ? "改为启用" : "改为停用"}
                          </button>
                        )}
                        <button className="ghost-button" disabled={saving === user.id} type="button" onClick={() => handleSaveUser(user)}>
                          {saving === user.id ? "保存中..." : "保存"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {showCreateModal ? (
        <div className="modal-backdrop" onClick={closeCreateModal}>
          <div className="modal-card modal-card--narrow" onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header">
              <div>
                <span className="eyebrow">创建用户</span>
                <h3>新增登录与收件账号</h3>
              </div>
              <button className="ghost-button" type="button" onClick={closeCreateModal}>
                关闭
              </button>
            </div>

            <form className="form-grid form-grid--single" onSubmit={handleCreateUser}>
              <label className="form-field">
                <span>角色</span>
                <select
                  className="text-input"
                  value={createForm.role}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      role: event.target.value as Role,
                      memberExpiresOn: event.target.value === "user" ? current.memberExpiresOn : ""
                    }))
                  }
                >
                  <option value="user">用户</option>
                  <option value="admin">管理员</option>
                </select>
              </label>

              <label className="form-field">
                <span>{createForm.role === "admin" ? "登录账号" : "邮箱账号"}</span>
                <input
                  className="text-input"
                  placeholder={createForm.role === "admin" ? "请输入管理员账号" : "请输入收件邮箱账号"}
                  value={createForm.username}
                  onChange={(event) => setCreateForm((current) => ({ ...current, username: event.target.value }))}
                />
              </label>

              <label className="form-field">
                <span>密码</span>
                <input
                  className="text-input"
                  value={createForm.password}
                  onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
                />
              </label>

              <label className="form-field">
                <span>会员期</span>
                <input
                  className="text-input"
                  disabled={createForm.role === "admin"}
                  required={createForm.role === "user"}
                  type="date"
                  value={createForm.memberExpiresOn}
                  onChange={(event) => setCreateForm((current) => ({ ...current, memberExpiresOn: event.target.value }))}
                />
              </label>

              <p className="muted">系统会自动生成编号，普通用户到期后将自动禁止登录并停止接收邮件。</p>

              <div className="modal-card__actions">
                <button className="ghost-button" type="button" onClick={closeCreateModal}>
                  取消
                </button>
                <button className="primary-button" disabled={creating} type="submit">
                  {creating ? "创建中..." : "创建用户"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
