import { useCallback, useEffect, useState } from "react";
import { api, getApiBase } from "../api";
import { ELLIPSIS } from "../lib/uiText";

type Slot = {
  id: number | null;
  orden: number;
  nombre: string;
  precio: number;
  descripcion: string | null;
  imagen: string | null;
  updatedAt: string | null;
};

type WebVistasResponse = {
  idSecond: number;
  max: number;
  endpointPublico: string;
  prendas: Slot[];
};

type Draft = {
  nombre: string;
  precio: string;
  descripcion: string;
  imagen: string | null;
};

function slotToDraft(s: Slot): Draft {
  return {
    nombre: s.nombre || "",
    precio: s.id != null ? String(s.precio) : "",
    descripcion: s.descripcion || "",
    imagen: s.imagen,
  };
}

function emptyDraft(): Draft {
  return { nombre: "", precio: "", descripcion: "", imagen: null };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}

export default function WebVistasPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [endpointPublico, setEndpointPublico] = useState("");
  const [idSecond, setIdSecond] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingOrden, setSavingOrden] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgOk, setMsgOk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<WebVistasResponse>("/api/web-vistas");
      setSlots(data.prendas);
      setDrafts(data.prendas.map(slotToDraft));
      setEndpointPublico(data.endpointPublico);
      setIdSecond(data.idSecond);
    } catch (e) {
      setMsg(String(e));
      setMsgOk(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateDraft = (index: number, patch: Partial<Draft>) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const onPickImage = async (index: number, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMsg("Solo se permiten archivos de imagen.");
      setMsgOk(false);
      return;
    }
    if (file.size > 4_500_000) {
      setMsg("La imagen supera ~4,5 MB. Elegí una más liviana.");
      setMsgOk(false);
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      updateDraft(index, { imagen: dataUrl });
    } catch (e) {
      setMsg(String(e));
      setMsgOk(false);
    }
  };

  const saveSlot = async (orden: number, index: number) => {
    const d = drafts[index];
    if (!d) return;
    setMsg(null);
    if (!d.nombre.trim()) {
      setMsg(`Prenda ${orden}: el nombre es obligatorio.`);
      setMsgOk(false);
      return;
    }
    const precio = Number(d.precio);
    if (Number.isNaN(precio) || precio < 0) {
      setMsg(`Prenda ${orden}: precio inválido.`);
      setMsgOk(false);
      return;
    }
    setSavingOrden(orden);
    try {
      await api(`/api/web-vistas/${orden}`, {
        method: "PUT",
        body: JSON.stringify({
          nombre: d.nombre.trim(),
          precio,
          descripcion: d.descripcion.trim() || null,
          imagen: d.imagen,
        }),
      });
      await load();
      setMsg(`Prenda ${orden} guardada.`);
      setMsgOk(true);
    } catch (e) {
      setMsg(String(e));
      setMsgOk(false);
    } finally {
      setSavingOrden(null);
    }
  };

  const clearSlot = async (orden: number, index: number) => {
    setSavingOrden(orden);
    setMsg(null);
    try {
      await api(`/api/web-vistas/${orden}`, { method: "DELETE" });
      updateDraft(index, emptyDraft());
      await load();
      setMsg(`Prenda ${orden} eliminada de la vitrina.`);
      setMsgOk(true);
    } catch (e) {
      setMsg(String(e));
      setMsgOk(false);
    } finally {
      setSavingOrden(null);
    }
  };

  const urlCompleta = endpointPublico
    ? `${getApiBase() || "(URL del API)"}${endpointPublico}`
    : "";

  return (
    <div className="page">
      <section className="card">
        <h2>Web vistas</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Hasta 5 prendas de vitrina para la landing (no están al inventario ni a ventas).
        </p>
        {idSecond != null && (
          <div className="web-vistas-endpoint">
            <p style={{ margin: "0 0 0.35rem" }}>
              <strong>Endpoint público</strong> (sin login) — tienda #{idSecond}
            </p>
            <code className="web-vistas-code">{urlCompleta}</code>
            <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.85rem" }}>
              Método: <strong>GET</strong> · Content-Type respuesta: <code>application/json</code>
            </p>
          </div>
        )}
        {msg && <p className={msgOk ? "ok" : "err"}>{msg}</p>}
      </section>

      {loading ? (
        <p className="muted">{"Cargando" + ELLIPSIS}</p>
      ) : (
        <div className="web-vistas-grid">
          {slots.map((slot, index) => {
            const d = drafts[index] || emptyDraft();
            const busy = savingOrden === slot.orden;
            return (
              <section className="card web-vistas-slot" key={slot.orden}>
                <h3>Prenda {slot.orden}</h3>
                <div className="web-vistas-preview">
                  {d.imagen ? (
                    <img src={d.imagen} alt={d.nombre || `Prenda ${slot.orden}`} />
                  ) : (
                    <span className="muted">Sin imagen</span>
                  )}
                </div>
                <label>
                  Nombre *
                  <input
                    value={d.nombre}
                    onChange={(e) => updateDraft(index, { nombre: e.target.value })}
                    placeholder="Ej: Campera denim"
                  />
                </label>
                <label>
                  Precio *
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={d.precio}
                    onChange={(e) => updateDraft(index, { precio: e.target.value })}
                    placeholder="0"
                  />
                </label>
                <label>
                  Descripción
                  <textarea
                    rows={3}
                    value={d.descripcion}
                    onChange={(e) => updateDraft(index, { descripcion: e.target.value })}
                    placeholder="Breve texto para la landing"
                  />
                </label>
                <label>
                  Imagen
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onPickImage(index, e.target.files?.[0] ?? null)}
                  />
                </label>
                <div className="form-actions" style={{ marginTop: "0.75rem" }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => saveSlot(slot.orden, index)}
                  >
                    {busy ? "Guardando" + ELLIPSIS : "Guardar"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy || (!slot.id && !d.nombre && !d.imagen)}
                    onClick={() => clearSlot(slot.orden, index)}
                  >
                    Vaciar
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
