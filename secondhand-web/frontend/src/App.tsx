import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import VentaPage from "./pages/VentaPage";
import ProductosPage from "./pages/ProductosPage";
import ProveedoresPage from "./pages/ProveedoresPage";
import InformesPage from "./pages/InformesPage";
import LoginPage from "./pages/LoginPage";

function Layout({ children }: { children: React.ReactNode }) {
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
      </header>
      <main className="main">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<VentaPage />} />
        <Route path="/productos" element={<ProductosPage />} />
        <Route path="/proveedores" element={<ProveedoresPage />} />
        <Route path="/informes" element={<InformesPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}