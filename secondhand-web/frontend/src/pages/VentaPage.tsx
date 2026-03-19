import { useCallback, useEffect, useState } from "react";
import { api } from "../api";

export type Producto = {
  id: number;
  descripcion: string;
  tipoPrenda: string | null;
  marca: string | null;
  color: string | null;
  condicion: string | null;
  precioVenta: number;
  talle: string | null;
  idProveedor: number;
  estado: string;
  nombreProveedor?: string | null;
};

type CartLine = Producto;

export default function VentaPage() {
  const [disponibles, setDisponibles] = useState<Producto[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api<Producto[]>("/api/productos/disponibles");
      setDisponibles(rows);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addToCart = (p: Producto) => {
    setCart((c) => [...c, p]);
    setDisponibles((d) => d.filter((x) => x.id !== p.id));
  };

  const removeFromCart = (id: number) => {
    const line = cart.find((x) => x.id === id);
    if (line) {
      setCart((c) => c.filter((x) => x.id !== id));
      setDisponibles((d) => [...d, line].sort((a, b) => b.id - a.id));
    }
  };

  const total = cart.reduce((s, x) => s + x.precioVenta, 0);

  const confirmarVenta = async () => {
    if (cart.length === 0) return;
    setSaving(true);
    setMsg(null);
    try {
      await api<{ id: number }>("/api/ventas", {
        method: "POST",
        body: JSON.stringify({
          items: cart.map((p) => ({
            idProducto: p.id,
            precioUnitario: p.precioVenta,
          })),
        }),
      });
      setCart([]);
      await load();
      setMsg("Venta registrada correctamente.");
    } catch (e) {
      setMsg(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page venta-grid">
      <section className="card">
        <h2>Prendas disponibles</h2>
        {loading ? (
          <p>Cargandoâ€¦</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>DescripciÃ³n</th>
                  <th>Tipo</th>
                  <th>Marca</th>
                  <th>Color</th>
                  <th>Talle</th>
                  <th>Precio</th>
                  <th>Proveedor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {disponibles.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.descripcion}</td>
                    <td>{p.tipoPrenda ?? "â€”"}</td>
                    <td>{p.marca ?? "â€”"}</td>
                    <td>{p.color ?? "â€”"}</td>
                    <td>{p.talle ?? "â€”"}</td>
                    <td>${p.precioVenta.toFixed(2)}</td>
                    <td>{p.nombreProveedor ?? "â€”"}</td>
                    <td>
                      <button type="button" className="btn btn-primary" onClick={() => addToCart(p)}>
                        Al carrito
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {disponibles.length === 0 && !loading && <p className="muted">No hay prendas disponibles.</p>}
          </div>
        )}
        <button type="button" className="btn btn-secondary mt" onClick={load}>
          Actualizar lista
        </button>
      </section>

      <section className="card">
        <h2>Venta actual</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Precio</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((p) => (
                <tr key={p.id}>
                  <td>{p.descripcion}</td>
                  <td>${p.precioVenta.toFixed(2)}</td>
                  <td>
                    <button type="button" className="btn btn-ghost" onClick={() => removeFromCart(p.id)}>
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="total">
          <strong>Total: ${total.toFixed(2)}</strong>
        </p>
        <button
          type="button"
          className="btn btn-accent"
          disabled={cart.length === 0 || saving}
          onClick={confirmarVenta}
        >
          {saving ? "Guardandoâ€¦" : "Confirmar venta"}
        </button>
        {msg && <p className={msg.includes("correctamente") ? "ok" : "err"}>{msg}</p>}
      </section>
    </div>
  );
}