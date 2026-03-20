import { Routes, Route, NavLink, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import VentaPage from "./pages/VentaPage";
import ProductosPage from "./pages/ProductosPage";
import ProveedoresPage from "./pages/ProveedoresPage";
import InformesPage from "./pages/InformesPage";
import LoginPage from "./pages/LoginPage";
import SuperadminPage from "./pages/SuperadminPage";

function TenantLayout() {
  const { usuario, logout } = useAuth();
  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">SecondHand</h1>
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
          <NavLink to="/informes" className={({ isActive }) => (isActive ? "active" : "")}>
            Informes
          </NavLink>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            {usuario?.email}
            {usuario?.idSecond != null && ` \u00b7 Tienda #${usuario.idSecond}`}
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
    return <Navigate to={usuario.rol === "superadmin" ? "/super" : "/"} replace />;
  }
  return <LoginPage />;
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
      <Route path="/super" element={<SuperadminRoute />} />

      <Route element={<RequireTenant />}>
        <Route element={<TenantLayout />}>
          <Route path="/" element={<VentaPage />} />
          <Route path="/productos" element={<ProductosPage />} />
          <Route path="/proveedores" element={<ProveedoresPage />} />
          <Route path="/informes" element={<InformesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}