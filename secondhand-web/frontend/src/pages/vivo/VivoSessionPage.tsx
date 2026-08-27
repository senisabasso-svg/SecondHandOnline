import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  CatalogoPrenda,
  Vivo,
  VivoItem,
  formatMoney,
  vivoApi,
} from "../../services/vivo";
import "./vivo.css";

function estadoBadge(estado: string) {
  return <span className={`vivo-badge vivo-badge-${estado}`}>{estado.replace("_", " ")}</span>;
}

function useToast() {
  const [toast, setToast] = useState("");
  const timer = useRef<number | null>(null);
  const show = useCallback((msg: string) => {
    setToast(msg);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(""), 4000);
  }, []);
  return { toast, show };
}

export default function VivoSessionPage() {
  const { id } = useParams();
  const vivoId = Number(id);
  const navigate = useNavigate();
  const { toast, showToast } = useToast();

  const [vivo, setVivo] = useState<Vivo | null>(null);
  const [catalogo, setCatalogo] = useState<CatalogoPrenda[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [usuarioInput, setUsuarioInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [cerrando, setCerrando] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const pendingRef = useRef<Promise<unknown>>(Promise.resolve());

  const enPantalla = useMemo(
    () => vivo?.items?.find((it) => it.estado === "en_pantalla") ?? null,
    [vivo]
  );

  const mostradas = useMemo(() => {
    if (!vivo?.items) return [];
    return [...vivo.items]
      .filter((it) => it.estado !== "en_pantalla")
      .sort((a, b) => b.orden - a.orden);
  }, [vivo]);

  const codigosPorProducto = useMemo(() => {
    const map = new Map<number, string>();
    for (const it of vivo?.items ?? []) {
      if (it.productoId) map.set(it.productoId, it.codigo);
    }
    return map;
  }, [vivo]);

  const catalogoFiltrado = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return catalogo.slice(0, 30);
    return catalogo.filter((p) => {
      const idStr = String(p.id);
      return (
        p.descripcion.toLowerCase().includes(q) ||
        (p.marca && p.marca.toLowerCase().includes(q)) ||
        idStr.includes(q)
      );
    });
  }, [busqueda, catalogo]);

  const load = useCallback(async () => {
    try {
      const [v, cat] = await Promise.all([vivoApi.get(vivoId), vivoApi.catalogo(vivoId)]);
      setVivo(v);
      setCatalogo(cat);
    } catch (e) {
      showToast(String(e));
    } finally {
      setLoading(false);
    }
  }, [vivoId, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.body.classList.add("vivo-compact-header");
    return () => document.body.classList.remove("vivo-compact-header");
  }, []);

  useEffect(() => {
    if (!vivo?.inicio) return;
    const tick = () => setElapsed(Date.now() - new Date(vivo.inicio).getTime());
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [vivo?.inicio]);

  function queueOp<T>(op: () => Promise<T>, rollback?: () => void): Promise<T> {
    const run = async () => {
      try {
        return await op();
      } catch (e) {
        if (rollback) rollback();
        showToast(String(e));
        throw e;
      }
    };
    pendingRef.current = pendingRef.current.then(run, run);
    return pendingRef.current as Promise<T>;
  }

  function formatTimer(ms: number) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const mm = m % 60;
    const ss = s % 60;
    if (h > 0) return `${h}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
    return `${mm}:${String(ss).padStart(2, "0")}`;
  }

  function patchVivoItem(updated: VivoItem) {
    setVivo((prev) => {
      if (!prev) return prev;
      const items = prev.items ? [...prev.items] : [];
      const idx = items.findIndex((i) => i.id === updated.id);
      if (idx >= 0) items[idx] = updated;
      else items.push(updated);
      return {
        ...prev,
        items,
        prendasMostradas: items.length,
        reservas: items.reduce((n, it) => n + it.reservas.length, 0),
      };
    });
  }

  async function mostrarPrenda(p: CatalogoPrenda) {
    const snapshot = vivo;
    const optimista: VivoItem = {
      id: -Date.now(),
      vivoId,
      productoId: p.id,
      codigo: "?",
      precioVivo: p.precio,
      descripcionLibre: null,
      estado: "en_pantalla",
      orden: (vivo?.items?.length ?? 0) + 1,
      createdAt: new Date().toISOString(),
      descripcion: p.descripcion,
      marca: p.marca,
      talle: p.talle,
      color: p.color,
      precioLista: p.precio,
      nombreProveedor: p.proveedorNombre,
      reservas: [],
    };
    setVivo((prev) => {
      if (!prev) return prev;
      const items = (prev.items ?? []).map((it) =>
        it.estado === "en_pantalla"
          ? {
              ...it,
              estado: it.reservas.length > 0 ? ("reservada" as const) : ("liberada" as const),
            }
          : it
      );
      return { ...prev, items: [...items, optimista] };
    });

    await queueOp(
      async () => {
        const created = await vivoApi.crearItem(vivoId, { productoId: p.id });
        setVivo((prev) => {
          if (!prev) return prev;
          const items = (prev.items ?? [])
            .filter((it) => it.id !== optimista.id)
            .map((it) =>
              it.estado === "en_pantalla" && it.id !== created.id
                ? {
                    ...it,
                    estado: it.reservas.length > 0 ? ("reservada" as const) : ("liberada" as const),
                  }
                : it
            );
          const withoutDup = items.filter((it) => it.id !== created.id);
          return { ...prev, items: [...withoutDup, created] };
        });
        await load();
      },
      () => snapshot && setVivo(snapshot)
    );
  }

  async function updateCodigo(item: VivoItem, codigo: string) {
    const prev = item.codigo;
    patchVivoItem({ ...item, codigo });
    await queueOp(
      () => vivoApi.patchItem(item.id, { codigo }).then(patchVivoItem),
      () => patchVivoItem({ ...item, codigo: prev })
    );
  }

  async function updatePrecio(item: VivoItem, precioVivo: number) {
    const prev = item.precioVivo;
    patchVivoItem({ ...item, precioVivo });
    await queueOp(
      () => vivoApi.patchItem(item.id, { precioVivo }).then(patchVivoItem),
      () => patchVivoItem({ ...item, precioVivo: prev })
    );
  }

  async function agregarReserva(item: VivoItem) {
    const texto = usuarioInput.trim();
    if (!texto) return;
    const usuario = texto.startsWith("@") ? texto : `@${texto}`;
    if (item.reservas.some((r) => r.usuario.toLowerCase() === usuario.toLowerCase())) {
      setUsuarioInput("");
      return;
    }
    const orden = item.reservas.length + 1;
    const optimista = {
      id: -Date.now(),
      vivoItemId: item.id,
      usuario,
      orden,
      estado: "pendiente" as const,
      ventaId: null,
      createdAt: new Date().toISOString(),
    };
    patchVivoItem({ ...item, reservas: [...item.reservas, optimista] });
    setUsuarioInput("");
    await queueOp(async () => {
      const r = await vivoApi.addReserva(item.id, usuario);
      const refreshed = await vivoApi.get(vivoId);
      setVivo(refreshed);
      return r;
    });
  }

  async function quitarReserva(item: VivoItem, reservaId: number) {
    const snap = item.reservas;
    patchVivoItem({
      ...item,
      reservas: item.reservas.filter((r) => r.id !== reservaId).map((r, i) => ({ ...r, orden: i + 1 })),
    });
    await queueOp(
      () => vivoApi.deleteReserva(reservaId).then(() => load()),
      () => patchVivoItem({ ...item, reservas: snap })
    );
  }

  async function marcarItem(estado: "vendida" | "liberada") {
    if (!enPantalla) return;
    const snap = vivo;
    setVivo((prev) => {
      if (!prev?.items) return prev;
      return {
        ...prev,
        items: prev.items.map((it) => (it.id === enPantalla.id ? { ...it, estado } : it)),
      };
    });
    await queueOp(
      () => vivoApi.patchItem(enPantalla.id, { estado }).then(() => load()),
      () => snap && setVivo(snap)
    );
  }

  async function cerrarVivo() {
    setCerrando(true);
    try {
      await vivoApi.cerrar(vivoId);
      navigate(`/vivo/${vivoId}/cierre`);
    } catch (e) {
      showToast(String(e));
    } finally {
      setCerrando(false);
    }
  }

  if (loading) {
    return (
      <div className="page vivo-wrap">
        <p className="muted">Cargando vivo...</p>
      </div>
    );
  }

  if (!vivo) {
    return (
      <div className="page vivo-wrap">
        <p className="err">Vivo no encontrado.</p>
        <Link to="/vivo">Volver</Link>
      </div>
    );
  }

  const totalReservas = vivo.items?.reduce((n, it) => n + it.reservas.length, 0) ?? 0;

  return (
    <div className="page vivo-wrap">
      <div className="vivo-live-bar">
        <span className="vivo-live-badge">
          <span className="vivo-live-dot" /> EN VIVO
        </span>
        <span className="vivo-timer">{formatTimer(elapsed)}</span>
        <span className="vivo-stats">
          {vivo.prendasMostradas} mostradas · {totalReservas} reservas
        </span>
        <button type="button" className="btn btn-secondary" disabled={cerrando} onClick={cerrarVivo}>
          {cerrando ? "Cerrando..." : "Cerrar vivo"}
        </button>
      </div>

      {enPantalla ? (
        <section className="card vivo-on-air">
          <p className="muted" style={{ margin: "0 0 0.5rem", fontSize: "0.85rem" }}>
            En pantalla
          </p>
          <input
            className="vivo-codigo"
            value={enPantalla.codigo}
            onChange={(e) => patchVivoItem({ ...enPantalla, codigo: e.target.value })}
            onBlur={(e) => updateCodigo(enPantalla, e.target.value.trim())}
          />
          <p className="vivo-hint">Tocá el código para editarlo</p>

          <p style={{ margin: "0.75rem 0 0.25rem", fontSize: "1.05rem" }}>
            <strong>{enPantalla.descripcion}</strong>
            {enPantalla.marca ? ` · ${enPantalla.marca}` : ""}
            {enPantalla.talle ? ` · Talle ${enPantalla.talle}` : ""}
          </p>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            {enPantalla.nombreProveedor ? `${enPantalla.nombreProveedor} · ` : ""}
            {enPantalla.productoId ? `#${enPantalla.productoId}` : "Sin producto cargado"}
          </p>

          <div className="vivo-precio-row">
            <label>
              Precio vivo{" "}
              <input
                type="number"
                value={enPantalla.precioVivo}
                onChange={(e) => patchVivoItem({ ...enPantalla, precioVivo: Number(e.target.value) })}
                onBlur={(e) => updatePrecio(enPantalla, Number(e.target.value))}
              />
            </label>
            {enPantalla.precioLista != null ? (
              <span className="muted">Lista: {formatMoney(enPantalla.precioLista)}</span>
            ) : null}
          </div>

          <input
            className="vivo-at-input"
            placeholder="@usuario de TikTok"
            value={usuarioInput}
            onChange={(e) => setUsuarioInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                agregarReserva(enPantalla);
              }
            }}
          />

          <div className="vivo-reservas">
            {enPantalla.reservas.map((r) => (
              <span key={r.id} className="vivo-reserva-chip">
                {r.orden}. {r.usuario}
                <button type="button" aria-label="Quitar" onClick={() => quitarReserva(enPantalla, r.id)}>
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="vivo-actions">
            <button type="button" className="btn btn-primary" onClick={() => marcarItem("vendida")}>
              Vendida
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => marcarItem("liberada")}>
              Liberar
            </button>
          </div>
        </section>
      ) : (
        <section className="vivo-empty">
          Buscá una prenda abajo y tocá <strong>Mostrar</strong> para ponerla en pantalla.
        </section>
      )}

      <div className="vivo-search">
        <input
          type="search"
          placeholder="Buscar por descripción, marca o ID..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <section className="card">
        {catalogoFiltrado.map((p) => {
          const prev = codigosPorProducto.get(p.id);
          return (
            <div key={p.id} className="vivo-catalogo-item">
              <div>
                <strong>#{p.id}</strong> {p.descripcion}
                {p.marca ? ` · ${p.marca}` : ""}
                <div className="muted" style={{ fontSize: "0.85rem" }}>
                  {formatMoney(p.precio)}
                  {p.proveedorNombre ? ` · ${p.proveedorNombre}` : ""}
                </div>
                {prev ? <div className="vivo-ya-mostrada">ya mostrada, código {prev}</div> : null}
              </div>
              <button type="button" className="btn btn-accent" onClick={() => mostrarPrenda(p)}>
                Mostrar
              </button>
            </div>
          );
        })}
        {catalogoFiltrado.length === 0 ? <p className="muted">Sin resultados.</p> : null}
      </section>

      <section className="card" style={{ marginTop: "1rem" }}>
        <h3>Mostradas ({mostradas.length})</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Prenda</th>
                <th>Reservas</th>
                <th>Precio</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {mostradas.map((it) => (
                <tr key={it.id}>
                  <td>{it.codigo}</td>
                  <td>{it.descripcion}</td>
                  <td>{it.reservas.map((r) => r.usuario).join(", ") || "—"}</td>
                  <td>{formatMoney(it.precioVivo)}</td>
                  <td>{estadoBadge(it.estado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {toast ? <div className="vivo-toast">{toast}</div> : null}
    </div>
  );
}
