import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { EM, ELLIPSIS } from "../lib/uiText";

type Cliente = {
  id: number;
  nombre: string;
  tipoDocumento: string;
  numeroDocumento: string;
  tieneCuentaCorriente: boolean;
};

type CuentaCorriente = {
  id: number;
  idCliente: number;
  nombreCliente: string;
  tipoDocumento: string;
  numeroDocumento: string;
  limite: number;
  saldo: number;
  disponible: number;
};

type MovimientoCC = {
  id: number;
  fecha: string;
  tipo: "cargo" | "entrega";
  monto: number;
  concepto: string | null;
  idVenta: number | null;
  ventaNumero: number | null;
};

export default function CuentasCorrientesPage() {
  const [cuentas, setCuentas] = useState<CuentaCorriente[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [formAlta, setFormAlta] = useState({ idCliente: "", limite: "" });
  const [editLimiteId, setEditLimiteId] = useState<number | null>(null);
  const [editLimite, setEditLimite] = useState("");
  const [entregaId, setEntregaId] = useState<number | null>(null);
  const [entregaForm, setEntregaForm] = useState({ monto: "", concepto: "" });
  const [movimientosId, setMovimientosId] = useState<number | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoCC[]>([]);
  const [loadingMov, setLoadingMov] = useState(false);

  const clientesSinCuenta = useMemo(
    () => clientes.filter((c) => !c.tieneCuentaCorriente),
    [clientes]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const [cc, cls] = await Promise.all([
        api<CuentaCorriente[]>("/api/cuentas-corrientes"),
        api<Cliente[]>("/api/clientes"),
      ]);
      setCuentas(cc);
      setClientes(cls);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const crearCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!formAlta.idCliente) {
      setMsg("Seleccione un cliente.");
      return;
    }
    const lim = Number(formAlta.limite);
    if (!Number.isFinite(lim) || lim <= 0) {
      setMsg("Ingrese un límite válido mayor a cero.");
      return;
    }
    try {
      await api("/api/cuentas-corrientes", {
        method: "POST",
        body: JSON.stringify({ idCliente: Number(formAlta.idCliente), limite: lim }),
      });
      setFormAlta({ idCliente: "", limite: "" });
      await load();
      setMsg("Cuenta corriente creada.");
    } catch (err) {
      setMsg(String(err));
    }
  };

  const guardarLimite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLimiteId) return;
    const lim = Number(editLimite);
    if (!Number.isFinite(lim) || lim <= 0) {
      setMsg("Ingrese un límite válido.");
      return;
    }
    try {
      await api(`/api/cuentas-corrientes/${editLimiteId}`, {
        method: "PUT",
        body: JSON.stringify({ limite: lim }),
      });
      setEditLimiteId(null);
      await load();
      setMsg("Límite actualizado.");
    } catch (err) {
      setMsg(String(err));
    }
  };

  const registrarEntrega = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entregaId) return;
    const monto = Number(entregaForm.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
      setMsg("Ingrese un monto válido.");
      return;
    }
    try {
      const cuentaId = entregaId;
      await api(`/api/cuentas-corrientes/${entregaId}/entregas`, {
        method: "POST",
        body: JSON.stringify({
          monto,
          concepto: entregaForm.concepto.trim() || null,
        }),
      });
      setEntregaId(null);
      setEntregaForm({ monto: "", concepto: "" });
      if (movimientosId === cuentaId && cuentaId) {
        const movs = await api<MovimientoCC[]>(`/api/cuentas-corrientes/${cuentaId}/movimientos`);
        setMovimientos(movs);
      }
      await load();
      setMsg("Entrega registrada.");
    } catch (err) {
      setMsg(String(err));
    }
  };

  const verMovimientos = async (id: number) => {
    if (movimientosId === id) {
      setMovimientosId(null);
      setMovimientos([]);
      return;
    }
    setLoadingMov(true);
    setMovimientosId(id);
    try {
      setMovimientos(await api<MovimientoCC[]>(`/api/cuentas-corrientes/${id}/movimientos`));
    } catch (e) {
      setMsg(String(e));
      setMovimientosId(null);
    } finally {
      setLoadingMov(false);
    }
  };

  const cuentaEntrega = cuentas.find((c) => c.id === entregaId);

  return (
    <div className="page">
      <section className="card">
        <h2>Nueva cuenta corriente</h2>
        <p className="muted">Una cuenta por cliente, con límite de gasto.</p>
        <form className="form-grid" onSubmit={crearCuenta}>
          <label>
            Cliente sin cuenta
            <select
              value={formAlta.idCliente}
              onChange={(e) => setFormAlta((f) => ({ ...f, idCliente: e.target.value }))}
              required
            >
              <option value="">— Seleccione —</option>
              {clientesSinCuenta.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.numeroDocumento})
                </option>
              ))}
            </select>
          </label>
          <label>
            Límite de gasto *
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={formAlta.limite}
              onChange={(e) => setFormAlta((f) => ({ ...f, limite: e.target.value }))}
              required
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={clientesSinCuenta.length === 0}>
              Crear cuenta
            </button>
          </div>
        </form>
        {clientesSinCuenta.length === 0 && !loading && (
          <p className="muted">Todos los clientes ya tienen cuenta corriente o no hay clientes.</p>
        )}
      </section>

      {entregaId && cuentaEntrega && (
        <section className="card mt-lg">
          <h2>Entrega — {cuentaEntrega.nombreCliente}</h2>
          <p className="muted">
            Saldo deudor: <strong>${cuentaEntrega.saldo.toFixed(2)}</strong>
          </p>
          <form className="form-grid" onSubmit={registrarEntrega}>
            <label>
              Monto *
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={cuentaEntrega.saldo}
                value={entregaForm.monto}
                onChange={(e) => setEntregaForm((f) => ({ ...f, monto: e.target.value }))}
                required
              />
            </label>
            <label>
              Concepto
              <input
                value={entregaForm.concepto}
                onChange={(e) => setEntregaForm((f) => ({ ...f, concepto: e.target.value }))}
                placeholder="Ej: Pago parcial"
              />
            </label>
            <div className="form-actions" style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit" className="btn btn-accent">
                Registrar entrega
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setEntregaId(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      {editLimiteId && (
        <section className="card mt-lg">
          <h2>Editar límite</h2>
          <form className="form-grid" onSubmit={guardarLimite} style={{ maxWidth: 320 }}>
            <label>
              Nuevo límite
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={editLimite}
                onChange={(e) => setEditLimite(e.target.value)}
                required
              />
            </label>
            <div className="form-actions" style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit" className="btn btn-primary">
                Guardar
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditLimiteId(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card mt-lg">
        <h2>Cuentas corrientes</h2>
        {loading ? (
          <p>Cargando{ELLIPSIS}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Documento</th>
                  <th>Límite</th>
                  <th>Saldo (deuda)</th>
                  <th>Disponible</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cuentas.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nombreCliente}</td>
                    <td>
                      {c.numeroDocumento}
                      <span className="muted"> ({c.tipoDocumento})</span>
                    </td>
                    <td>${c.limite.toFixed(2)}</td>
                    <td className="caja-mov-egreso">${c.saldo.toFixed(2)}</td>
                    <td className="caja-mov-ingreso">${c.disponible.toFixed(2)}</td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => {
                            setEditLimiteId(c.id);
                            setEditLimite(String(c.limite));
                          }}
                        >
                          Límite
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={c.saldo <= 0}
                          onClick={() => {
                            setEntregaId(c.id);
                            setEntregaForm({ monto: "", concepto: "" });
                          }}
                        >
                          Entrega
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => verMovimientos(c.id)}>
                          {movimientosId === c.id ? "Ocultar" : "Movimientos"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cuentas.length === 0 && <p className="muted">No hay cuentas corrientes.</p>}
          </div>
        )}
        {movimientosId && (
          <div className="table-wrap caja-ventas-detalle" style={{ marginTop: "1rem" }}>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>Movimientos</h3>
            {loadingMov ? (
              <p className="muted">Cargando{ELLIPSIS}</p>
            ) : (
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
                  {movimientos.map((m) => (
                    <tr key={m.id}>
                      <td>{new Date(m.fecha).toLocaleString("es")}</td>
                      <td className={m.tipo === "entrega" ? "caja-mov-ingreso" : "caja-mov-egreso"}>
                        {m.tipo === "entrega" ? "Entrega" : "Cargo"}
                      </td>
                      <td>
                        {m.concepto ?? EM}
                        {m.ventaNumero ? ` (Venta #${m.ventaNumero})` : ""}
                      </td>
                      <td>
                        {m.tipo === "entrega" ? "−" : "+"}${m.monto.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {movimientos.length === 0 && !loadingMov && <p className="muted">Sin movimientos.</p>}
          </div>
        )}
        <button type="button" className="btn btn-secondary mt" onClick={load}>
          Actualizar
        </button>
      </section>
      {msg && (
        <p
          className={
            msg.includes("creada") || msg.includes("actualizado") || msg.includes("registrada") ? "ok" : "err"
          }
        >
          {msg}
        </p>
      )}
    </div>
  );
}
