"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type Role = {
  id: string;
  code: string;
  name: string;
  isSystem: boolean;
  permissions: Array<{ permission: { code: string; description: string } }>;
  _count: { userRoles: number };
};
type StoreUser = {
  id: string;
  email: string;
  displayName: string;
  locale: string;
  isActive: boolean;
  branchId: string | null;
  userRoles: Array<{ role: { id: string; code: string; name: string } }>;
};

const copy = {
  ar: {
    title: "الفريق والصلاحيات",
    intro: "إدارة مستخدمي هذا الفرع وأدوار المتجر من جلسة موثقة وصلاحيات خادم.",
    users: "مستخدمو الفرع",
    roles: "الأدوار",
    newUser: "إضافة مستخدم",
    newRole: "إضافة دور",
    name: "الاسم",
    email: "البريد الإلكتروني",
    password: "كلمة مرور أولية",
    language: "اللغة",
    role: "الدور",
    noRole: "بدون دور",
    create: "إنشاء",
    code: "رمز الدور",
    permissions: "الصلاحيات",
    save: "حفظ الصلاحيات",
    active: "نشط",
    inactive: "موقوف",
    deactivate: "إيقاف",
    activate: "تفعيل",
    system: "دور نظام",
    members: "مستخدم",
    loading: "جارٍ تحميل صلاحيات المتجر…",
    denied: "لا تملك الصلاحية المطلوبة لإدارة الفريق.",
    login: "يجب تسجيل الدخول إلى المتجر أولًا.",
    failed: "تعذر إكمال العملية. حاول مجددًا.",
    conflict: "يوجد سجل آخر بالقيمة نفسها.",
    passwordHint: "12 محرفًا على الأقل.",
    delegation: "لن يسمح الخادم بمنح صلاحية لا يملكها الحساب الحالي.",
  },
  en: {
    title: "Team & access",
    intro: "Manage branch users and store roles through authenticated, server-enforced permissions.",
    users: "Branch users",
    roles: "Roles",
    newUser: "Add user",
    newRole: "Add role",
    name: "Name",
    email: "Email",
    password: "Initial password",
    language: "Language",
    role: "Role",
    noRole: "No role",
    create: "Create",
    code: "Role code",
    permissions: "Permissions",
    save: "Save permissions",
    active: "Active",
    inactive: "Disabled",
    deactivate: "Disable",
    activate: "Enable",
    system: "System role",
    members: "users",
    loading: "Loading store access controls…",
    denied: "You do not have permission to manage the team.",
    login: "Sign in to the store first.",
    failed: "The operation could not be completed. Try again.",
    conflict: "Another record already uses that value.",
    passwordHint: "At least 12 characters.",
    delegation: "The server will not allow this account to delegate a permission it does not hold.",
  },
} as const;

const fieldStyle = {
  width: "100%", minHeight: 44, border: "1px solid #dbe3ed", borderRadius: 9,
  background: "white", padding: "8px 11px", color: "#182231",
} as const;

async function readError(response: Response) {
  try { return (await response.json()).error as string | undefined; } catch { return undefined; }
}

export function TeamAdmin({ locale }: { locale: "ar" | "en" }) {
  const t = copy[locale];
  const [users, setUsers] = useState<StoreUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [registry, setRegistry] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [access, setAccess] = useState<"ok" | "login" | "denied" | "error">("ok");
  const [newRolePermissions, setNewRolePermissions] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch("/api/admin/roles", { cache: "no-store" }),
      ]);
      if (usersResponse.status === 401 || rolesResponse.status === 401) {
        setAccess("login"); return;
      }
      if (usersResponse.status === 403 || rolesResponse.status === 403) {
        setAccess("denied"); return;
      }
      if (!usersResponse.ok || !rolesResponse.ok) {
        setAccess("error"); return;
      }
      const usersBody = await usersResponse.json();
      const rolesBody = await rolesResponse.json();
      setUsers(usersBody.users ?? []);
      setRoles(rolesBody.roles ?? []);
      setRegistry(rolesBody.permissionRegistry ?? []);
      setAccess("ok");
    } catch { setAccess("error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      fetch("/api/admin/users", { cache: "no-store", signal: controller.signal }),
      fetch("/api/admin/roles", { cache: "no-store", signal: controller.signal }),
    ]).then(async ([usersResponse, rolesResponse]) => {
      if (usersResponse.status === 401 || rolesResponse.status === 401) {
        setAccess("login"); return;
      }
      if (usersResponse.status === 403 || rolesResponse.status === 403) {
        setAccess("denied"); return;
      }
      if (!usersResponse.ok || !rolesResponse.ok) {
        setAccess("error"); return;
      }
      const usersBody = await usersResponse.json();
      const rolesBody = await rolesResponse.json();
      if (controller.signal.aborted) return;
      setUsers(usersBody.users ?? []);
      setRoles(rolesBody.roles ?? []);
      setRegistry(rolesBody.permissionRegistry ?? []);
      setAccess("ok");
    }).catch(() => {
      if (!controller.signal.aborted) setAccess("error");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);

  const roleOptions = useMemo(() => roles.map(role => ({
    id: role.id, label: role.name + (role.isSystem ? " · " + t.system : ""),
  })), [roles, t.system]);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("user"); setError("");
    const form = event.currentTarget, data = new FormData(form);
    const roleId = String(data.get("roleId") ?? "");
    const response = await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: data.get("displayName"), email: data.get("email"),
        password: data.get("password"), locale: data.get("locale"),
        roleIds: roleId ? [roleId] : [],
      }),
    }).catch(() => null);
    if (!response?.ok) {
      const code = response ? await readError(response) : undefined;
      setError(code === "CONFLICT" ? t.conflict : t.failed);
    } else { form.reset(); await load(); }
    setBusy("");
  }

  async function createRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("role"); setError("");
    const form = event.currentTarget, data = new FormData(form);
    const response = await fetch("/api/admin/roles", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: data.get("code"), name: data.get("name"),
        permissions: [...newRolePermissions],
      }),
    }).catch(() => null);
    if (!response?.ok) {
      const code = response ? await readError(response) : undefined;
      setError(code === "CONFLICT" ? t.conflict : t.failed);
    } else {
      form.reset(); setNewRolePermissions(new Set()); await load();
    }
    setBusy("");
  }

  async function toggleUser(user: StoreUser) {
    setBusy(user.id); setError("");
    const response = await fetch("/api/admin/users/" + user.id, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    }).catch(() => null);
    if (!response?.ok) setError(t.failed); else await load();
    setBusy("");
  }

  if (loading) return <section className="module-page"><p role="status">{t.loading}</p></section>;
  if (access !== "ok") return <section className="module-page">
    <div className="module-banner"><strong>{access === "login" ? t.login : access === "denied" ? t.denied : t.failed}</strong></div>
  </section>;

  return <section className="module-page">
    <header className="module-header">
      <div>
        <p className="module-kicker">A1 MOBI · FOUNDATION CONTROL</p>
        <h1>{t.title}</h1>
        <p className="module-sub">{t.intro}</p>
      </div>
    </header>

    {error && <div className="module-banner" role="alert"><strong>{error}</strong></div>}

    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(300px,.72fr)", gap: 18, alignItems: "start" }}
      className="team-admin-grid">
      <div style={{ display: "grid", gap: 18 }}>
        <article className="activity-card" style={{ marginTop: 0 }}>
          <div className="section-head"><h2>{t.users}</h2><p>{users.length}</p></div>
          <div className="table-wrap"><table>
            <thead><tr><th>{t.name}</th><th>{t.email}</th><th>{t.role}</th><th>{t.active}</th><th /></tr></thead>
            <tbody>{users.map(user => <tr key={user.id}>
              <td><b>{user.displayName}</b></td>
              <td dir="ltr">{user.email}</td>
              <td>{user.userRoles.map(x => x.role.name).join(", ") || t.noRole}</td>
              <td><span className={"pill " + (user.isActive ? "done" : "pending")}>{user.isActive ? t.active : t.inactive}</span></td>
              <td><button className="soft-btn" disabled={busy === user.id} onClick={() => void toggleUser(user)}>
                {user.isActive ? t.deactivate : t.activate}
              </button></td>
            </tr>)}</tbody>
          </table></div>
        </article>

        <article className="activity-card" style={{ marginTop: 0 }}>
          <div className="section-head"><h2>{t.roles}</h2><p>{roles.length}</p></div>
          <div style={{ display: "grid", gap: 12 }}>
            {roles.map(role => <RoleEditor
              key={role.id + ":" + role.permissions.map(x => x.permission.code).sort().join("|")}
              role={role} registry={registry} locale={locale} onSaved={load} />)}
          </div>
        </article>
      </div>

      <aside style={{ display: "grid", gap: 18 }}>
        <form className="activity-card" style={{ marginTop: 0 }} onSubmit={createUser}>
          <div className="section-head"><h2>{t.newUser}</h2></div>
          <div style={{ display: "grid", gap: 13 }}>
            <label>{t.name}<input name="displayName" required maxLength={160} style={fieldStyle} /></label>
            <label>{t.email}<input name="email" type="email" dir="ltr" required maxLength={254} style={fieldStyle} /></label>
            <label>{t.password}<input name="password" type="password" required minLength={12} maxLength={256} style={fieldStyle} />
              <small style={{ display: "block", marginTop: 5, color: "#718096" }}>{t.passwordHint}</small></label>
            <label>{t.language}<select name="locale" defaultValue={locale} style={fieldStyle}><option value="ar">العربية</option><option value="en">English</option></select></label>
            <label>{t.role}<select name="roleId" defaultValue="" style={fieldStyle}>
              <option value="">{t.noRole}</option>{roleOptions.map(role => <option key={role.id} value={role.id}>{role.label}</option>)}
            </select></label>
            <button className="primary" disabled={busy === "user"}>{t.create}</button>
          </div>
        </form>

        <form className="activity-card" style={{ marginTop: 0 }} onSubmit={createRole}>
          <div className="section-head"><h2>{t.newRole}</h2></div>
          <div style={{ display: "grid", gap: 13 }}>
            <label>{t.code}<input name="code" dir="ltr" required minLength={2} maxLength={50}
              pattern="[a-zA-Z0-9._-]+" style={fieldStyle} /></label>
            <label>{t.name}<input name="name" required maxLength={120} style={fieldStyle} /></label>
            <fieldset style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
              <legend style={{ fontWeight: 700 }}>{t.permissions}</legend>
              <PermissionChecks registry={registry} selected={newRolePermissions} setSelected={setNewRolePermissions} />
            </fieldset>
            <small style={{ color: "#718096" }}>{t.delegation}</small>
            <button className="primary" disabled={busy === "role"}>{t.create}</button>
          </div>
        </form>
      </aside>
    </div>
  </section>;
}

function PermissionChecks({ registry, selected, setSelected, disabled = false }: {
  registry: string[]; selected: Set<string>; setSelected: (next: Set<string>) => void; disabled?: boolean;
}) {
  return <div style={{ display: "grid", gap: 7, marginTop: 8 }}>
    {registry.map(code => <label key={code} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
      <input type="checkbox" checked={selected.has(code)} disabled={disabled} onChange={event => {
        const next = new Set(selected);
        if (event.target.checked) next.add(code); else next.delete(code);
        setSelected(next);
      }} /> <span dir="ltr">{code}</span>
    </label>)}
  </div>;
}

function RoleEditor({ role, registry, locale, onSaved }: {
  role: Role; registry: string[]; locale: "ar" | "en"; onSaved: () => Promise<void>;
}) {
  const t = copy[locale];
  const initial = useMemo(() => new Set(role.permissions.map(x => x.permission.code)), [role.permissions]);
  const [selected, setSelected] = useState<Set<string>>(initial);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (role.isSystem) return;
    setBusy(true);
    const response = await fetch("/api/admin/roles/" + role.id, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: [...selected] }),
    }).catch(() => null);
    if (response?.ok) await onSaved();
    setBusy(false);
  }

  return <div style={{ border: "1px solid #e8edf3", borderRadius: 11, padding: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
      <div><b>{role.name}</b><small style={{ display: "block", color: "#718096" }} dir="ltr">{role.code} · {role._count.userRoles} {t.members}</small></div>
      {role.isSystem ? <span className="pill pending">{t.system}</span> :
        <button className="soft-btn" type="button" disabled={busy} onClick={() => void save()}>{t.save}</button>}
    </div>
    <div style={{ marginTop: 10, maxHeight: 190, overflow: "auto" }}>
      <PermissionChecks registry={registry} selected={selected} setSelected={setSelected} disabled={role.isSystem} />
    </div>
  </div>;
}
