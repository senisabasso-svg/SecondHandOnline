import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";

type Prenda = {
  id: number;
  descripcion: string;
  tipoPrenda: string | null;
  marca: string | null;
  color: string | null;
  talle: string | null;
  precioVenta: number;
  estado: string;
  vendido: boolean;
  fechaVenta: string | null;
  precioVendido: number | null;
};

const EM = "\u2014";

function fmtFecha(iso: string | null) {
  if (!iso) return EM;
  try {
    return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return EM;
  }
}

export default function ProveedorPortalPage() {
  const { usuario, logout } = useAuth();
  const [tienda, setTienda] = useState<{ nombre: string; logoUrl?: string | null } | null>(null);
  const [prendas, setPrendas] = useState<Prenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todas" | "disponible" | "vendido">("todas");

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const [t, p] = await Promise.all([
        api<{ nombre: string; logoUrl?: string | null }>("/api/proveedor/tienda"),
        api<Prenda[]>("/api/proveedor/mis-prendas"),
      ]);
      setTienda(t);
      setPrendas(p);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtradas = useMemo(() => {
    if (filtro === "todas") return prendas;
    return prendas.filter((p) => p.estado === filtro);
  }, [prendas, filtro]);

  const resumen = useMemo(() => {
    const vendidas = prendas.filter((p) => p.vendido).length;
    return { total: prendas.length, vendidas, enTienda: prendas.length - vendidas };
  }, [prendas]);

  return (
    <div className="app">
      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {tienda?.logoUrl ? (
            <img
              src={tienda.logoUrl}
              alt="Logo"
              style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }}
            />
          ) : null}
          <h1 className="logo">{tienda?.nombre || "Mis prendas"}</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            {usuario?.nombre || "Proveedor"}
          </span>
          <button type="button" className="btn btn-secondary" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="main">
        <div className="page">
          <section className="card">
            <h2>Estado de sus prendas</h2>
            <p className="muted">
              {resumen.total} en total · {resumen.vendidas} vendida{resumen.vendidas === 1 ? "" : "s"} ·{" "}
              {resumen.enTienda} en tienda
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              {(["todas", "disponible", "vendido"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`btn ${filtro === f ? "btn-accent" : "btn-secondary"}`}
                  onClick={() => setFiltro(f)}
                >
                  {f === "todas" ? "Todas" : f === "disponible" ? "En tienda" : "Vendidas"}
                </button>
              ))}
              <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
                Actualizar
              </button>
            </div>
            {msg && <p className="err">{msg}</p>}
            {loading ? (
              <p className="muted">Cargando…</p>
            ) : filtradas.length === 0 ? (
              <p className="muted">No hay prendas para mostrar con este filtro.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Descripción</th>
                      <th>Tipo</th>
                      <th>Estado</th>
                      <th>Precio etiqueta</th>
                      <th>Venta</th>
                      <th>Fecha venta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtradas.map((p) => (
                      <tr key={p.id}>
                        <td>{p.descripcion}</td>
                        <td>{p.tipoPrenda || EM}</td>
                        <td>
                          <strong style={{ color: p.vendido ? "var(--accent-dark)" : "var(--muted)" }}>
                            {p.vendido ? "Vendida" : "En tienda"}
                          </strong>
                        </td>
                        <td>${p.precioVenta.toFixed(2)}</td>
                        <td>{p.vendido && p.precioVendido != null ? `$${p.precioVendido.toFixed(2)}` : EM}</td>
                        <td>{fmtFecha(p.fechaVenta)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
