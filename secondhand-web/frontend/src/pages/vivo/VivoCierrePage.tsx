import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api";
import { CierreData, formatMoney, vivoApi } from "../../services/vivo";
import "./vivo.css";

type MedioPago = "efectivo" | "tarjeta" | "cuenta_corriente";

export default function VivoCierrePage() {
  const { id } = useParams();
  const vivoId = Number(id);
  const [data, setData] = useState<CierreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [procesando, setProcesando] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await vivoApi.cierre(vivoId));
    } catch (e) {
      setMsg(String(e));
    } finally {
      setLoading(false);
    }
  }, [vivoId]);

  useEffect(() => {
    load();
  }, [load]);

  async function armarVenta(grupo: CierreData["grupos"][0]) {
    const prendasConProducto = grupo.prendas.filter((p) => p.productoId);
    if (prendasConProducto.length === 0) {
      setMsg("Este grupo tiene prendas sin producto cargado. Cobralas a mano en Venta.");
      return;
    }
    setProcesando(grupo.usuario);
    setMsg("");
    try {
      const venta = await api<{ id: number }>("/api/ventas", {
        method: "POST",
        body: JSON.stringify({
          medioPago: "efectivo" as MedioPago,
          items: prendasConProducto.map((p) => ({
            idProducto: p.productoId,
            precioUnitario: p.precioVivo,
          })),
        }),
      });
      await vivoApi.confirmarVenta(vivoId, {
        usuario: grupo.usuario,
        ventaId: venta.id,
        reservaIds: grupo.reservaIds,
      });
      await load();
      setMsg(`Venta #${venta.id} registrada para ${grupo.usuario}.`);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setProcesando(null);
    }
  }

  async function marcarCaida(reservaId: number) {
    try {
      await vivoApi.marcarCaida(reservaId);
      await load();
    } catch (e) {
      setMsg(String(e));
    }
  }

  if (loading) {
    return (
      <div className="page vivo-wrap">
        <p className="muted">Cargando cierre...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page vivo-wrap">
        <p className="err">{msg || "No se pudo cargar el cierre."}</p>
        <Link to="/vivo">Volver</Link>
      </div>
    );
  }

  return (
    <div className="page vivo-wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
        <h2>Cierre — Vivo #{data.vivoId}</h2>
        <Link to="/vivo" className="btn btn-ghost">
          Volver
        </Link>
      </div>

      {data.enPantalla ? (
        <div className="vivo-alert">
          Quedó un ítem en pantalla sin cerrar: código <strong>{data.enPantalla.codigo}</strong> (
          {data.enPantalla.descripcion}). Cerrá el vivo desde la pantalla del vivo si sigue abierto.
        </div>
      ) : null}

      <section className="card">
        <p style={{ margin: 0 }}>
          <strong>{data.resumen.mostradas}</strong> mostradas ·{" "}
          <strong>{data.resumen.adjudicadas}</strong> adjudicadas ·{" "}
          <strong>{data.resumen.sinComentarios}</strong> sin comentarios · Total a cobrar:{" "}
          <strong>{formatMoney(data.resumen.totalCobrar)}</strong>
        </p>
      </section>

      {msg ? <p className={msg.startsWith("Venta") ? "ok" : "err"}>{msg}</p> : null}

      {data.grupos.length === 0 ? (
        <p className="muted">No hay reservas pendientes para cobrar.</p>
      ) : (
        data.grupos.map((g) => (
          <section key={g.usuario} className="card vivo-cierre-grupo">
            <h3>{g.usuario}</h3>
            <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.1rem" }}>
              {g.prendas.map((p) => (
                <li key={p.reservaId}>
                  Código {p.codigo} — {p.descripcion} — {formatMoney(p.precioVivo)}
                  {!p.productoId ? (
                    <span className="muted"> (sin producto — cobrar a mano)</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ marginLeft: "0.5rem", fontSize: "0.8rem" }}
                      onClick={() => marcarCaida(p.reservaId)}
                    >
                      Caída
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <p style={{ margin: "0 0 0.75rem" }}>
              Subtotal: <strong>{formatMoney(g.subtotal)}</strong>
            </p>
            <button
              type="button"
              className="btn btn-accent"
              disabled={procesando === g.usuario || g.prendas.every((p) => !p.productoId)}
              onClick={() => armarVenta(g)}
            >
              {procesando === g.usuario ? "Procesando..." : "Armar venta"}
            </button>
          </section>
        ))
      )}
    </div>
  );
}
