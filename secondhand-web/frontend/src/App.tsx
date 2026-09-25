import { Routes, Route, NavLink, Navigate, Outlet, useOutletContext } from "react-router-dom";
import { Suspense, lazy, useEffect, useState, type ReactNode } from "react";
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
import WebVistasPage from "./pages/WebVistasPage";
import DevolucionesPage from "./pages/DevolucionesPage";

const VivoListPage = lazy(() => import("./pages/vivo/VivoListPage"));
const VivoSessionPage = lazy(() => import("./pages/vivo/VivoSessionPage"));
const VivoCierrePage = lazy(() => import("./pages/vivo/VivoCierrePage"));

type TiendaInfo = {
  id: number;
  nombre: string;
  logoUrl?: string | null;
  webVistasActivo: boolean;
  vivoTiktokActivo: boolean;
  devolucionesActivo: boolean;
  pendientePago: boolean;
};

const SOPORTE_WHATSAPP = "59892331019";
const SOPORTE_MSG = "Hola, necesito actualizar el pago de mi empresa en SecondHand.";

function TenantLayout() {
  const { usuario, logout } = useAuth();
  const [tienda, setTienda] = useState<TiendaInfo | null>(null);
  const [mostrarPendientePago, setMostrarPendientePago] = useState(false);

  useEffect(() => {
    if (!usuario?.idSecond) return;
    api<TiendaInfo>("/api/tienda")
      .then((t) => {
        setTienda(t);
        if (t.pendientePago) {
          const key = `sh_pago_aviso_${t.id}`;
          if (sessionStorage.getItem(key) !== "1") {
            setMostrarPendientePago(true);
          }
        } else {
          setMostrarPendientePago(false);
        }
      })
      .catch(() => setTienda(null));
  }, [usuario?.idSecond]);

  const continuarUsando = () => {
    if (tienda) sessionStorage.setItem(`sh_pago_aviso_${tienda.id}`, "1");
    setMostrarPendientePago(false);
  };

  const contactarWhatsApp = () => {
    const url = `https://wa.me/${SOPORTE_WHATSAPP}?text=${encodeURIComponent(SOPORTE_MSG)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

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
          {tienda?.devolucionesActivo ? (
            <NavLink to="/devoluciones" className={({ isActive }) => (isActive ? "active" : "")}>
              Devoluciones
            </NavLink>
          ) : null}
          <NavLink to="/informes" className={({ isActive }) => (isActive ? "active" : "")}>
            Informes
          </NavLink>
          {tienda?.webVistasActivo ? (
            <NavLink to="/web-vistas" className={({ isActive }) => (isActive ? "active" : "")}>
              Web vistas
            </NavLink>
          ) : null}
          {tienda?.vivoTiktokActivo ? (
            <NavLink to="/vivo" className={({ isActive }) => (isActive ? "active" : "")}>
              Vivo TikTok
            </NavLink>
          ) : null}
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
        <Outlet context={{ tienda }} />
      </main>

      {mostrarPendientePago && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="pago-pendiente-titulo">
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 id="pago-pendiente-titulo">Aviso de pago</h3>
            <p>
              Contacte a soporte <strong>092331019</strong>, empresa pendiente de actualizar pago.
            </p>
            <div className="modal-pago-actions" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem" }}>
              <button type="button" className="btn btn-primary" onClick={continuarUsando}>
                Continuar usando
              </button>
              <button type="button" className="btn btn-accent" onClick={contactarWhatsApp}>
                Contactar para actualizar pago
              </button>
            </div>
          </div>
        </div>
      )}
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

function RequireModulo({
  modulo,
  children,
}: {
  modulo: "webVistas" | "vivoTiktok" | "devoluciones";
  children: ReactNode;
}) {
  const { tienda } = useOutletContext<{ tienda: TiendaInfo | null }>();
  if (!tienda) return <p className="muted">Cargando...</p>;
  const ok =
    modulo === "webVistas"
      ? tienda.webVistasActivo
      : modulo === "vivoTiktok"
        ? tienda.vivoTiktokActivo
        : tienda.devolucionesActivo;
  if (!ok) {
    return (
      <div className="page card">
        <h2>Sección no disponible</h2>
        <p className="muted">Esta función no está habilitada para tu tienda. Contactá al administrador.</p>
      </div>
    );
  }
  return <>{children}</>;
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
          <Route
            path="/devoluciones"
            element={
              <RequireModulo modulo="devoluciones">
                <DevolucionesPage />
              </RequireModulo>
            }
          />
          <Route path="/informes" element={<InformesPage />} />
          <Route
            path="/web-vistas"
            element={
              <RequireModulo modulo="webVistas">
                <WebVistasPage />
              </RequireModulo>
            }
          />
          <Route
            path="/vivo"
            element={
              <RequireModulo modulo="vivoTiktok">
                <Suspense fallback={<p className="muted">Cargando...</p>}>
                  <VivoListPage />
                </Suspense>
              </RequireModulo>
            }
          />
          <Route
            path="/vivo/:id/cierre"
            element={
              <RequireModulo modulo="vivoTiktok">
                <Suspense fallback={<p className="muted">Cargando...</p>}>
                  <VivoCierrePage />
                </Suspense>
              </RequireModulo>
            }
          />
          <Route
            path="/vivo/:id"
            element={
              <RequireModulo modulo="vivoTiktok">
                <Suspense fallback={<p className="muted">Cargando...</p>}>
                  <VivoSessionPage />
                </Suspense>
              </RequireModulo>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}