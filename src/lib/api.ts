import type { Session, SiteData } from "../domain/types";

export async function getSite(): Promise<SiteData> {
  const session = readSession();
  const res = await fetch("/api/site", {
    headers: session ? { authorization: `Bearer ${session.token}` } : {},
  });
  if (!res.ok) throw new Error("暂时无法加载内容");
  return res.json() as Promise<SiteData>;
}

export class StaleSiteError extends Error {
  latest: SiteData;
  constructor(message: string, latest: SiteData) {
    super(message);
    this.latest = latest;
  }
}

export async function saveSite(site: SiteData): Promise<SiteData> {
  const latest = await getSite();
  if (
    site.meta.updatedAt &&
    latest.meta.updatedAt &&
    site.meta.updatedAt !== latest.meta.updatedAt
  )
    throw new StaleSiteError("后台数据已更新。", latest);
  const session = readSession();
  const res = await fetch("/api/site", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      ...(session ? { authorization: `Bearer ${session.token}` } : {}),
    },
    body: JSON.stringify(site),
  });
  const body = (await res.json()) as SiteData & {
    message?: string;
    latest?: SiteData;
  };
  if (res.status === 409 && body.latest)
    throw new StaleSiteError(body.message || "后台数据已更新。", body.latest);
  if (!res.ok) throw new Error(body.message || "保存失败");
  return body;
}

export async function createLead(lead: Record<string, string>) {
  const response = await fetch("/api/lead", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(lead),
  });
  if (!response.ok) throw new Error("提交未成功，请重试或扫码联系顾问。");
}

export const sessionKey = "demo-session";

export const readSession = (): Session | null => {
  try {
    const raw = localStorage.getItem(sessionKey);
    if (!raw) return null;
    const value = JSON.parse(raw);
    return typeof value?.token === "string" &&
      typeof value?.user?.username === "string" &&
      ["admin", "user"].includes(value.user.role)
      ? (value as Session)
      : null;
  } catch {
    return null;
  }
};

export async function authenticate(
  mode: "login" | "register",
  username: string,
  password: string,
): Promise<Session> {
  const res = await fetch(`/api/auth/${mode}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = (await res.json()) as Session & { message?: string };
  if (!res.ok) throw new Error(body.message || "账号操作失败");
  localStorage.setItem(sessionKey, JSON.stringify(body));
  return body;
}

export async function signOut(session: Session | null) {
  try {
    if (session)
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { authorization: `Bearer ${session.token}` },
      });
  } finally {
    localStorage.removeItem(sessionKey);
  }
}
