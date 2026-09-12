import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { ELLIPSIS } from "../lib/uiText";

type MedioReintegro = "efectivo" | "tarjeta" | "cuenta_corriente";

type VentaItemDev = {
  id: number;
  idProducto: number;
  precioUnitario: number;
  descripcion: string | null;
  marca: string | null;
  yaDevuelto: boolean;
};

type VentaDev = {
  id: number;
  fecha: string;
  total: number;
  medioPago: string | null;
  idCliente: number | null;
  nombreCliente: string | null;
  items: VentaItemDev[];
};

type DevolucionRow = {
  id: number;
  idVenta: number;
  fecha: string;
  monto: number;
  medioReintegro: string;
  motivo: string | null;
  items: { id: number; idProducto: number; precioUnitario: number; descripcion: string | null }[];
};

function labelMedio(m?: string | null) {
  if (m === "efectivo") return "Efectivo";
  if (m === "tarjeta") return "Tarjeta";
  if (m === "cuenta_corriente") return "Cuenta corriente";
  return m || "—";
}

export default function DevolucionesPage() {
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<VentaDev[]>([]);
  const [venta, setVenta] = useState<VentaDev | null>(null);
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [medio, setMedio] = useState<MedioReintegro>("efectivo");
  const [motivo, setMotivo] = useState("");
  const [historial, setHistorial] = useState<DevolucionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadHistorial = useCallback(async () => {
    try {
      setHistorial(await api<DevolucionRow[]>("/api/devoluciones"));
    } catch (e) {
      setMsg(String(e));
    }
  }, []);

  useEffect(() => {
    loadHistorial();
  }, [loadHistorial]);

  const buscar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setMsg(null);
    setVenta(null);
    setSeleccion(new Set());
    setResultados([]);
    if (!q.trim()) return;
    setLoading(true);
    try {
      const rows = await api<VentaDev[]>(`/api/devoluciones/buscar?q=${encodeURIComponent(q.trim())}`);
      setResultados(rows);
      if (rows.length === 1) {
        elegirVenta(rows[0]);
      } else if (rows.length === 0) {
        setMsg("No se encontró ninguna venta con ese número o producto.");
      }
    } catch (err) {
      setMsg(String(err));
    } finally {
      setLoading(false);
    }
  };

  const elegirVenta = (v: VentaDev) => {
    setVenta(v);
    setSeleccion(new Set());
    const m = (v.medioPago || "efectivo").toLowerCase() as MedioReintegro;
    setMedio(m === "tarjeta" || m === "cuenta_corriente" ? m : "efectivo");
    setMsg(null);
  };

  const toggleItem = (id: number, yaDevuelto: boolean) => {
    if (yaDevuelto) return;
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalSeleccionado = useMemo(() => {
    if (!venta) return 0;
    return venta.items
      .filter((it) => seleccion.has(it.id))
      .reduce((s, it) => s + it.precioUnitario, 0);
  }, [venta, seleccion]);

  const confirmar = async () => {
    if (!venta || seleccion.size === 0) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await api<DevolucionRow>("/api/devoluciones", {
        method: "POST",
        body: JSON.stringify({
          idVenta: venta.id,
          ventaItemIds: [...seleccion],
          medioReintegro: medio,
          motivo: motivo.trim() || null,
        }),
      });
      setMsg(`Devolución #${res.id} registrada. Total reintegrado: $${res.monto.toFixed(2)}.`);
      setSeleccion(new Set());
      setMotivo("");
      const actualizada = await api<VentaDev>(`/api/devoluciones/venta/${venta.id}`);
      setVenta(actualizada);
      await loadHistorial();
    } catch (e) {
      setMsg(String(e));
    } finally {
      setSaving(false);
    }
  };

  const itemsDisponibles = venta?.items.filter((it) => !it.yaDevuelto) ?? [];

  return (
    <div className="page">
      <h2>Devoluciones</h2>
      <p className="muted">
        Buscá una venta por su número o por el ID de una prenda. La venta original no se borra: se registra la
        devolución, se restaura el stock y se ajusta el reintegro.
      </p>

      <section className="card">
        <form className="filter-row" onSubmit={buscar}>
          <label>
            Nº de venta o ID de prenda
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ej: 152 o 4664"
              inputMode="numeric"
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Buscando" + ELLIPSIS : "Buscar"}
          </button>
        </form>

        {resultados.length > 1 && (
          <div className="table-wrap" style={{ marginTop: "1rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Venta</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Pago</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((v) => (
                  <tr key={v.id}>
                    <td>#{v.id}</td>
                    <td>{new Date(v.fecha).toLocaleString("es-AR")}</td>
                    <td>{v.nombreCliente || "—"}</td>
                    <td>{labelMedio(v.medioPago)}</td>
                    <td>${v.total.toFixed(2)}</td>
                    <td>
                      <button type="button" className="btn btn-secondary" onClick={() => elegirVenta(v)}>
                        Elegir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {venta && (
        <section className="card" style={{ marginTop: "1rem" }}>
          <h3>
            Venta #{venta.id}{" "}
            <span className="muted" style={{ fontWeight: 400, fontSize: "0.9rem" }}>
              {new Date(venta.fecha).toLocaleString("es-AR")} · {labelMedio(venta.medioPago)}
              {venta.nombreCliente ? ` · ${venta.nombreCliente}` : ""}
            </span>
          </h3>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Producto</th>
                  <th>ID</th>
                  <th>Precio cobrado</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {venta.items.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={seleccion.has(it.id)}
                        disabled={it.yaDevuelto}
                        onChange={() => toggleItem(it.id, it.yaDevuelto)}
                      />
                    </td>
                    <td>
                      {it.descripcion}
                      {it.marca ? ` · ${it.marca}` : ""}
                    </td>
                    <td>#{it.idProducto}</td>
                    <td>${it.precioUnitario.toFixed(2)}</td>
                    <td>{it.yaDevuelto ? <span className="muted">Ya devuelta</span> : "Disponible"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {itemsDisponibles.length === 0 ? (
            <p className="muted">Todas las prendas de esta venta ya fueron devueltas.</p>
          ) : (
            <>
              <div className="form-grid" style={{ maxWidth: 480, marginTop: "1rem" }}>
                <label>
                  Medio de reintegro
                  <select
                    value={medio}
                    onChange={(e) => setMedio(e.target.value as MedioReintegro)}
                    disabled={saving}
                  >
                    <option value="efectivo">Efectivo (egreso de caja)</option>
                    <option value="tarjeta">Tarjeta (solo registro)</option>
                    <option value="cuenta_corriente" disabled={!venta.idCliente}>
                      Cuenta corriente
                      {!venta.idCliente ? " (venta sin cliente)" : ""}
                    </option>
                  </select>
                </label>
                <label>
                  Motivo (opcional)
                  <input
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ej: talle incorrecto"
                    disabled={saving}
                  />
                </label>
              </div>
              <p className="total" style={{ marginTop: "0.75rem" }}>
                <strong>Total a reintegrar: ${totalSeleccionado.toFixed(2)}</strong>
              </p>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-accent"
                  disabled={saving || seleccion.size === 0}
                  onClick={confirmar}
                >
                  {saving ? "Registrando" + ELLIPSIS : "Confirmar devolución"}
                </button>
              </div>
              {medio === "efectivo" && (
                <p className="muted" style={{ fontSize: "0.85rem" }}>
                  Requiere caja abierta. Se registrará un egreso por el monto.
                </p>
              )}
            </>
          )}
        </section>
      )}

      {msg && (
        <p className={msg.includes("registrada") || msg.includes("Devolución #") ? "ok" : "err"}>{msg}</p>
      )}

      <section className="card" style={{ marginTop: "1.25rem" }}>
        <h3>Historial reciente</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Dev. #</th>
                <th>Venta</th>
                <th>Fecha</th>
                <th>Prendas</th>
                <th>Reintegro</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((d) => (
                <tr key={d.id}>
                  <td>#{d.id}</td>
                  <td>#{d.idVenta}</td>
                  <td>{new Date(d.fecha).toLocaleString("es-AR")}</td>
                  <td>{d.items.map((i) => i.descripcion || `#${i.idProducto}`).join(", ")}</td>
                  <td>{labelMedio(d.medioReintegro)}</td>
                  <td>${d.monto.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {historial.length === 0 && <p className="muted">Todavía no hay devoluciones.</p>}
        </div>
      </section>
    </div>
  );
}
