import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { EM, ELLIPSIS, T } from "../lib/uiText";
import { useMemo } from "react";

export type Producto = {
  id: number;
  descripcion: string;
  tipoPrenda: string | null;
  marca: string | null;
  color: string | null;
  condicion: string | null;
  precioVenta: number;
  talle: string | null;
  idProveedor: number;
  estado: string;
  nombreProveedor?: string | null;
};

type CartLine = Producto;

export type TicketData = {
  ventaId: number;
  fechaLabel: string;
  lines: { descripcion: string; precioVenta: number }[];
  total: number;
  tienda?: { nombre: string; logoUrl?: string } | null;
};

type VentaDiaria = { id: number; fecha: string; total: number; cantidadItems: number };

type CajaDiario = {
  sesionAbierta: boolean;
  sesion: { id: number; abiertaEn: string; cerradaEn: string | null } | null;
  ventas: VentaDiaria[];
  totalDia: number;
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function VentaPage() {
  const [disponibles, setDisponibles] = useState<Producto[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastTicket, setLastTicket] = useState<TicketData | null>(null);
  const [tienda, setTienda] = useState<{ id: number; nombre: string; logoUrl?: string } | null>(null);
  const [proveedores, setProveedores] = useState<{ id: number; nombre: string }[]>([]);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroId, setFiltroId] = useState<string>("");
  const [filtroProveedor, setFiltroProveedor] = useState<string>("");
  const [caja, setCaja] = useState<CajaDiario | null>(null);
  const [loadingCaja, setLoadingCaja] = useState(true);
  const [cajaBusy, setCajaBusy] = useState(false);
  const [verVentas, setVerVentas] = useState(false);

  const loadCaja = useCallback(async () => {
    setLoadingCaja(true);
    try {
      setCaja(await api<CajaDiario>("/api/caja/diario"));
    } catch (e) {
      setMsg(String(e));
    } finally {
      setLoadingCaja(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api<Producto[]>("/api/productos/disponibles");
      setDisponibles(rows);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadCaja();
    api<{ id: number; nombre: string; logoUrl?: string }>("/api/tienda").then(setTienda).catch(() => {});
    api<{ id: number; nombre: string }[]>("/api/proveedores")
      .then((rows) => setProveedores(rows.map((p) => ({ id: p.id, nombre: p.nombre }))))
      .catch(() => {});
  }, [load, loadCaja]);

  const cajaAbierta = caja?.sesionAbierta ?? false;

  const abrirCaja = async () => {
    setCajaBusy(true);
    setMsg(null);
    try {
      await api("/api/caja/abrir", { method: "POST" });
      await loadCaja();
      setMsg("Caja abierta. Ya puede registrar ventas.");
    } catch (e) {
      setMsg(String(e));
    } finally {
      setCajaBusy(false);
    }
  };

  const cerrarCaja = async () => {
    if (cart.length > 0) {
      setMsg("Vacíe el carrito antes de cerrar la caja.");
      return;
    }
    setCajaBusy(true);
    setMsg(null);
    try {
      await api("/api/caja/cerrar", { method: "POST" });
      await loadCaja();
      setMsg("Caja cerrada.");
    } catch (e) {
      setMsg(String(e));
    } finally {
      setCajaBusy(false);
    }
  };

  const disponiblesFiltrados = useMemo(() => {
    let list = disponibles;
    const texto = filtroTexto.trim().toLowerCase();
    const idNum = Number(filtroId);
    const provNum = Number(filtroProveedor);
    if (texto) {
      list = list.filter((p) => (p.descripcion || "").toLowerCase().includes(texto));
    }
    if (!Number.isNaN(idNum) && filtroId !== "") {
      list = list.filter((p) => p.id === idNum);
    }
    if (!Number.isNaN(provNum) && filtroProveedor !== "") {
      list = list.filter((p) => p.idProveedor === provNum);
    }
    return list;
  }, [disponibles, filtroTexto, filtroId, filtroProveedor]);

  const addToCart = (p: Producto) => {
    if (!cajaAbierta) {
      setMsg("Debe abrir la caja antes de vender.");
      return;
    }
    setCart((c) => [...c, p]);
    setDisponibles((d) => d.filter((x) => x.id !== p.id));
  };

  const removeFromCart = (id: number) => {
    const line = cart.find((x) => x.id === id);
    if (line) {
      setCart((c) => c.filter((x) => x.id !== id));
      setDisponibles((d) => [...d, line].sort((a, b) => b.id - a.id));
    }
  };

  const total = cart.reduce((s, x) => s + x.precioVenta, 0);

  const printTicket = (data: TicketData) => {
    const w = window.open("", "_blank");
    if (!w) {
      setMsg("Permite ventanas emergentes para imprimir el ticket.");
      return;
    }
    const rows = data.lines
      .map(
        (l) =>
          `<tr><td style="padding:4px 0;border-bottom:1px solid #ddd">${escapeHtml(l.descripcion)}</td><td style="text-align:right;padding:4px 0;border-bottom:1px solid #ddd">$${l.precioVenta.toFixed(2)}</td></tr>`
      )
      .join("");
    const titulo = escapeHtml(data.tienda?.nombre || "SecondHand") + " — Ticket de venta";
    const gracias = "\u00a1Gracias por su compra!";
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket #${data.ventaId}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:20px;max-width:360px;margin:0 auto;font-size:14px}
        h1{font-size:16px;margin:0 0 8px}
        .meta{color:#444;font-size:12px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse}
        .total{font-weight:bold;font-size:16px;margin-top:12px;padding-top:8px;border-top:2px solid #000}
        @media print{body{padding:8px}}
      </style></head><body>
      ${data.tienda?.logoUrl ? `<img src=\"${escapeHtml(data.tienda.logoUrl)}\" alt=\"logo\" style=\"width:72px;height:72px;border-radius:50%\"/>` : ``}
      <h1>${titulo}</h1>
      <div class="meta">Venta #${data.ventaId}<br>${escapeHtml(data.fechaLabel)}</div>
      <table><tbody>${rows}</tbody></table>
      <div class="total">Total: $${data.total.toFixed(2)}</div>
      <p style="margin-top:24px;font-size:11px;color:#666">${gracias}</p>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const confirmarVenta = async () => {
    if (cart.length === 0) return;
    if (!cajaAbierta) {
      setMsg("Debe abrir la caja antes de registrar ventas.");
      return;
    }
    setSaving(true);
    setMsg(null);
    const snapshot = cart.map((p) => ({
      descripcion: p.descripcion,
      precioVenta: p.precioVenta,
    }));
    const totalVenta = cart.reduce((s, x) => s + x.precioVenta, 0);
    try {
      const res = await api<{ id: number; total: number; fecha: string }>("/api/ventas", {
        method: "POST",
        body: JSON.stringify({
          items: cart.map((p) => ({
            idProducto: p.id,
            precioUnitario: p.precioVenta,
          })),
        }),
      });
      const fechaLabel = new Date(res.fecha).toLocaleString("es-AR", {
        dateStyle: "short",
        timeStyle: "short",
      });
      const ticket: TicketData = {
        ventaId: res.id,
        fechaLabel,
        lines: snapshot,
        total: totalVenta,
        tienda,
      };
      setLastTicket(ticket);
      setCart([]);
      await load();
      await loadCaja();
      setMsg("Venta registrada correctamente.");
      window.setTimeout(() => printTicket(ticket), 300);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setSaving(false);
    }
  };

  const fechaHoy = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="page venta-page">
      <section className="card caja-panel">
        <div className="caja-header">
          <div>
            <h2>Ventas diarias</h2>
            <p className="muted caja-fecha">{fechaHoy}</p>
          </div>
          <div className="caja-header-actions">
            <span className={`caja-badge ${cajaAbierta ? "caja-badge-open" : "caja-badge-closed"}`}>
              {cajaAbierta ? "Caja abierta" : "Caja cerrada"}
            </span>
            {!loadingCaja && caja && caja.ventas.length > 0 && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setVerVentas((v) => !v)}
              >
                {verVentas ? "Ocultar ventas" : "Ver ventas"}
              </button>
            )}
            {cajaAbierta ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={cajaBusy}
                onClick={cerrarCaja}
              >
                {cajaBusy ? "Cerrando" + ELLIPSIS : "Cerrar caja"}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={cajaBusy}
                onClick={abrirCaja}
              >
                {cajaBusy ? "Abriendo" + ELLIPSIS : "Abrir caja"}
              </button>
            )}
          </div>
        </div>
        <p className="total caja-total-dia">
          <strong>Total del día: ${(caja?.totalDia ?? 0).toFixed(2)}</strong>
          {loadingCaja ? (
            <span className="muted"> · Cargando{ELLIPSIS}</span>
          ) : caja && caja.ventas.length > 0 ? (
            <span className="muted"> · {caja.ventas.length} venta{caja.ventas.length === 1 ? "" : "s"}</span>
          ) : (
            <span className="muted"> · Sin ventas hoy</span>
          )}
        </p>
        {verVentas && caja && caja.ventas.length > 0 && (
          <div className="table-wrap caja-ventas-detalle">
            <table>
              <thead>
                <tr>
                  <th>Venta</th>
                  <th>Hora</th>
                  <th>Artículos</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {caja.ventas.map((v) => (
                  <tr key={v.id}>
                    <td>#{v.id}</td>
                    <td>
                      {new Date(v.fecha).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>{v.cantidadItems}</td>
                    <td>${v.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!cajaAbierta && (
          <p className="caja-aviso">Abrí la caja para poder agregar productos al carrito y confirmar ventas.</p>
        )}
      </section>

      <div className="venta-grid">
      <section className="card">
        <h2>Prendas disponibles</h2>
        <div className="form-grid" style={{ gridTemplateColumns: "1fr 180px 220px", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <label style={{ display: "flex", flexDirection: "column" }}>
            <span className="muted" style={{ fontSize: 12 }}>Buscar por descripción</span>
            <input
              type="text"
              placeholder="Ej: campera, jean..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column" }}>
            <span className="muted" style={{ fontSize: 12 }}>Buscar por ID</span>
            <input
              type="number"
              min="1"
              inputMode="numeric"
              placeholder="ID"
              value={filtroId}
              onChange={(e) => setFiltroId(e.target.value)}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column" }}>
            <span className="muted" style={{ fontSize: 12 }}>Filtrar por proveedor</span>
            <select value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)}>
              <option value="">Todos</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </label>
        </div>
        {loading ? (
          <p>{"Cargando" + ELLIPSIS}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{T.descripcion}</th>
                  <th>Tipo</th>
                  <th>Marca</th>
                  <th>Color</th>
                  <th>Talle</th>
                  <th>Precio</th>
                  <th>Proveedor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {disponiblesFiltrados.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.descripcion}</td>
                    <td>{p.tipoPrenda ?? EM}</td>
                    <td>{p.marca ?? EM}</td>
                    <td>{p.color ?? EM}</td>
                    <td>{p.talle ?? EM}</td>
                    <td>${p.precioVenta.toFixed(2)}</td>
                    <td>{p.nombreProveedor ?? EM}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={!cajaAbierta}
                        onClick={() => addToCart(p)}
                      >
                        Al carrito
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {disponibles.length === 0 && !loading && <p className="muted">No hay prendas disponibles.</p>}
          </div>
        )}
        <button type="button" className="btn btn-secondary mt" onClick={load}>
          Actualizar lista
        </button>
      </section>

      <section className="card">
        <h2>Venta actual</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Precio</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((p) => (
                <tr key={p.id}>
                  <td>{p.descripcion}</td>
                  <td>${p.precioVenta.toFixed(2)}</td>
                  <td>
                    <button type="button" className="btn btn-ghost" onClick={() => removeFromCart(p.id)}>
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="total">
          <strong>Total: ${total.toFixed(2)}</strong>
        </p>
        <div className="form-actions" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
          <button
            type="button"
            className="btn btn-accent"
            disabled={!cajaAbierta || cart.length === 0 || saving}
            onClick={confirmarVenta}
          >
            {saving ? "Guardando" + ELLIPSIS : "Confirmar venta"}
          </button>
          {lastTicket && (
            <button type="button" className="btn btn-secondary" onClick={() => printTicket(lastTicket)}>
              Imprimir último ticket
            </button>
          )}
        </div>
        {msg && (
          <p
            className={
              msg.includes("correctamente") || msg.includes("abierta") || msg.includes("cerrada")
                ? "ok"
                : "err"
            }
          >
            {msg}
          </p>
        )}
        {lastTicket && (
          <p className="muted" style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
            Ticket de venta #{lastTicket.ventaId} disponible para imprimir.
          </p>
        )}
      </section>
      </div>
    </div>
  );
}