import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { EM, ELLIPSIS, T } from "../lib/uiText";

type Informe = {
  idVenta: number;
  fechaVenta: string;
  totalVenta: number;
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

type Proveedor = { id: number; nombre: string };

export default function InformesPage() {
  const [informes, setInformes] = useState<Informe[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [filtro, setFiltro] = useState<string>("");
  const [mes, setMes] = useState<string>("");
  const [totalProv, setTotalProv] = useState<number | null>(null);
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
      const qs = mes ? `?month=${encodeURIComponent(mes)}` : "";
      if (id) {
        const [rows, tot] = await Promise.all([
          api<Informe[]>(`/api/informes/proveedor/${id}${qs}`),
          api<{ total: number }>(`/api/informes/proveedor/${id}/total${qs}`),
        ]);
        setInformes(rows);
        setTotalProv(tot.total);
      } else {
        const rows = await api<Informe[]>(`/api/informes${qs}`);
        setInformes(rows);
        setTotalProv(null);
      }
    } catch (e) {
      setMsg(String(e));
    } finally {
      setLoading(false);
    }
  }, [filtro, mes]);

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
          {filtro && totalProv !== null && (
            <p className="total-inline">
              <strong>Total filtrado: ${totalProv.toFixed(2)}</strong>
            </p>
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
    </div>
  );
}