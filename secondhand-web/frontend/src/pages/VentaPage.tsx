import { useCallback, useEffect, useMemo, useState } from "react";
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
  cantidad: number | null;
  nombreProveedor?: string | null;
};

function esProductoConStock(p: Producto) {
  return p.cantidad != null;
}

function unidadesEnCarrito(cart: Producto[], id: number) {
  return cart.filter((x) => x.id === id).length;
}

function stockRestante(p: Producto, cart: Producto[]) {
  if (!esProductoConStock(p)) return cart.some((x) => x.id === p.id) ? 0 : 1;
  return Math.max(0, (p.cantidad ?? 0) - unidadesEnCarrito(cart, p.id));
}

type CartLine = Producto;

export type MedioPago = "efectivo" | "tarjeta" | "cuenta_corriente";

type ClienteVenta = {
  id: number;
  nombre: string;
  tipoDocumento: string;
  numeroDocumento: string;
  tieneCuentaCorriente: boolean;
  cuentaCorriente: {
    id: number;
    limite: number;
    saldo: number;
    disponible: number;
  } | null;
};

export type TicketData = {
  ventaId: number;
  fechaLabel: string;
  lines: { descripcion: string; precioVenta: number }[];
  total: number;
  medioPago?: MedioPago | null;
  tienda?: { nombre: string; logoUrl?: string } | null;
};

type VentaDiaria = {
  id: number;
  fecha: string;
  total: number;
  cantidadItems: number;
  medioPago?: string | null;
};

function labelMedioPago(m?: string | null) {
  if (m === "efectivo") return "Efectivo";
  if (m === "tarjeta") return "Tarjeta";
  if (m === "cuenta_corriente") return "Cuenta corriente";
  return EM;
}

type CajaMovimiento = {
  id: number;
  fecha: string;
  tipo: "ingreso" | "egreso";
  monto: number;
  concepto: string | null;
};

type CajaDiario = {
  sesionAbierta: boolean;
  sesion: { id: number; abiertaEn: string; cerradaEn: string | null } | null;
  ventas: VentaDiaria[];
  movimientos: CajaMovimiento[];
  totalDia: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalCuentaCorriente?: number;
  totalIngresos: number;
  totalEgresos: number;
  efectivoEnCaja: number;
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
  const [verMovimientos, setVerMovimientos] = useState(false);
  const [movForm, setMovForm] = useState({ tipo: "egreso" as "ingreso" | "egreso", monto: "", concepto: "" });
  const [modalPago, setModalPago] = useState(false);
  const [clientes, setClientes] = useState<ClienteVenta[]>([]);
  const [idClienteVenta, setIdClienteVenta] = useState<string>("");

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
    api<ClienteVenta[]>("/api/clientes")
      .then(setClientes)
      .catch(() => {});
  }, [load, loadCaja]);

  const clienteSeleccionado = useMemo(() => {
    if (!idClienteVenta) return null;
    return clientes.find((c) => c.id === Number(idClienteVenta)) ?? null;
  }, [clientes, idClienteVenta]);

  const puedeCuentaCorriente = Boolean(
    clienteSeleccionado?.tieneCuentaCorriente && clienteSeleccionado.cuentaCorriente
  );

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

  const registrarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cajaAbierta) {
      setMsg("Debe abrir la caja antes de registrar movimientos.");
      return;
    }
    const importe = Number(movForm.monto);
    if (!Number.isFinite(importe) || importe <= 0) {
      setMsg("Ingrese un monto válido mayor a cero.");
      return;
    }
    setCajaBusy(true);
    setMsg(null);
    try {
      await api("/api/caja/movimientos", {
        method: "POST",
        body: JSON.stringify({
          tipo: movForm.tipo,
          monto: importe,
          concepto: movForm.concepto.trim() || null,
        }),
      });
      setMovForm({ tipo: movForm.tipo, monto: "", concepto: "" });
      await loadCaja();
      setMsg(movForm.tipo === "ingreso" ? "Ingreso registrado." : "Egreso registrado.");
    } catch (err) {
      setMsg(String(err));
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
    if (stockRestante(p, cart) <= 0) {
      setMsg("No hay más unidades disponibles de este producto.");
      return;
    }
    setCart((c) => [...c, p]);
    if (!esProductoConStock(p)) {
      setDisponibles((d) => d.filter((x) => x.id !== p.id));
    }
  };

  const removeFromCart = (index: number) => {
    const line = cart[index];
    if (!line) return;
    setCart((c) => c.filter((_, i) => i !== index));
    if (!esProductoConStock(line)) {
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
      <div class="meta">Venta #${data.ventaId}<br>${escapeHtml(data.fechaLabel)}${
        data.medioPago ? `<br>Pago: ${escapeHtml(labelMedioPago(data.medioPago))}` : ""
      }</div>
      <table><tbody>${rows}</tbody></table>
      <div class="total">Total: $${data.total.toFixed(2)}</div>
      <p style="margin-top:24px;font-size:11px;color:#666">${gracias}</p>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const pedirConfirmacion = () => {
    if (cart.length === 0) return;
    if (!cajaAbierta) {
      setMsg("Debe abrir la caja antes de registrar ventas.");
      return;
    }
    setModalPago(true);
  };

  const confirmarVenta = async (medioPago: MedioPago) => {
    setModalPago(false);
    setSaving(true);
    setMsg(null);
    const snapshot = cart.map((p) => ({
      descripcion: p.descripcion,
      precioVenta: p.precioVenta,
    }));
    const totalVenta = cart.reduce((s, x) => s + x.precioVenta, 0);
    if (medioPago === "cuenta_corriente") {
      const disp = clienteSeleccionado?.cuentaCorriente?.disponible ?? 0;
      if (!clienteSeleccionado?.tieneCuentaCorriente) {
        setMsg("El cliente seleccionado no tiene cuenta corriente.");
        setSaving(false);
        return;
      }
      if (totalVenta > disp) {
        setMsg(`Crédito insuficiente. Disponible: $${disp.toFixed(2)}.`);
        setSaving(false);
        return;
      }
    }
    try {
      const body: { medioPago: MedioPago; items: { idProducto: number; precioUnitario: number }[]; idCliente?: number } = {
        medioPago,
        items: cart.map((p) => ({
          idProducto: p.id,
          precioUnitario: p.precioVenta,
        })),
      };
      if (idClienteVenta) body.idCliente = Number(idClienteVenta);
      const res = await api<{ id: number; total: number; fecha: string; medioPago: MedioPago }>("/api/ventas", {
        method: "POST",
        body: JSON.stringify(body),
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
        medioPago: res.medioPago,
        tienda,
      };
      setLastTicket(ticket);
      setCart([]);
      setIdClienteVenta("");
      await load();
      await loadCaja();
      api<ClienteVenta[]>("/api/clientes")
        .then(setClientes)
        .catch(() => {});
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
        {!loadingCaja && caja && (
          <div className="caja-resumen-efectivo">
            <span>Efectivo en caja: <strong>${caja.efectivoEnCaja.toFixed(2)}</strong></span>
            <span className="muted">
              {" "}
              (ventas efectivo ${caja.totalEfectivo.toFixed(2)}
              {caja.totalIngresos > 0 ? ` + ingresos $${caja.totalIngresos.toFixed(2)}` : ""}
              {caja.totalEgresos > 0 ? ` − egresos $${caja.totalEgresos.toFixed(2)}` : ""}
              {caja.totalTarjeta > 0 ? ` · tarjeta $${caja.totalTarjeta.toFixed(2)}` : ""}
              {(caja.totalCuentaCorriente ?? 0) > 0
                ? ` · cuenta corriente $${(caja.totalCuentaCorriente ?? 0).toFixed(2)}`
                : ""})
            </span>
          </div>
        )}
        <div className="caja-movimientos">
          <h3 className="caja-movimientos-titulo">Ingresos y egresos de efectivo</h3>
          <p className="muted caja-movimientos-desc">
            Registre pagos a proveedores u otros retiros de caja, o ingresos de efectivo.
          </p>
          <form className="caja-mov-form" onSubmit={registrarMovimiento}>
            <label>
              Tipo
              <select
                value={movForm.tipo}
                onChange={(e) => setMovForm((f) => ({ ...f, tipo: e.target.value as "ingreso" | "egreso" }))}
                disabled={!cajaAbierta || cajaBusy}
              >
                <option value="egreso">Egreso (sale de caja)</option>
                <option value="ingreso">Ingreso (entra a caja)</option>
              </select>
            </label>
            <label>
              Monto
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={movForm.monto}
                onChange={(e) => setMovForm((f) => ({ ...f, monto: e.target.value }))}
                placeholder="0.00"
                disabled={!cajaAbierta || cajaBusy}
                required
              />
            </label>
            <label className="caja-mov-concepto">
              Concepto
              <input
                type="text"
                value={movForm.concepto}
                onChange={(e) => setMovForm((f) => ({ ...f, concepto: e.target.value }))}
                placeholder="Ej: Pago proveedor María"
                disabled={!cajaAbierta || cajaBusy}
              />
            </label>
            <button type="submit" className="btn btn-secondary" disabled={!cajaAbierta || cajaBusy}>
              Registrar
            </button>
          </form>
          {!loadingCaja && caja && caja.movimientos.length > 0 && (
            <>
              <button
                type="button"
                className="btn btn-ghost caja-ver-mov-btn"
                onClick={() => setVerMovimientos((v) => !v)}
              >
                {verMovimientos ? "Ocultar movimientos" : "Ver movimientos del día"}
              </button>
              {verMovimientos && (
                <div className="table-wrap caja-ventas-detalle">
                  <table>
                    <thead>
                      <tr>
                        <th>Hora</th>
                        <th>Tipo</th>
                        <th>Concepto</th>
                        <th>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {caja.movimientos.map((m) => (
                        <tr key={m.id}>
                          <td>
                            {new Date(m.fecha).toLocaleTimeString("es-AR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className={m.tipo === "ingreso" ? "caja-mov-ingreso" : "caja-mov-egreso"}>
                            {m.tipo === "ingreso" ? "Ingreso" : "Egreso"}
                          </td>
                          <td>{m.concepto || EM}</td>
                          <td>
                            {m.tipo === "egreso" ? "−" : "+"}${m.monto.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
        {verVentas && caja && caja.ventas.length > 0 && (
          <div className="table-wrap caja-ventas-detalle">
            <table>
              <thead>
                <tr>
                  <th>Venta</th>
                  <th>Hora</th>
                  <th>Artículos</th>
                  <th>Pago</th>
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
                    <td>{labelMedioPago(v.medioPago)}</td>
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
                  <th>Stock</th>
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
                    <td>{stockRestante(p, cart)}</td>
                    <td>{p.nombreProveedor ?? EM}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={!cajaAbierta || stockRestante(p, cart) <= 0}
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
        <div className="filter-row" style={{ marginBottom: "1rem" }}>
          <label>
            Cliente (opcional)
            <select value={idClienteVenta} onChange={(e) => setIdClienteVenta(e.target.value)}>
              <option value="">— Sin cliente —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.numeroDocumento})
                </option>
              ))}
            </select>
          </label>
          {clienteSeleccionado?.cuentaCorriente && (
            <p className="muted total-inline" style={{ margin: 0 }}>
              CC: saldo ${clienteSeleccionado.cuentaCorriente.saldo.toFixed(2)} · disponible{" "}
              <strong>${clienteSeleccionado.cuentaCorriente.disponible.toFixed(2)}</strong>
            </p>
          )}
        </div>
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
              {cart.map((p, index) => (
                <tr key={`${p.id}-${index}`}>
                  <td>{p.descripcion}</td>
                  <td>${p.precioVenta.toFixed(2)}</td>
                  <td>
                    <button type="button" className="btn btn-ghost" onClick={() => removeFromCart(index)}>
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
            onClick={pedirConfirmacion}
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

      {modalPago && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-pago-titulo"
          onClick={() => !saving && setModalPago(false)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 id="modal-pago-titulo">Medio de pago</h3>
            <p className="muted">Total a cobrar: <strong>${total.toFixed(2)}</strong></p>
            <div className="modal-pago-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving}
                onClick={() => confirmarVenta("efectivo")}
              >
                Efectivo
              </button>
              <button
                type="button"
                className="btn btn-accent"
                disabled={saving}
                onClick={() => confirmarVenta("tarjeta")}
              >
                Tarjeta
              </button>
              {puedeCuentaCorriente && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving}
                  onClick={() => confirmarVenta("cuenta_corriente")}
                >
                  Cuenta corriente
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                disabled={saving}
                onClick={() => setModalPago(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}