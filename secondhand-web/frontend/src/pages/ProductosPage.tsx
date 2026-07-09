import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { EM, ELLIPSIS, T } from "../lib/uiText";
import type { Producto } from "./VentaPage";

type Proveedor = { id: number; nombre: string; telefono: string | null; email: string | null };

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const [form, setForm] = useState({
    descripcion: "",
    tipoPrenda: "",
    marca: "",
    color: "",
    condicion: "",
    precioVenta: "",
    talle: "",
    idProveedor: "",
    cantidad: "1",
  });
  const [formEdit, setFormEdit] = useState({
    descripcion: "",
    tipoPrenda: "",
    marca: "",
    color: "",
    condicion: "",
    precioVenta: "",
    talle: "",
    idProveedor: "",
    estado: "disponible",
    cantidad: "",
  });
  const [editTieneStock, setEditTieneStock] = useState(false);

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

  const productosFiltrados = useMemo(() => {
    const provNum = Number(filtroProveedor);
    if (Number.isNaN(provNum) || filtroProveedor === "") return productos;
    return productos.filter((p) => p.idProveedor === provNum);
  }, [productos, filtroProveedor]);

  const startEdit = (p: Producto) => {
    setEditId(p.id);
    setEditTieneStock(p.cantidad != null);
    setFormEdit({
      descripcion: p.descripcion || "",
      tipoPrenda: p.tipoPrenda || "",
      marca: p.marca || "",
      color: p.color || "",
      condicion: p.condicion || "",
      precioVenta: String(p.precioVenta ?? ""),
      talle: p.talle || "",
      idProveedor: String(p.idProveedor ?? ""),
      estado: p.estado || "disponible",
      cantidad: p.cantidad != null ? String(p.cantidad) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditTieneStock(false);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setMsg(null);
    try {
      const body: Record<string, unknown> = {
        descripcion: formEdit.descripcion,
        tipoPrenda: formEdit.tipoPrenda || null,
        marca: formEdit.marca || null,
        color: formEdit.color || null,
        condicion: formEdit.condicion || null,
        precioVenta: Number(formEdit.precioVenta),
        talle: formEdit.talle || null,
        idProveedor: Number(formEdit.idProveedor),
        estado: formEdit.estado,
      };
      if (editTieneStock) body.cantidad = Number(formEdit.cantidad);
      await api(`/api/productos/${editId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      await load();
      setMsg("Producto actualizado.");
      setEditId(null);
    } catch (e) {
      setMsg(String(e));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!form.descripcion || !form.precioVenta || !form.idProveedor || !form.cantidad) {
      setMsg(T.completaProducto);
      return;
    }
    const qty = Number(form.cantidad);
    if (!Number.isInteger(qty) || qty < 1) {
      setMsg("La cantidad debe ser un entero mayor o igual a 1.");
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
          cantidad: qty,
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
        cantidad: "1",
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
        <h2>{editId ? `Editar producto #${editId}` : "Nuevo producto"}</h2>
        <form className="form-grid" onSubmit={editId ? saveEdit : submit}>
          <label>
            {T.descripcion} *
            <input
              value={editId ? formEdit.descripcion : form.descripcion}
              onChange={(e) =>
                editId
                  ? setFormEdit((f) => ({ ...f, descripcion: e.target.value }))
                  : setForm((f) => ({ ...f, descripcion: e.target.value }))
              }
              required
            />
          </label>
          <label>
            Tipo de prenda
            <input
              value={editId ? formEdit.tipoPrenda : form.tipoPrenda}
              onChange={(e) =>
                editId ? setFormEdit((f) => ({ ...f, tipoPrenda: e.target.value })) : setForm((f) => ({ ...f, tipoPrenda: e.target.value }))
              }
            />
          </label>
          <label>
            Marca
            <input
              value={editId ? formEdit.marca : form.marca}
              onChange={(e) =>
                editId ? setFormEdit((f) => ({ ...f, marca: e.target.value })) : setForm((f) => ({ ...f, marca: e.target.value }))
              }
            />
          </label>
          <label>
            Color
            <input
              value={editId ? formEdit.color : form.color}
              onChange={(e) =>
                editId ? setFormEdit((f) => ({ ...f, color: e.target.value })) : setForm((f) => ({ ...f, color: e.target.value }))
              }
            />
          </label>
          <label>
            {T.condicion}
            <input
              value={editId ? formEdit.condicion : form.condicion}
              onChange={(e) =>
                editId
                  ? setFormEdit((f) => ({ ...f, condicion: e.target.value }))
                  : setForm((f) => ({ ...f, condicion: e.target.value }))
              }
            />
          </label>
          <label>
            Precio venta *
            <input
              type="number"
              step="0.01"
              min="0"
              value={editId ? formEdit.precioVenta : form.precioVenta}
              onChange={(e) =>
                editId
                  ? setFormEdit((f) => ({ ...f, precioVenta: e.target.value }))
                  : setForm((f) => ({ ...f, precioVenta: e.target.value }))
              }
              required
            />
          </label>
          <label>
            Talle
            <input
              value={editId ? formEdit.talle : form.talle}
              onChange={(e) =>
                editId ? setFormEdit((f) => ({ ...f, talle: e.target.value })) : setForm((f) => ({ ...f, talle: e.target.value }))
              }
            />
          </label>
          {!editId && (
            <label>
              Cantidad *
              <input
                type="number"
                min="1"
                step="1"
                value={form.cantidad}
                onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))}
                required
              />
            </label>
          )}
          {editId && editTieneStock && (
            <label>
              Cantidad
              <input
                type="number"
                min="0"
                step="1"
                value={formEdit.cantidad}
                onChange={(e) => setFormEdit((f) => ({ ...f, cantidad: e.target.value }))}
                required
              />
            </label>
          )}
          <label>
            Proveedor *
            <select
              value={editId ? formEdit.idProveedor : form.idProveedor}
              onChange={(e) =>
                editId
                  ? setFormEdit((f) => ({ ...f, idProveedor: e.target.value }))
                  : setForm((f) => ({ ...f, idProveedor: e.target.value }))
              }
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
          {editId && (
            <label>
              Estado
              <select value={formEdit.estado} onChange={(e) => setFormEdit((f) => ({ ...f, estado: e.target.value }))}>
                <option value="disponible">disponible</option>
                <option value="vendido">vendido</option>
              </select>
            </label>
          )}
          <div className="form-actions">
            {editId ? (
              <>
                <button type="submit" className="btn btn-primary">Guardar cambios</button>
                <button type="button" className="btn btn-secondary" onClick={cancelEdit}>Cancelar</button>
              </>
            ) : (
              <button type="submit" className="btn btn-primary">Guardar</button>
            )}
          </div>
        </form>
        {msg && <p className={msg.includes("agregado") || msg.includes("actualizado") ? "ok" : "err"}>{msg}</p>}
      </section>

      <section className="card mt-lg">
        <h2>Listado de productos</h2>
        <div className="filter-row">
          <label>
            <span className="muted">Filtrar por proveedor</span>
            <select value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)}>
              <option value="">Todos</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
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
                  <th>Cond.</th>
                  <th>Talle</th>
                  <th>Precio</th>
                  <th>Cant.</th>
                  <th>Estado</th>
                  <th>Proveedor</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.descripcion}</td>
                    <td>{p.tipoPrenda ?? EM}</td>
                    <td>{p.marca ?? EM}</td>
                    <td>{p.color ?? EM}</td>
                    <td>{p.condicion ?? EM}</td>
                    <td>{p.talle ?? EM}</td>
                    <td>${p.precioVenta.toFixed(2)}</td>
                    <td>{p.cantidad != null ? p.cantidad : 1}</td>
                    <td>{p.estado}</td>
                    <td>{p.nombreProveedor ?? EM}</td>
                    <td>
                      <button type="button" className="btn btn-ghost" onClick={() => startEdit(p)}>
                        Editar
                      </button>
                    </td>
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