import { Routes, Route, NavLink, Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { api } from "./api";
import VentaPage from "./pages/VentaPage";
import ProductosPage from "./pages/ProductosPage";
import ProveedoresPage from "./pages/ProveedoresPage";
import InformesPage from "./pages/InformesPage";
import LoginPage from "./pages/LoginPage";
import SuperadminPage from "./pages/SuperadminPage";
import ProveedorLoginPage from "./pages/ProveedorLoginPage";
import ProveedorPortalPage from "./pages/ProveedorPortalPage";
import ClientesPage from "./pages/ClientesPage";
import CuentasCorrientesPage from "./pages/CuentasCorrientesPage";

function TenantLayout() {
  const { usuario, logout } = useAuth();
  const [tienda, setTienda] = useState<{ id: number; nombre: string; logoUrl?: string | null } | null>(null);

  useEffect(() => {
    if (!usuario?.idSecond) return;
    api<{ id: number; nombre: string; logoUrl?: string | null }>("/api/tienda")
      .then(setTienda)
      .catch(() => setTienda(null));
  }, [usuario?.idSecond]);

  return (
    <div className="app">
      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {tienda?.logoUrl ? (
            <img
              src={tienda.logoUrl}
              alt="Logo tienda"
              style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }}
            />
          ) : null}
          <h1 className="logo">{tienda?.nombre || "SecondHand"}</h1>
        </div>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            Venta
          </NavLink>
          <NavLink to="/productos" className={({ isActive }) => (isActive ? "active" : "")}>
            Productos
          </NavLink>
          <NavLink to="/proveedores" className={({ isActive }) => (isActive ? "active" : "")}>
            Proveedores
          </NavLink>
          <NavLink to="/clientes" className={({ isActive }) => (isActive ? "active" : "")}>
            Clientes
          </NavLink>
          <NavLink to="/cuentas-corrientes" className={({ isActive }) => (isActive ? "active" : "")}>
            Cuentas corrientes
          </NavLink>
          <NavLink to="/informes" className={({ isActive }) => (isActive ? "active" : "")}>
            Informes
          </NavLink>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            {usuario?.email}
            {tienda?.nombre ? ` · ${tienda.nombre}` : usuario?.idSecond != null ? ` · Tienda #${usuario.idSecond}` : ""}
          </span>
          <button type="button" className="btn btn-secondary" onClick={logout}>
            {"Cerrar sesi\u00f3n"}
          </button>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

function RequireTenant() {
  const { usuario, loading } = useAuth();
  if (loading) {
    return (
      <div className="main">
        <p className="muted">Cargando...</p>
      </div>
    );
  }
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol === "proveedor") return <Navigate to="/proveedor" replace />;
  if (usuario.rol === "superadmin") {
    return <Navigate to="/super" replace />;
  }
  if (usuario.idSecond == null) {
    return (
      <div className="main card">
        <h2>Sin tienda asignada</h2>
        <p className="muted">Pida a un superadmin que asocie su usuario a una tienda (idSecond).</p>
      </div>
    );
  }
  return <Outlet />;
}

function LoginRoute() {
  const { usuario, loading } = useAuth();
  if (loading) return <p className="muted">Cargando...</p>;
  if (usuario) {
    if (usuario.rol === "proveedor") return <Navigate to="/proveedor" replace />;
    return <Navigate to={usuario.rol === "superadmin" ? "/super" : "/"} replace />;
  }
  return <LoginPage />;
}

function ProveedorLoginRoute() {
  const { usuario, loading } = useAuth();
  if (loading) return <p className="muted">Cargando...</p>;
  if (usuario?.rol === "proveedor") return <Navigate to="/proveedor" replace />;
  if (usuario) return <Navigate to={usuario.rol === "superadmin" ? "/super" : "/"} replace />;
  return <ProveedorLoginPage />;
}

function RequireProveedor() {
  const { usuario, loading } = useAuth();
  if (loading) {
    return (
      <div className="main">
        <p className="muted">Cargando...</p>
      </div>
    );
  }
  if (!usuario) return <Navigate to="/ingreso-proveedores" replace />;
  if (usuario.rol !== "proveedor") return <Navigate to="/" replace />;
  return <Outlet />;
}

function SuperadminRoute() {
  const { usuario, loading } = useAuth();
  if (loading) return <p className="muted">Cargando...</p>;
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol !== "superadmin") return <Navigate to="/" replace />;
  return <SuperadminPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/ingreso-proveedores" element={<ProveedorLoginRoute />} />
      <Route path="/super" element={<SuperadminRoute />} />

      <Route element={<RequireProveedor />}>
        <Route path="/proveedor" element={<ProveedorPortalPage />} />
      </Route>

      <Route element={<RequireTenant />}>
        <Route element={<TenantLayout />}>
          <Route path="/" element={<VentaPage />} />
          <Route path="/productos" element={<ProductosPage />} />
          <Route path="/proveedores" element={<ProveedoresPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/cuentas-corrientes" element={<CuentasCorrientesPage />} />
          <Route path="/informes" element={<InformesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}