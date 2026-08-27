import { api } from "../api";

export type VivoEstado = "abierto" | "cerrado";
export type VivoItemEstado = "en_pantalla" | "reservada" | "vendida" | "liberada";
export type VivoReservaEstado = "pendiente" | "confirmada" | "caida";

export type VivoReserva = {
  id: number;
  vivoItemId: number;
  usuario: string;
  orden: number;
  estado: VivoReservaEstado;
  ventaId: number | null;
  createdAt: string;
};

export type VivoItem = {
  id: number;
  vivoId: number;
  productoId: number | null;
  codigo: string;
  precioVivo: number;
  descripcionLibre: string | null;
  estado: VivoItemEstado;
  orden: number;
  createdAt: string;
  descripcion: string | null;
  marca: string | null;
  talle: string | null;
  color: string | null;
  precioLista: number | null;
  nombreProveedor: string | null;
  reservas: VivoReserva[];
};

export type Vivo = {
  id: number;
  titulo: string | null;
  plataforma: string;
  inicio: string;
  fin: string | null;
  estado: VivoEstado;
  createdAt: string;
  prendasMostradas: number;
  reservas: number;
  totalAdjudicado: number;
  items?: VivoItem[];
};

export type VivoHistorial = Vivo & { duracionMs: number };

export type CatalogoPrenda = {
  id: number;
  descripcion: string;
  marca: string | null;
  talle: string | null;
  color: string | null;
  precio: number;
  proveedorNombre: string | null;
};

export type CierreGrupo = {
  usuario: string;
  prendas: {
    itemId: number;
    reservaId: number;
    codigo: string;
    descripcion: string | null;
    precioVivo: number;
    productoId: number;
  }[];
  subtotal: number;
  reservaIds: number[];
};

export type CierreData = {
  vivoId: number;
  estado: VivoEstado;
  enPantalla: VivoItem | null;
  resumen: {
    mostradas: number;
    adjudicadas: number;
    sinComentarios: number;
    totalCobrar: number;
  };
  grupos: CierreGrupo[];
};

export const vivoApi = {
  actual: () => api<Vivo | null>("/api/vivo/actual"),
  list: () => api<VivoHistorial[]>("/api/vivo"),
  get: (id: number) => api<Vivo>(`/api/vivo/${id}`),
  abrir: (body?: { titulo?: string }) =>
    api<Vivo>("/api/vivo", { method: "POST", body: JSON.stringify(body ?? {}) }),
  cerrar: (id: number) => api<Vivo>(`/api/vivo/${id}/cerrar`, { method: "POST" }),
  catalogo: (id: number) => api<CatalogoPrenda[]>(`/api/vivo/${id}/catalogo`),
  cierre: (id: number) => api<CierreData>(`/api/vivo/${id}/cierre`),
  crearItem: (
    vivoId: number,
    body: { productoId?: number; descripcionLibre?: string; codigo?: string; precioVivo?: number }
  ) =>
    api<VivoItem>(`/api/vivo/${vivoId}/items`, {
      method: "POST",
      body: JSON.stringify({
        productoId: body.productoId,
        descripcionLibre: body.descripcionLibre,
        codigo: body.codigo,
        precioVivo: body.precioVivo,
      }),
    }),
  patchItem: (
    itemId: number,
    body: { codigo?: string; precioVivo?: number; estado?: VivoItemEstado }
  ) =>
    api<VivoItem>(`/api/vivo/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteItem: (itemId: number) =>
    api<void>(`/api/vivo/items/${itemId}`, { method: "DELETE" }),
  addReserva: (itemId: number, usuario: string) =>
    api<VivoReserva>(`/api/vivo/items/${itemId}/reservas`, {
      method: "POST",
      body: JSON.stringify({ usuario }),
    }),
  deleteReserva: (reservaId: number) =>
    api<void>(`/api/vivo/reservas/${reservaId}`, { method: "DELETE" }),
  marcarCaida: (reservaId: number) =>
    api<VivoReserva>(`/api/vivo/reservas/${reservaId}`, {
      method: "PATCH",
      body: JSON.stringify({ estado: "caida" }),
    }),
  confirmarVenta: (vivoId: number, body: { usuario: string; ventaId: number; reservaIds: number[] }) =>
    api<{ ok: boolean; ventaId: number }>(`/api/vivo/${vivoId}/confirmar-venta`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export function formatDuracion(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatMoney(n: number): string {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
