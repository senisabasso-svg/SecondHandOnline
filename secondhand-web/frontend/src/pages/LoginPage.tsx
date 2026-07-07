import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login, usuario } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (usuario) {
    navigate(usuario.rol === "superadmin" ? "/super" : "/", { replace: true });
    return null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await login(email, password);
      const u = JSON.parse(localStorage.getItem("sh_user") || "{}") as { rol?: string };
      navigate(u.rol === "superadmin" ? "/super" : "/", { replace: true });
    } catch (err) {
      setError(String(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page login-page">
      <section className="card login-card">
        <div className="login-brand">
          <video
            className="login-logo-video"
            src="/logo-tiendas.mp4"
            autoPlay
            loop
            muted
            playsInline
            aria-label="Logo Tiendas"
          />
          <h1 className="logo" style={{ margin: 0 }}>
            Tiendas
          </h1>
        </div>
        <p className="muted" style={{ textAlign: "center" }}>
          Inicie sesión para continuar
        </p>
        <form onSubmit={submit} className="form-grid" style={{ maxWidth: 360 }}>
          <label>
            Correo electrónico
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn btn-accent" disabled={sending}>
            {sending ? "Entrando…" : "Iniciar sesión"}
          </button>
        </form>
        {error && <p className="err">{error}</p>}
        <p className="muted" style={{ marginTop: "1rem", fontSize: "0.9rem", textAlign: "center" }}>
          <Link to="/ingreso-proveedores">Ingreso proveedores</Link>
          {" · usuario: NombreTienda+NombreProveedor"}
        </p>
      </section>
    </div>
  );
}
