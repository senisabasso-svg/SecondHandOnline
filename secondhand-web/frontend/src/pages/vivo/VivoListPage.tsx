import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDuracion, formatMoney, vivoApi, type VivoHistorial } from "../../services/vivo";
import "./vivo.css";

export default function VivoListPage() {
  const navigate = useNavigate();
  const [actual, setActual] = useState<Awaited<ReturnType<typeof vivoApi.actual>> | undefined>(undefined);
  const [historial, setHistorial] = useState<VivoHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [abriendo, setAbriendo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cur, hist] = await Promise.all([vivoApi.actual(), vivoApi.list()]);
      setActual(cur);
      setHistorial(hist.filter((v) => v.estado === "cerrado" || v.id !== cur?.id));
    } catch (e) {
      setMsg(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function empezar() {
    setAbriendo(true);
    setMsg("");
    try {
      const vivo = await vivoApi.abrir();
      navigate(`/vivo/${vivo.id}`);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setAbriendo(false);
    }
  }

  const sinHistorial = !loading && historial.length === 0 && !actual;

  return (
    <div className="page vivo-wrap">
      <h2>Vivo TikTok</h2>

      {loading ? <p className="muted">Cargando...</p> : null}

      {actual ? (
        <div className="vivo-alert">
          Tenés un vivo en curso.{" "}
          <Link to={`/vivo/${actual.id}`}>Volver al vivo en curso</Link>
        </div>
      ) : (
        !loading && (
          <button type="button" className="btn btn-accent vivo-start-btn" disabled={abriendo} onClick={empezar}>
            {abriendo ? "Abriendo..." : "Empezar vivo"}
          </button>
        )
      )}

      {msg ? <p className="err">{msg}</p> : null}

      {sinHistorial ? (
        <div className="vivo-howto card">
          <h3>¿Cómo se usa?</h3>
          <ol>
            <li>
              <strong>Antes de arrancar</strong> — cargá en Productos las prendas que vas a mostrar, con su proveedora y
              su precio. Anotá el número de ID en la etiqueta.
            </li>
            <li>
              <strong>Al empezar el vivo</strong> — entrá acá y tocá Empezar vivo. Dejá esta pantalla abierta en la
              tablet al costado del celular.
            </li>
            <li>
              <strong>Durante el vivo</strong> — cada prenda que levantás, buscala y tocá Mostrar. Leé el código y el
              precio al aire. Anotá los @ que comentan.
            </li>
            <li>
              <strong>Al terminar</strong> — tocá Cerrar vivo. Al otro día entrá al cierre y cobrá agrupado por persona.
            </li>
          </ol>
        </div>
      ) : null}

      {historial.length > 0 ? (
        <section className="card" style={{ marginTop: "1rem" }}>
          <h3>Historial</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vivo #</th>
                  <th>Fecha</th>
                  <th>Duración</th>
                  <th>Mostradas</th>
                  <th>Reservas</th>
                  <th>Adjudicado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {historial.map((v) => (
                  <tr key={v.id}>
                    <td>{v.id}</td>
                    <td>{new Date(v.inicio).toLocaleDateString("es-AR")}</td>
                    <td>{formatDuracion(v.duracionMs)}</td>
                    <td>{v.prendasMostradas}</td>
                    <td>{v.reservas}</td>
                    <td>{formatMoney(v.totalAdjudicado)}</td>
                    <td>
                      <Link to={`/vivo/${v.id}/cierre`} className="btn btn-ghost">
                        Cierre
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
