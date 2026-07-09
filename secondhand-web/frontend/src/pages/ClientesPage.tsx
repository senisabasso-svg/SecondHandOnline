import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { EM, ELLIPSIS } from "../lib/uiText";

type Cliente = {
  id: number;
  nombre: string;
  tipoDocumento: string;
  numeroDocumento: string;
  tieneCuentaCorriente: boolean;
};

const TIPOS_DOC = [
  { value: "cedula", label: "Cédula" },
  { value: "rut", label: "RUT" },
  { value: "otro", label: "Otro" },
] as const;

function labelTipoDoc(t: string) {
  return TIPOS_DOC.find((x) => x.value === t)?.label ?? t;
}

export default function ClientesPage() {
  const [rows, setRows] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ nombre: "", tipoDocumento: "cedula", numeroDocumento: "" });
  const [formEdit, setFormEdit] = useState({ nombre: "", tipoDocumento: "cedula", numeroDocumento: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api<Cliente[]>("/api/clientes"));
    } catch (e) {
      setMsg(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (c: Cliente) => {
    setEditId(c.id);
    setFormEdit({
      nombre: c.nombre,
      tipoDocumento: c.tipoDocumento,
      numeroDocumento: c.numeroDocumento,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => setEditId(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!form.nombre.trim() || !form.numeroDocumento.trim()) {
      setMsg("Nombre y número de documento son obligatorios.");
      return;
    }
    try {
      await api("/api/clientes", {
        method: "POST",
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          tipoDocumento: form.tipoDocumento,
          numeroDocumento: form.numeroDocumento.trim(),
        }),
      });
      setForm({ nombre: "", tipoDocumento: "cedula", numeroDocumento: "" });
      await load();
      setMsg("Cliente agregado.");
    } catch (err) {
      setMsg(String(err));
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setMsg(null);
    try {
      await api(`/api/clientes/${editId}`, {
        method: "PUT",
        body: JSON.stringify({
          nombre: formEdit.nombre.trim(),
          tipoDocumento: formEdit.tipoDocumento,
          numeroDocumento: formEdit.numeroDocumento.trim(),
        }),
      });
      await load();
      setEditId(null);
      setMsg("Cliente actualizado.");
    } catch (err) {
      setMsg(String(err));
    }
  };

  return (
    <div className="page">
      {editId ? (
        <section className="card">
          <h2>Editar cliente #{editId}</h2>
          <form className="form-grid" onSubmit={saveEdit}>
            <label>
              Nombre *
              <input
                value={formEdit.nombre}
                onChange={(e) => setFormEdit((f) => ({ ...f, nombre: e.target.value }))}
                required
              />
            </label>
            <label>
              Tipo documento
              <select
                value={formEdit.tipoDocumento}
                onChange={(e) => setFormEdit((f) => ({ ...f, tipoDocumento: e.target.value }))}
              >
                {TIPOS_DOC.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Número documento *
              <input
                value={formEdit.numeroDocumento}
                onChange={(e) => setFormEdit((f) => ({ ...f, numeroDocumento: e.target.value }))}
                required
              />
            </label>
            <div className="form-actions" style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit" className="btn btn-primary">
                Guardar cambios
              </button>
              <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                Cancelar
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="card">
          <h2>Nuevo cliente</h2>
          <form className="form-grid" onSubmit={submit}>
            <label>
              Nombre *
              <input
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                required
              />
            </label>
            <label>
              Tipo documento
              <select
                value={form.tipoDocumento}
                onChange={(e) => setForm((f) => ({ ...f, tipoDocumento: e.target.value }))}
              >
                {TIPOS_DOC.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Número documento *
              <input
                value={form.numeroDocumento}
                onChange={(e) => setForm((f) => ({ ...f, numeroDocumento: e.target.value }))}
                required
              />
            </label>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Guardar
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card mt-lg">
        <h2>Clientes</h2>
        {loading ? (
          <p>Cargando{ELLIPSIS}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Documento</th>
                  <th>Número</th>
                  <th>Cuenta corriente</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.nombre}</td>
                    <td>{labelTipoDoc(r.tipoDocumento)}</td>
                    <td>{r.numeroDocumento}</td>
                    <td>{r.tieneCuentaCorriente ? "Sí" : "No"}</td>
                    <td>
                      <button type="button" className="btn btn-ghost" onClick={() => startEdit(r)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="muted">No hay clientes registrados.</p>}
          </div>
        )}
        <button type="button" className="btn btn-secondary mt" onClick={load}>
          Actualizar
        </button>
      </section>
      {msg && <p className={msg.includes("agregado") || msg.includes("actualizado") ? "ok" : "err"}>{msg}</p>}
    </div>
  );
}
