import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

type SecondHandRow = {
  id: number;
  nombre: string;
  activo: boolean;
  webVistasActivo: boolean;
  vivoTiktokActivo: boolean;
  createdAt: string;
  logoUrl: string | null;
};

const LOGO_MAX_BYTES = 4.5 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}

export default function SuperadminPage() {
  const { usuario, logout } = useAuth();
  const [tiendas, setTiendas] = useState<SecondHandRow[]>([]);
  const [nombreTienda, setNombreTienda] = useState("");
  const [logoNuevaTienda, setLogoNuevaTienda] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgUser, setMsgUser] = useState<string | null>(null);
  const [msgBackup, setMsgBackup] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formEdit, setFormEdit] = useState({
    nombre: "",
    activo: true,
    logoUrl: "",
    webVistasActivo: true,
    vivoTiktokActivo: true,
  });
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [formUser, setFormUser] = useState({
    email: "",
    password: "",
    idSecond: "",
    nombre: "",
    rol: "admin" as "admin" | "operador",
  });

  const load = useCallback(async () => {
    try {
      setTiendas(await api<SecondHandRow[]>("/api/super/second-hands"));
    } catch (e) {
      setMsg(String(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cargarLogoDesdeArchivo = async (file: File | null, target: "create" | "edit") => {
    setMsg(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMsg("Solo se permiten archivos de imagen (JPG, PNG, WebP, etc.).");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setMsg("El logo supera ~4,5 MB. Elegí una imagen más liviana.");
      return;
    }
    setLogoBusy(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (target === "create") setLogoNuevaTienda(dataUrl);
      else setFormEdit((f) => ({ ...f, logoUrl: dataUrl }));
    } catch (e) {
      setMsg(String(e));
    } finally {
      setLogoBusy(false);
    }
  };

  const crearTienda = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!nombreTienda.trim()) return;
    try {
      await api("/api/super/second-hands", {
        method: "POST",
        body: JSON.stringify({
          nombre: nombreTienda.trim(),
          ...(logoNuevaTienda ? { logoUrl: logoNuevaTienda } : {}),
        }),
      });
      setNombreTienda("");
      setLogoNuevaTienda(null);
      await load();
      setMsg("Tienda creada. Use el idSecond mostrado para dar de alta usuarios.");
    } catch (e) {
      setMsg(String(e));
    }
  };

  const iniciarEdicion = (t: SecondHandRow) => {
    setEditingId(t.id);
    setFormEdit({
      nombre: t.nombre,
      activo: t.activo,
      logoUrl: t.logoUrl || "",
      webVistasActivo: t.webVistasActivo,
      vivoTiktokActivo: t.vivoTiktokActivo,
    });
  };

  const cancelarEdicion = () => {
    setEditingId(null);
    setFormEdit({ nombre: "", activo: true, logoUrl: "", webVistasActivo: true, vivoTiktokActivo: true });
  };

  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setMsg(null);
    try {
      await api(`/api/super/second-hands/${editingId}`, {
        method: "PUT",
        body: JSON.stringify({
          nombre: formEdit.nombre.trim(),
          activo: formEdit.activo,
          logoUrl: formEdit.logoUrl.trim() || null,
          webVistasActivo: formEdit.webVistasActivo,
          vivoTiktokActivo: formEdit.vivoTiktokActivo,
        }),
      });
      await load();
      cancelarEdicion();
      setMsg("Tienda actualizada correctamente.");
    } catch (e) {
      setMsg(String(e));
    } finally {
      setSaving(false);
    }
  };

  const crearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgUser(null);
    if (!formUser.email || !formUser.password || !formUser.idSecond) {
      setMsgUser("Correo, contraseña e ID de tienda (idSecond) son obligatorios.");
      return;
    }
    try {
      await api("/api/super/usuarios", {
        method: "POST",
        body: JSON.stringify({
          email: formUser.email.trim(),
          password: formUser.password,
          idSecond: Number(formUser.idSecond),
          nombre: formUser.nombre.trim() || null,
          rol: formUser.rol,
        }),
      });
      setFormUser((f) => ({ ...f, email: "", password: "", nombre: "" }));
      setMsgUser("Usuario creado correctamente.");
    } catch (e) {
      setMsgUser(String(e));
    }
  };

  const exportarBackup = async () => {
    setMsgBackup(null);
    setBackupBusy(true);
    try {
      type BackupPayload = {
        version: number;
        exportedAt: string;
        counts: Record<string, number>;
        data: Record<string, unknown[]>;
      };
      const backup = await api<BackupPayload>("/api/super/backup");
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      a.href = url;
      a.download = `secondhand-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      const total = Object.values(backup.counts || {}).reduce((s, n) => s + Number(n || 0), 0);
      setMsgBackup(`Backup exportado (${total} registros). Guardalo en un lugar seguro.`);
    } catch (e) {
      setMsgBackup(String(e));
    } finally {
      setBackupBusy(false);
    }
  };

  const importarBackup = async () => {
    setMsgBackup(null);
    if (!backupFile) {
      setMsgBackup("Seleccioná un archivo JSON de backup.");
      return;
    }
    const ok = window.confirm(
      "Esto BORRARÁ todos los datos actuales del sistema y los reemplazará por el contenido del archivo.\n\n¿Continuar?"
    );
    if (!ok) return;
    setBackupBusy(true);
    try {
      const text = await backupFile.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("El archivo no es un JSON válido.");
      }
      const result = await api<{ ok: boolean; message?: string; counts?: Record<string, number> }>(
        "/api/super/backup/import",
        {
          method: "POST",
          body: JSON.stringify(parsed),
        }
      );
      setBackupFile(null);
      await load();
      const total = Object.values(result.counts || {}).reduce((s, n) => s + Number(n || 0), 0);
      setMsgBackup(result.message || `Importación completa (${total} registros).`);
    } catch (e) {
      setMsgBackup(String(e));
    } finally {
      setBackupBusy(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">Superadmin — SecondHand</h1>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <span className="muted">{usuario?.email}</span>
          <button type="button" className="btn btn-secondary" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="main">
        <section className="card">
          <h2>Nueva tienda (Second Hand)</h2>
          <p className="muted">
            Cada tienda recibe un <strong>idSecond</strong> único. Todos los datos del sistema quedan
            vinculados a ese identificador.
          </p>
          <form className="form-grid" onSubmit={crearTienda} style={{ maxWidth: 480 }}>
            <label>
              Nombre de la tienda
              <input
                value={nombreTienda}
                onChange={(e) => setNombreTienda(e.target.value)}
                placeholder="Ej. Segunda Mano Centro"
                required
              />
            </label>
            <label>
              Logo (opcional)
              <input
                type="file"
                accept="image/*"
                disabled={logoBusy}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  e.target.value = "";
                  void cargarLogoDesdeArchivo(f, "create");
                }}
              />
            </label>
            {logoNuevaTienda ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <img
                  src={logoNuevaTienda}
                  alt="Vista previa logo"
                  style={{ width: 64, height: 64, objectFit: "cover", borderRadius: "50%", border: "1px solid #ddd" }}
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setLogoNuevaTienda(null)}
                >
                  Quitar logo
                </button>
              </div>
            ) : (
              <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                JPG/PNG/WebP, máx. ~4,5 MB. También podés cargarlo después al editar la tienda.
              </p>
            )}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={logoBusy}>
                Dar de alta tienda
              </button>
            </div>
          </form>
          {msg && <p className={msg.includes("creada") ? "ok" : "err"}>{msg}</p>}
        </section>

        <section className="card mt-lg">
          <h2>Tiendas registradas</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>idSecond (ID)</th>
                  <th>Logo</th>
                  <th>Nombre</th>
                  <th>Activa</th>
                  <th>Web vistas</th>
                  <th>Vivo TikTok</th>
                  <th>Alta</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tiendas.map((t) => (
                  <tr key={t.id}>
                    {editingId === t.id ? (
                      <>
                        <td>
                          <strong>{t.id}</strong>
                        </td>
                        <td colSpan={7}>
                          <form onSubmit={guardarEdicion} className="form-grid" style={{ maxWidth: 600, margin: "0.5rem 0" }}>
                            <label>
                              Nombre
                              <input
                                value={formEdit.nombre}
                                onChange={(e) => setFormEdit((f) => ({ ...f, nombre: e.target.value }))}
                                required
                              />
                            </label>
                            <label>
                              Subir logo desde archivo
                              <input
                                type="file"
                                accept="image/*"
                                disabled={logoBusy || saving}
                                onChange={(e) => {
                                  const f = e.target.files?.[0] ?? null;
                                  e.target.value = "";
                                  void cargarLogoDesdeArchivo(f, "edit");
                                }}
                              />
                            </label>
                            <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                              JPG/PNG/WebP, máx. ~4,5 MB. Reemplaza el logo actual al guardar.
                            </p>
                            {formEdit.logoUrl ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                                <img
                                  src={formEdit.logoUrl}
                                  alt="Logo"
                                  style={{
                                    width: 72,
                                    height: 72,
                                    objectFit: "cover",
                                    borderRadius: "50%",
                                    border: "1px solid #ddd",
                                  }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                                <button
                                  type="button"
                                  className="btn btn-ghost"
                                  disabled={saving}
                                  onClick={() => setFormEdit((f) => ({ ...f, logoUrl: "" }))}
                                >
                                  Quitar logo
                                </button>
                              </div>
                            ) : (
                              <p className="muted" style={{ margin: 0 }}>Sin logo</p>
                            )}
                            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <input
                                type="checkbox"
                                checked={formEdit.webVistasActivo}
                                onChange={(e) => setFormEdit((f) => ({ ...f, webVistasActivo: e.target.checked }))}
                              />
                              Web vistas habilitado
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <input
                                type="checkbox"
                                checked={formEdit.vivoTiktokActivo}
                                onChange={(e) => setFormEdit((f) => ({ ...f, vivoTiktokActivo: e.target.checked }))}
                              />
                              Vivo TikTok habilitado
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <input
                                type="checkbox"
                                checked={formEdit.activo}
                                onChange={(e) => setFormEdit((f) => ({ ...f, activo: e.target.checked }))}
                              />
                              Tienda activa
                            </label>
                            <div className="form-actions" style={{ marginTop: "0.5rem" }}>
                              <button type="submit" className="btn btn-primary" disabled={saving || logoBusy}>
                                {saving ? "Guardando..." : "Guardar"}
                              </button>
                              <button type="button" className="btn btn-secondary" onClick={cancelarEdicion} disabled={saving}>
                                Cancelar
                              </button>
                            </div>
                          </form>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <strong>{t.id}</strong>
                        </td>
                        <td>
                          {t.logoUrl ? (
                            <img
                              src={t.logoUrl}
                              alt="Logo"
                              style={{ maxWidth: 50, maxHeight: 50, objectFit: "contain" }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="muted" style={{ fontSize: "0.85rem" }}>Sin logo</span>
                          )}
                        </td>
                        <td>{t.nombre}</td>
                        <td>{t.activo ? "Sí" : "No"}</td>
                        <td>{t.webVistasActivo ? "Sí" : "No"}</td>
                        <td>{t.vivoTiktokActivo ? "Sí" : "No"}</td>
                        <td>{new Date(t.createdAt).toLocaleString("es")}</td>
                        <td>
                          <button type="button" className="btn btn-ghost" onClick={() => iniciarEdicion(t)}>
                            Editar
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {tiendas.length === 0 && <p className="muted">No hay tiendas todavía.</p>}
          </div>
          <button type="button" className="btn btn-secondary mt" onClick={load}>
            Actualizar lista
          </button>
        </section>

        <section className="card mt-lg">
          <h2>Backup completo (JSON)</h2>
          <p className="muted">
            Exportá <strong>todos</strong> los datos del sistema (tiendas, usuarios, productos, ventas,
            caja, clientes, cuentas corrientes, web vistas, etc.) a un archivo JSON para guardarlo como
            respaldo manual o levantarlo en otro servidor.
          </p>
          <p className="muted">
            La importación <strong>reemplaza todo</strong> lo existente. Las contraseñas se conservan
            (hash bcrypt). Los archivos de logo en <code>/public</code> no van en el JSON (solo la
            ruta <code>logoUrl</code>); copiá esos archivos aparte si hace falta.
          </p>
          <div className="form-actions" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={exportarBackup}
              disabled={backupBusy}
            >
              {backupBusy ? "Procesando..." : "Exportar completo"}
            </button>
          </div>
          <div className="form-grid mt" style={{ maxWidth: 520 }}>
            <label>
              Archivo de backup (.json)
              <input
                type="file"
                accept="application/json,.json"
                disabled={backupBusy}
                onChange={(e) => setBackupFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-accent"
                onClick={importarBackup}
                disabled={backupBusy || !backupFile}
              >
                {backupBusy ? "Importando..." : "Importar completo"}
              </button>
            </div>
          </div>
          {msgBackup && (
            <p className={msgBackup.toLowerCase().includes("error") || msgBackup.startsWith("Error") ? "err" : "ok"}>
              {msgBackup}
            </p>
          )}
        </section>

        <section className="card mt-lg">
          <h2>Usuario de tienda (admin u operador)</h2>
          <p className="muted">
            Indique el <strong>idSecond</strong> de la tabla anterior para vincular el usuario a esa
            tienda.
          </p>
          <form className="form-grid" onSubmit={crearUsuario} style={{ maxWidth: 520 }}>
            <label>
              Correo electrónico *
              <input
                type="email"
                value={formUser.email}
                onChange={(e) => setFormUser((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </label>
            <label>
              Contraseña *
              <input
                type="password"
                value={formUser.password}
                onChange={(e) => setFormUser((f) => ({ ...f, password: e.target.value }))}
                required
              />
            </label>
            <label>
              idSecond (ID de tienda) *
              <input
                type="number"
                min={1}
                value={formUser.idSecond}
                onChange={(e) => setFormUser((f) => ({ ...f, idSecond: e.target.value }))}
                required
              />
            </label>
            <label>
              Nombre para mostrar
              <input
                value={formUser.nombre}
                onChange={(e) => setFormUser((f) => ({ ...f, nombre: e.target.value }))}
              />
            </label>
            <label>
              Rol
              <select
                value={formUser.rol}
                onChange={(e) =>
                  setFormUser((f) => ({ ...f, rol: e.target.value as "admin" | "operador" }))
                }
              >
                <option value="admin">Administrador</option>
                <option value="operador">Operador</option>
              </select>
            </label>
            <div className="form-actions">
              <button type="submit" className="btn btn-accent">
                Crear usuario
              </button>
            </div>
          </form>
          {msgUser && <p className={msgUser.includes("correctamente") ? "ok" : "err"}>{msgUser}</p>}
        </section>
      </main>
    </div>
  );
}

