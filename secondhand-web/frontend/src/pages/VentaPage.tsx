import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { EM, ELLIPSIS, T } from "../lib/uiText";

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
  }, [load]);

  const addToCart = (p: Producto) => {
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
    const titulo = "SecondHand \u2014 Ticket de venta";
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
      };
      setLastTicket(ticket);
      setCart([]);
      await load();
      setMsg("Venta registrada correctamente.");
      window.setTimeout(() => printTicket(ticket), 300);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page venta-grid">
      <section className="card">
        <h2>Prendas disponibles</h2>
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
                {disponibles.map((p) => (
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
                      <button type="button" className="btn btn-primary" onClick={() => addToCart(p)}>
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
            disabled={cart.length === 0 || saving}
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
        {msg && <p className={msg.includes("correctamente") ? "ok" : "err"}>{msg}</p>}
        {lastTicket && (
          <p className="muted" style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
            Ticket de venta #{lastTicket.ventaId} disponible para imprimir.
          </p>
        )}
      </section>
    </div>
  );
}