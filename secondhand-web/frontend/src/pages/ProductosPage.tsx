import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { EM, ELLIPSIS, T } from "../lib/uiText";
import type { Producto } from "./VentaPage";

type Proveedor = { id: number; nombre: string; telefono: string | null; email: string | null };

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    descripcion: "",
    tipoPrenda: "",
    marca: "",
    color: "",
    condicion: "",
    precioVenta: "",
    talle: "",
    idProveedor: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, provs] = await Promise.all([
        api<Producto[]>("/api/productos"),
        api<Proveedor[]>("/api/proveedores"),
      ]);
      setProductos(prods);
      setProveedores(provs);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!form.descripcion || !form.precioVenta || !form.idProveedor) {
      setMsg(T.completaProducto);
      return;
    }
    try {
      await api("/api/productos", {
        method: "POST",
        body: JSON.stringify({
          descripcion: form.descripcion,
          tipoPrenda: form.tipoPrenda || null,
          marca: form.marca || null,
          color: form.color || null,
          condicion: form.condicion || null,
          precioVenta: Number(form.precioVenta),
          talle: form.talle || null,
          idProveedor: Number(form.idProveedor),
          estado: "disponible",
        }),
      });
      setForm({
        descripcion: "",
        tipoPrenda: "",
        marca: "",
        color: "",
        condicion: "",
        precioVenta: "",
        talle: "",
        idProveedor: form.idProveedor,
      });
      await load();
      setMsg("Producto agregado.");
    } catch (e) {
      setMsg(String(e));
    }
  };

  return (
    <div className="page">
      <section className="card">
        <h2>Nuevo producto</h2>
        <form className="form-grid" onSubmit={submit}>
          <label>
            {T.descripcion} *
            <input
              value={form.descripcion}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              required
            />
          </label>
          <label>
            Tipo de prenda
            <input value={form.tipoPrenda} onChange={(e) => setForm((f) => ({ ...f, tipoPrenda: e.target.value }))} />
          </label>
          <label>
            Marca
            <input value={form.marca} onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))} />
          </label>
          <label>
            Color
            <input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
          </label>
          <label>
            {T.condicion}
            <input value={form.condicion} onChange={(e) => setForm((f) => ({ ...f, condicion: e.target.value }))} />
          </label>
          <label>
            Precio venta *
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.precioVenta}
              onChange={(e) => setForm((f) => ({ ...f, precioVenta: e.target.value }))}
              required
            />
          </label>
          <label>
            Talle
            <input value={form.talle} onChange={(e) => setForm((f) => ({ ...f, talle: e.target.value }))} />
          </label>
          <label>
            Proveedor *
            <select
              value={form.idProveedor}
              onChange={(e) => setForm((f) => ({ ...f, idProveedor: e.target.value }))}
              required
            >
              <option value="">{T.elegirProveedor}</option>
              {proveedores.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.nombre}
                </option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Guardar
            </button>
          </div>
        </form>
        {msg && <p className={msg.includes("agregado") ? "ok" : "err"}>{msg}</p>}
      </section>

      <section className="card mt-lg">
        <h2>Listado de productos</h2>
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
                  <th>Cond.</th>
                  <th>Talle</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th>Proveedor</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.descripcion}</td>
                    <td>{p.tipoPrenda ?? EM}</td>
                    <td>{p.marca ?? EM}</td>
                    <td>{p.color ?? EM}</td>
                    <td>{p.condicion ?? EM}</td>
                    <td>{p.talle ?? EM}</td>
                    <td>${p.precioVenta.toFixed(2)}</td>
                    <td>{p.estado}</td>
                    <td>{p.nombreProveedor ?? EM}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button type="button" className="btn btn-secondary mt" onClick={load}>
          Actualizar
        </button>
      </section>
    </div>
  );
}