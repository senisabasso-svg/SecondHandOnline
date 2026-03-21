import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "cambiar-en-produccion";

app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()) : true, credentials: true }));
app.use(express.json());

function signToken(user) {
  return jwt.sign({ sub: user.id, rol: user.rol, idSecond: user.idSecond }, JWT_SECRET, { expiresIn: "7d" });
}

function authOptional(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) { req.user = null; return next(); }
  try { req.user = jwt.verify(h.slice(7), JWT_SECRET); } catch { req.user = null; }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user?.sub) return res.status(401).json({ error: "No autorizado. Inicie sesiÃ³n." });
  next();
}

function requireTenant(req, res, next) {
  if (req.user.rol === "superadmin") return res.status(403).json({ error: "Use el panel de superadmin para gestionar tiendas." });
  if (req.user.idSecond == null) return res.status(403).json({ error: "Usuario sin tienda asignada." });
  next();
}

function requireSuperadmin(req, res, next) {
  if (req.user?.rol !== "superadmin") return res.status(403).json({ error: "Solo superadministrador." });
  next();
}

app.get("/health", (_, res) => res.json({ ok: true }));

// Detalles de la tienda del usuario autenticado
app.get("/api/tienda", authOptional, requireAuth, requireTenant, async (req, res) => {
  try {
    const sh = await prisma.secondHand.findUnique({
      where: { id: req.user.idSecond },
      select: { id: true, nombre: true, logoUrl: true },
    });
    if (!sh) return res.status(404).json({ error: "Tienda no encontrada." });
    res.json(sh);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Correo y contraseÃ±a son obligatorios." });
    const u = await prisma.usuario.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!u || !(await bcrypt.compare(password, u.passwordHash))) return res.status(401).json({ error: "Credenciales incorrectas." });
    res.json({
      token: signToken({ id: u.id, rol: u.rol, idSecond: u.idSecond }),
      usuario: { id: u.id, email: u.email, nombre: u.nombre, rol: u.rol, idSecond: u.idSecond },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/auth/me", authOptional, requireAuth, async (req, res) => {
  try {
    const u = await prisma.usuario.findUnique({
      where: { id: req.user.sub },
      select: { id: true, email: true, nombre: true, rol: true, idSecond: true },
    });
    if (!u) return res.status(404).json({ error: "Usuario no encontrado." });
    res.json(u);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/super/second-hands", authOptional, requireAuth, requireSuperadmin, async (_, res) => {
  try {
    res.json(await prisma.secondHand.findMany({ orderBy: { id: "desc" } }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/super/second-hands", authOptional, requireAuth, requireSuperadmin, async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: "El nombre de la tienda es obligatorio." });
    const row = await prisma.secondHand.create({ data: { nombre: nombre.trim(), activo: true } });
    res.status(201).json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.put("/api/super/second-hands/:id", authOptional, requireAuth, requireSuperadmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nombre, activo, logoUrl } = req.body;
    const updateData = {};
    if (nombre !== undefined) updateData.nombre = nombre?.trim() || null;
    if (activo !== undefined) updateData.activo = Boolean(activo);
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl?.trim() || null;
    const row = await prisma.secondHand.update({ where: { id }, data: updateData });
    res.json(row);
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Tienda no encontrada." });
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/super/usuarios", authOptional, requireAuth, requireSuperadmin, async (req, res) => {
  try {
    const { email, password, idSecond, nombre, rol } = req.body;
    if (!email || !password || idSecond == null) {
      return res.status(400).json({ error: "Correo, contraseÃ±a e idSecond (ID de tienda) son obligatorios." });
    }
    const r = rol === "operador" ? "operador" : "admin";
    const sh = await prisma.secondHand.findUnique({ where: { id: Number(idSecond) } });
    if (!sh) return res.status(400).json({ error: "No existe una tienda con ese idSecond." });
    const row = await prisma.usuario.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash: await bcrypt.hash(password, 10),
        nombre: nombre?.trim() || null,
        rol: r,
        idSecond: Number(idSecond),
      },
    });
    res.status(201).json({ id: row.id, email: row.email, nombre: row.nombre, rol: row.rol, idSecond: row.idSecond });
  } catch (e) {
    if (e.code === "P2002") return res.status(400).json({ error: "Ese correo ya estÃ¡ registrado." });
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.use("/api/proveedores", authOptional, requireAuth, requireTenant);
app.use("/api/productos", authOptional, requireAuth, requireTenant);
app.use("/api/ventas", authOptional, requireAuth, requireTenant);
app.use("/api/informes", authOptional, requireAuth, requireTenant);
app.use("/api/menu-precios", authOptional, requireAuth, requireTenant);

const tw = (req) => ({ idSecond: req.user.idSecond });

app.get("/api/proveedores", async (req, res) => {
  try {
    res.json(await prisma.proveedor.findMany({ where: tw(req), orderBy: { nombre: "asc" } }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/proveedores", async (req, res) => {
  try {
    const { nombre, telefono, email } = req.body;
    if (!nombre) return res.status(400).json({ error: "El nombre es obligatorio." });
    const row = await prisma.proveedor.create({
      data: { nombre, telefono: telefono || null, email: email || null, idSecond: req.user.idSecond },
    });
    res.status(201).json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/productos", async (req, res) => {
  try {
    const rows = await prisma.producto.findMany({ where: tw(req), include: { proveedor: true }, orderBy: { id: "desc" } });
    res.json(
      rows.map((p) => ({
        id: p.id,
        descripcion: p.descripcion,
        tipoPrenda: p.tipoPrenda,
        marca: p.marca,
        color: p.color,
        condicion: p.condicion,
        precioVenta: p.precioVenta,
        talle: p.talle,
        idProveedor: p.idProveedor,
        estado: p.estado,
        nombreProveedor: p.proveedor?.nombre,
      }))
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/productos/disponibles", async (req, res) => {
  try {
    const rows = await prisma.producto.findMany({
      where: { ...tw(req), estado: "disponible" },
      include: { proveedor: true },
      orderBy: { id: "desc" },
    });
    res.json(
      rows.map((p) => ({
        id: p.id,
        descripcion: p.descripcion,
        tipoPrenda: p.tipoPrenda,
        marca: p.marca,
        color: p.color,
        condicion: p.condicion,
        precioVenta: p.precioVenta,
        talle: p.talle,
        idProveedor: p.idProveedor,
        estado: p.estado,
        nombreProveedor: p.proveedor?.nombre,
      }))
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/productos", async (req, res) => {
  try {
    const { descripcion, tipoPrenda, marca, color, condicion, precioVenta, talle, idProveedor, estado } = req.body;
    if (!descripcion || precioVenta == null || !idProveedor) {
      return res.status(400).json({ error: "DescripciÃ³n, precio de venta e identificador de proveedor son obligatorios." });
    }
    const prov = await prisma.proveedor.findFirst({ where: { id: Number(idProveedor), idSecond: req.user.idSecond } });
    if (!prov) return res.status(400).json({ error: "Proveedor no vÃ¡lido para esta tienda." });
    const row = await prisma.producto.create({
      data: {
        descripcion,
        tipoPrenda: tipoPrenda || null,
        marca: marca || null,
        color: color || null,
        condicion: condicion || null,
        precioVenta: Number(precioVenta),
        talle: talle || null,
        idProveedor: Number(idProveedor),
        idSecond: req.user.idSecond,
        estado: estado || "disponible",
      },
      include: { proveedor: true },
    });
    res.status(201).json({
      id: row.id,
      descripcion: row.descripcion,
      tipoPrenda: row.tipoPrenda,
      marca: row.marca,
      color: row.color,
      condicion: row.condicion,
      precioVenta: row.precioVenta,
      talle: row.talle,
      idProveedor: row.idProveedor,
      estado: row.estado,
      nombreProveedor: row.proveedor?.nombre,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/ventas", async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Debe enviar al menos un artÃ­culo en la venta." });
  }
  const idSecond = req.user.idSecond;
  try {
    const ids = items.map((i) => Number(i.idProducto));
    const productos = await prisma.producto.findMany({ where: { id: { in: ids }, idSecond, estado: "disponible" } });
    if (productos.length !== ids.length) {
      return res.status(400).json({ error: "AlgÃºn producto no existe, no estÃ¡ disponible o no pertenece a su tienda." });
    }
    const total = items.reduce((s, i) => s + Number(i.precioUnitario || 0), 0);
    const result = await prisma.$transaction(async (tx) => {
      const venta = await tx.venta.create({ data: { total, idSecond } });
      for (const it of items) {
        await tx.ventaItem.create({
          data: {
            idVenta: venta.id,
            idProducto: Number(it.idProducto),
            precioUnitario: Number(it.precioUnitario),
            idSecond,
          },
        });
        await tx.producto.update({ where: { id: Number(it.idProducto) }, data: { estado: "vendido" } });
      }
      return venta;
    });
    res.status(201).json({ id: result.id, total: result.total, fecha: result.fecha });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/informes", async (req, res) => {
  try {
    const items = await prisma.ventaItem.findMany({
      where: tw(req),
      include: { venta: true, producto: { include: { proveedor: true } } },
      orderBy: [{ venta: { fecha: "desc" } }, { idVenta: "desc" }],
    });
    res.json(
      items.map((vi) => ({
        idVenta: vi.venta.id,
        fechaVenta: vi.venta.fecha,
        totalVenta: vi.venta.total,
        idProducto: vi.producto.id,
        descripcionProducto: vi.producto.descripcion,
        tipoPrenda: vi.producto.tipoPrenda,
        marca: vi.producto.marca,
        color: vi.producto.color,
        precioUnitario: vi.precioUnitario,
        idProveedor: vi.producto.proveedor.id,
        nombreProveedor: vi.producto.proveedor.nombre,
        telefonoProveedor: vi.producto.proveedor.telefono,
      }))
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/informes/proveedor/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const prov = await prisma.proveedor.findFirst({ where: { id, idSecond: req.user.idSecond } });
    if (!prov) return res.status(404).json({ error: "Proveedor no encontrado." });
    const items = await prisma.ventaItem.findMany({
      where: { idSecond: req.user.idSecond, producto: { idProveedor: id } },
      include: { venta: true, producto: { include: { proveedor: true } } },
      orderBy: [{ venta: { fecha: "desc" } }, { idVenta: "desc" }],
    });
    res.json(
      items.map((vi) => ({
        idVenta: vi.venta.id,
        fechaVenta: vi.venta.fecha,
        totalVenta: vi.venta.total,
        idProducto: vi.producto.id,
        descripcionProducto: vi.producto.descripcion,
        tipoPrenda: vi.producto.tipoPrenda,
        marca: vi.producto.marca,
        color: vi.producto.color,
        precioUnitario: vi.precioUnitario,
        idProveedor: vi.producto.proveedor.id,
        nombreProveedor: vi.producto.proveedor.nombre,
        telefonoProveedor: vi.producto.proveedor.telefono,
      }))
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/informes/proveedor/:id/total", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const prov = await prisma.proveedor.findFirst({ where: { id, idSecond: req.user.idSecond } });
    if (!prov) return res.status(404).json({ error: "Proveedor no encontrado." });
    const agg = await prisma.ventaItem.aggregate({
      where: { idSecond: req.user.idSecond, producto: { idProveedor: id } },
      _sum: { precioUnitario: true },
    });
    res.json({ total: agg._sum.precioUnitario ?? 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/menu-precios", async (req, res) => {
  try {
    res.json(await prisma.menuPrecio.findMany({ where: tw(req), orderBy: { id: "asc" } }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/menu-precios", async (req, res) => {
  try {
    const { nombre, precio } = req.body;
    if (!nombre || precio == null) return res.status(400).json({ error: "Nombre y precio son obligatorios." });
    const row = await prisma.menuPrecio.create({
      data: { nombre, precio: Number(precio), idSecond: req.user.idSecond },
    });
    res.status(201).json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.listen(PORT, () => console.log(`API SecondHand en http://localhost:${PORT}`));