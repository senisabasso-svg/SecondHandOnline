import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { EM, ELLIPSIS, T } from "../lib/uiText";

function labelMedioPago(m?: string | null) {
  if (m === "efectivo") return "Efectivo";
  if (m === "tarjeta") return "Tarjeta";
  if (m === "cuenta_corriente") return "Cuenta corriente";
  return EM;
}

function labelCliente(nombre?: string | null) {
  const n = typeof nombre === "string" ? nombre.trim() : "";
  return n || "Cliente Final";
}

type Informe = {
  idVenta: number;
  fechaVenta: string;
  totalVenta: number;
  medioPago?: string | null;
  nombreCliente?: string | null;
  idProducto: number;
  descripcionProducto: string;
  tipoPrenda: string | null;
  marca: string | null;
  color: string | null;
  precioUnitario: number;
  idProveedor: number;
  nombreProveedor: string;
  telefonoProveedor: string | null;
};

type Proveedor = { id: number; nombre: string; telefono?: string | null };

type MovimientoCaja = {
  id: number;
  fecha: string;
  tipo: "ingreso" | "egreso";
  monto: number;
  concepto: string | null;
};

type InformeMovimientosCaja = {
  movimientos: MovimientoCaja[];
  totalIngresos: number;
  totalEgresos: number;
  neto: number;
};

function normalizePhoneForWhatsApp(raw?: string | null) {
  if (!raw) return "";
  let digits = raw.replace(/\D+/g, "");
  if (!digits) return "";
  // Formato internacional con 00 (ej: 00598...)
  if (digits.startsWith("00")) digits = digits.slice(2);

  // Ya está en Uruguay
  if (digits.startsWith("598")) return digits;

  // Caso común mal formado: 5409xxxxxxx / 549xxxxxxx -> convertir a UY 5989xxxxxxx
  if (digits.startsWith("54")) {
    digits = digits.slice(2);
  }

  // Local UY: 09xxxxxxx -> 9xxxxxxx
  if (digits.startsWith("0")) digits = digits.slice(1);

  // Si no empieza con 9 y parece local de 8 dígitos, igual lo pasamos a UY.
  return `598${digits}`;
}

export default function InformesPage() {
  const [informes, setInformes] = useState<Informe[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [filtro, setFiltro] = useState<string>("");
  const [mes, setMes] = useState<string>("");
  const [medioPago, setMedioPago] = useState<string>("");
  const [totalProv, setTotalProv] = useState<number | null>(null);
  const [movimientosCaja, setMovimientosCaja] = useState<InformeMovimientosCaja | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const loadProveedores = useCallback(async () => {
    try {
      setProveedores(await api<Proveedor[]>("/api/proveedores"));
    } catch (e) {
      setMsg(String(e));
    }
  }, []);

  const loadInformes = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const id = filtro ? Number(filtro) : null;
      const params = new URLSearchParams();
      if (mes) params.set("month", mes);
      if (medioPago) params.set("medioPago", medioPago);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const movQs = mes ? `?month=${encodeURIComponent(mes)}` : "";
      if (id) {
        const [rows, tot, mov] = await Promise.all([
          api<Informe[]>(`/api/informes/proveedor/${id}${qs}`),
          api<{ total: number }>(`/api/informes/proveedor/${id}/total${qs}`),
          api<InformeMovimientosCaja>(`/api/informes/movimientos-caja${movQs}`),
        ]);
        setInformes(rows);
        setTotalProv(tot.total);
        setMovimientosCaja(mov);
      } else {
        const [rows, mov] = await Promise.all([
          api<Informe[]>(`/api/informes${qs}`),
          api<InformeMovimientosCaja>(`/api/informes/movimientos-caja${movQs}`),
        ]);
        setInformes(rows);
        setTotalProv(null);
        setMovimientosCaja(mov);
      }
    } catch (e) {
      setMsg(String(e));
    } finally {
      setLoading(false);
    }
  }, [filtro, mes, medioPago]);

  const exportarExcel = () => {
    if (informes.length === 0) {
      setMsg("No hay datos para exportar.");
      return;
    }
    const rows = informes.map((r) => ({
      Venta: r.idVenta,
      Fecha: new Date(r.fechaVenta).toLocaleString("es-AR"),
      Cliente: labelCliente(r.nombreCliente),
      Pago: labelMedioPago(r.medioPago),
      Producto: r.descripcionProducto,
      Tipo: r.tipoPrenda ?? "",
      Marca: r.marca ?? "",
      Color: r.color ?? "",
      "Precio unitario": r.precioUnitario,
      Proveedor: r.nombreProveedor,
      "Teléfono proveedor": r.telefonoProveedor ?? "",
    }));
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(";"),
      ...rows.map((row) =>
        headers
          .map((h) => `"${String((row as Record<string, string | number>)[h] ?? "").replace(/"/g, '""')}"`)
          .join(";")
      ),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const labelMes = mes || "todos";
    const labelPago = medioPago || "todos";
    a.href = url;
    a.download = `informes_${labelMes}_${labelPago}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const proveedorSeleccionado = filtro ? proveedores.find((p) => p.id === Number(filtro)) : null;
  const waPhone = normalizePhoneForWhatsApp(proveedorSeleccionado?.telefono);
  const waHref = waPhone ? `https://wa.me/${waPhone}` : "";

  useEffect(() => {
    loadProveedores();
  }, [loadProveedores]);

  useEffect(() => {
    loadInformes();
  }, [loadInformes]);

  return (
    <div className="page">
      <section className="card">
        <h2>Informes de ventas</h2>
        <div className="filter-row">
          <label>
            Mes
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
            />
          </label>
          <label>
            Filtrar por proveedor
            <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="">Todos</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Método de pago
            <select value={medioPago} onChange={(e) => setMedioPago(e.target.value)}>
              <option value="">Todos</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="cuenta_corriente">Cuenta Corriente</option>
            </select>
          </label>
          {filtro && totalProv !== null && (
            <p className="total-inline">
              <strong>Total filtrado: ${totalProv.toFixed(2)}</strong>
            </p>
          )}
          <button type="button" className="btn btn-secondary" onClick={exportarExcel}>
            Exportar Excel
          </button>
          {filtro && (
            <a
              href={waHref || "#"}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
              style={{
                background: waHref ? "#25D366" : undefined,
                borderColor: waHref ? "#25D366" : undefined,
                color: waHref ? "#fff" : undefined,
                pointerEvents: waHref ? "auto" : "none",
                opacity: waHref ? 1 : 0.6,
              }}
              title={waHref ? "Abrir chat de WhatsApp con proveedor" : "Proveedor sin teléfono válido"}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 32 32"
                  width="16"
                  height="16"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    fill="currentColor"
                    d="M16.03 3.2c-7.07 0-12.8 5.72-12.8 12.78 0 2.25.59 4.45 1.71 6.39L3.2 28.8l6.6-1.72a12.8 12.8 0 0 0 6.23 1.6h.01c7.07 0 12.8-5.72 12.8-12.79 0-3.42-1.33-6.64-3.76-9.06A12.73 12.73 0 0 0 16.03 3.2Zm0 23.33h-.01a10.6 10.6 0 0 1-5.4-1.49l-.39-.23-3.91 1.02 1.05-3.81-.25-.39a10.58 10.58 0 0 1-1.63-5.66c0-5.86 4.77-10.63 10.64-10.63 2.84 0 5.51 1.1 7.52 3.11a10.55 10.55 0 0 1 3.12 7.52c0 5.86-4.77 10.63-10.64 10.63Zm5.83-7.95c-.32-.16-1.9-.94-2.2-1.05-.29-.11-.5-.16-.72.16-.21.32-.82 1.05-1 1.27-.19.21-.37.24-.69.08-.32-.16-1.34-.49-2.55-1.57a9.58 9.58 0 0 1-1.77-2.19c-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.53-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.12 1.09-1.12 2.66 0 1.57 1.15 3.09 1.31 3.3.16.21 2.27 3.47 5.49 4.86.77.33 1.37.52 1.84.66.77.24 1.47.2 2.02.12.62-.09 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.13-.29-.21-.61-.37Z"
                  />
                </svg>
                WhatsApp
              </span>
            </a>
          )}
          <button type="button" className="btn btn-secondary" onClick={loadInformes}>
            Actualizar
          </button>
        </div>
        {loading ? (
          <p>{"Cargando" + ELLIPSIS}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Venta</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Pago</th>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th>Marca</th>
                  <th>Color</th>
                  <th>P. unit.</th>
                  <th>Proveedor</th>
                  <th>{T.telefono} prov.</th>
                </tr>
              </thead>
              <tbody>
                {informes.map((r, i) => (
                  <tr key={`${r.idVenta}-${r.idProducto}-${i}`}>
                    <td>{r.idVenta}</td>
                    <td>{new Date(r.fechaVenta).toLocaleString("es")}</td>
                    <td>{labelCliente(r.nombreCliente)}</td>
                    <td>{labelMedioPago(r.medioPago)}</td>
                    <td>{r.descripcionProducto}</td>
                    <td>{r.tipoPrenda ?? EM}</td>
                    <td>{r.marca ?? EM}</td>
                    <td>{r.color ?? EM}</td>
                    <td>${r.precioUnitario.toFixed(2)}</td>
                    <td>{r.nombreProveedor}</td>
                    <td>{r.telefonoProveedor ?? EM}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {informes.length === 0 && <p className="muted">No hay datos.</p>}
          </div>
        )}
        {msg && !loading && <p className="err">{msg}</p>}
      </section>

      <section className="card">
        <h2>Movimientos de efectivo en caja</h2>
        <p className="muted">
          Ingresos y egresos registrados desde la caja
          {mes ? ` (${mes})` : ""}.
        </p>
        {movimientosCaja && (
          <p className="total-inline" style={{ marginBottom: "1rem" }}>
            <strong>
              Ingresos: ${movimientosCaja.totalIngresos.toFixed(2)} · Egresos: $
              {movimientosCaja.totalEgresos.toFixed(2)} · Neto: ${movimientosCaja.neto.toFixed(2)}
            </strong>
          </p>
        )}
        {loading ? (
          <p>{"Cargando" + ELLIPSIS}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Concepto</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {(movimientosCaja?.movimientos ?? []).map((m) => (
                  <tr key={m.id}>
                    <td>{new Date(m.fecha).toLocaleString("es")}</td>
                    <td className={m.tipo === "ingreso" ? "caja-mov-ingreso" : "caja-mov-egreso"}>
                      {m.tipo === "ingreso" ? "Ingreso" : "Egreso"}
                    </td>
                    <td>{m.concepto ?? EM}</td>
                    <td>
                      {m.tipo === "egreso" ? "−" : "+"}${m.monto.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(movimientosCaja?.movimientos.length ?? 0) === 0 && (
              <p className="muted">No hay movimientos de caja en este período.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}