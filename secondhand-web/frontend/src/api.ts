const base = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

function authHeaders(): HeadersInit {
  const t = localStorage.getItem("sh_token");
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = base ? `${base}${path}` : path;
  const res = await fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  if (res.status === 401) {
    localStorage.removeItem("sh_token");
    localStorage.removeItem("sh_user");
    if (!path.includes("/auth/login")) window.location.assign("/login");
    throw new Error("Sesión caducada o no autorizado.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
