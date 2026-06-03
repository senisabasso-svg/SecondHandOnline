import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProveedorLoginPage() {
  const { usuario, loginProveedor } = useAuth();
  const navigate = useNavigate();
  const [usuarioInput, setUsuarioInput] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (usuario?.rol === "proveedor") {
      navigate("/proveedor", { replace: true });
    } else if (usuario) {
      navigate(usuario.rol === "superadmin" ? "/super" : "/", { replace: true });
    }
  }, [usuario, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await loginProveedor(usuarioInput, password);
      navigate("/proveedor", { replace: true });
    } catch (err) {
      setError(String(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page login-page">
      <section className="card login-card">
        <h1 className="logo" style={{ marginTop: 0 }}>
          Ingreso proveedores
        </h1>
        <p className="muted">
          Usuario y clave: <strong>NombreTienda+NombreProveedor</strong> (el signo + entre ambos, tal como
          figuran en la tienda).
        </p>
        <p className="muted" style={{ fontSize: "0.9rem" }}>
          Ejemplo: si la tienda se llama <em>Rosa Vintage</em> y usted está registrado como{" "}
          <em>María</em>, escriba <code>Rosa Vintage+María</code> en usuario y en clave.
        </p>
        <form onSubmit={submit} className="form-grid" style={{ maxWidth: 400 }}>
          <label>
            Usuario
            <input
              type="text"
              autoComplete="username"
              value={usuarioInput}
              onChange={(e) => setUsuarioInput(e.target.value)}
              placeholder="NombreTienda+NombreProveedor"
              required
            />
          </label>
          <label>
            Clave (igual que el usuario)
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="NombreTienda+NombreProveedor"
              required
            />
          </label>
          <button type="submit" className="btn btn-accent" disabled={sending}>
            {sending ? "Entrando…" : "Entrar"}
          </button>
        </form>
        {error && <p className="err">{error}</p>}
        <p className="muted" style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
          <Link to="/login">Acceso empleados / tienda</Link>
        </p>
      </section>
    </div>
  );
}
