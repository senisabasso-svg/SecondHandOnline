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

function requireProveedor(req, res, next) {
  if (req.user?.rol !== "proveedor") return res.status(403).json({ error: "Acceso solo para proveedores." });
  if (req.user.idSecond == null) return res.status(403).json({ error: "Sesión de proveedor inválida." });
  next();
}

function normalizeNombre(s) {
  return String(s || "").trim();
}

function nombresCoinciden(a, b) {
  return normalizeNombre(a).localeCompare(normalizeNombre(b), undefined, { sensitivity: "accent" }) === 0;
}

/** Formato: nombreTienda+nombreProveedor (un solo + como separador) */
function parseCredencialProveedor(credencial) {
  const raw = normalizeNombre(credencial);
  const idx = raw.indexOf("+");
  if (idx <= 0 || idx === raw.length - 1) return null;
  const nombreTienda = raw.slice(0, idx).trim();
  const nombreProveedor = raw.slice(idx + 1).trim();
  if (!nombreTienda || !nombreProveedor) return null;
  return { nombreTienda, nombreProveedor };
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

app.get("/api/public/tiendas", async (_, res) => {
  try {
    const rows = await prisma.secondHand.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, logoUrl: true },
      orderBy: { nombre: "asc" },
    });
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/auth/proveedor/login", async (req, res) => {
  try {
    const { usuario, password, nombre } = req.body;
    const credencial = usuario ?? nombre;
    const credencialNorm = normalizeNombre(credencial);
    if (!credencialNorm || !password) {
      return res.status(400).json({ error: "Usuario y clave son obligatorios." });
    }
    if (!nombresCoinciden(credencialNorm, password)) {
      return res.status(401).json({ error: "Credenciales incorrectas." });
    }
    const partes = parseCredencialProveedor(credencialNorm);
    if (!partes) {
      return res.status(400).json({
        error: "Use el formato NombreTienda+NombreProveedor (ejemplo: MiTienda+María).",
      });
    }
    const tienda = await prisma.secondHand.findFirst({
      where: { activo: true, nombre: { equals: partes.nombreTienda, mode: "insensitive" } },
    });
    if (!tienda) return res.status(401).json({ error: "Credenciales incorrectas." });
    const candidatos = await prisma.proveedor.findMany({
      where: {
        idSecond: tienda.id,
        nombre: { equals: partes.nombreProveedor, mode: "insensitive" },
      },
    });
    if (candidatos.length === 0) {
      return res.status(401).json({ error: "Credenciales incorrectas." });
    }
    const prov = candidatos[0];
    res.json({
      token: signToken({ id: prov.id, rol: "proveedor", idSecond: prov.idSecond }),
      usuario: {
        id: prov.id,
        email: null,
        nombre: prov.nombre,
        rol: "proveedor",
        idSecond: prov.idSecond,
      },
      tienda: { id: tienda.id, nombre: tienda.nombre, logoUrl: tienda.logoUrl },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/auth/me", authOptional, requireAuth, async (req, res) => {
  try {
    if (req.user.rol === "proveedor") {
      const p = await prisma.proveedor.findFirst({
        where: { id: req.user.sub, idSecond: req.user.idSecond },
        select: { id: true, nombre: true, idSecond: true },
      });
      if (!p) return res.status(404).json({ error: "Proveedor no encontrado." });
      return res.json({
        id: p.id,
        email: null,
        nombre: p.nombre,
        rol: "proveedor",
        idSecond: p.idSecond,
      });
    }
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

app.get("/api/proveedor/tienda", authOptional, requireAuth, requireProveedor, async (req, res) => {
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

app.get("/api/proveedor/mis-prendas", authOptional, requireAuth, requireProveedor, async (req, res) => {
  try {
    const rows = await prisma.producto.findMany({
      where: { idSecond: req.user.idSecond, idProveedor: req.user.sub },
      orderBy: { id: "desc" },
      include: {
        ventaItems: {
          orderBy: { id: "desc" },
          take: 1,
          include: { venta: { select: { fecha: true } } },
        },
      },
    });
    res.json(
      rows.map((p) => {
        const vi = p.ventaItems[0];
        const vendido = p.estado === "vendido";
        return {
          id: p.id,
          descripcion: p.descripcion,
          tipoPrenda: p.tipoPrenda,
          marca: p.marca,
          color: p.color,
          talle: p.talle,
          precioVenta: p.precioVenta,
          estado: p.estado,
          vendido,
          fechaVenta: vendido && vi?.venta?.fecha ? vi.venta.fecha : null,
          precioVendido: vendido && vi ? vi.precioUnitario : null,
        };
      })
    );
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
app.use("/api/clientes", authOptional, requireAuth, requireTenant);
app.use("/api/cuentas-corrientes", authOptional, requireAuth, requireTenant);
app.use("/api/productos", authOptional, requireAuth, requireTenant);
app.use("/api/ventas", authOptional, requireAuth, requireTenant);
app.use("/api/caja", authOptional, requireAuth, requireTenant);
app.use("/api/informes", authOptional, requireAuth, requireTenant);
app.use("/api/menu-precios", authOptional, requireAuth, requireTenant);

const tw = (req) => ({ idSecond: req.user.idSecond });

const MEDIOS_PAGO = new Set(["efectivo", "tarjeta", "cuenta_corriente"]);
const TIPOS_MOVIMIENTO_CAJA = new Set(["ingreso", "egreso"]);
const TIPOS_DOCUMENTO = new Set(["cedula", "rut", "otro"]);

function mapCliente(row) {
  const cc = row.cuentaCorriente;
  return {
    id: row.id,
    nombre: row.nombre,
    tipoDocumento: row.tipoDocumento,
    numeroDocumento: row.numeroDocumento,
    tieneCuentaCorriente: Boolean(cc),
    cuentaCorriente: cc
      ? {
          id: cc.id,
          limite: cc.limite,
          saldo: cc.saldo,
          disponible: cc.limite - cc.saldo,
        }
      : null,
  };
}

function mapCuentaCorriente(row) {
  return {
    id: row.id,
    idCliente: row.idCliente,
    nombreCliente: row.cliente.nombre,
    tipoDocumento: row.cliente.tipoDocumento,
    numeroDocumento: row.cliente.numeroDocumento,
    limite: row.limite,
    saldo: row.saldo,
    disponible: row.limite - row.saldo,
  };
}

function dayBounds(d = new Date()) {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

async function getCajaAbierta(idSecond) {
  return prisma.cajaSesion.findFirst({
    where: { idSecond, cerradaEn: null },
    orderBy: { abiertaEn: "desc" },
  });
}

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

app.get("/api/clientes", async (req, res) => {
  try {
    const rows = await prisma.cliente.findMany({
      where: tw(req),
      include: { cuentaCorriente: true },
      orderBy: { nombre: "asc" },
    });
    res.json(rows.map(mapCliente));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/clientes", async (req, res) => {
  try {
    const { nombre, tipoDocumento, numeroDocumento } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: "El nombre es obligatorio." });
    const tipo = typeof tipoDocumento === "string" ? tipoDocumento.trim().toLowerCase() : "";
    if (!TIPOS_DOCUMENTO.has(tipo)) {
      return res.status(400).json({ error: "Tipo de documento inválido. Use cedula, rut u otro." });
    }
    const numDoc = String(numeroDocumento || "").trim();
    if (!numDoc) return res.status(400).json({ error: "El número de documento es obligatorio." });
    const row = await prisma.cliente.create({
      data: {
        nombre: nombre.trim(),
        tipoDocumento: tipo,
        numeroDocumento: numDoc,
        idSecond: req.user.idSecond,
      },
      include: { cuentaCorriente: true },
    });
    res.status(201).json(mapCliente(row));
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(400).json({ error: "Ya existe un cliente con ese documento en esta tienda." });
    }
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.put("/api/clientes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existente = await prisma.cliente.findFirst({ where: { id, idSecond: req.user.idSecond } });
    if (!existente) return res.status(404).json({ error: "Cliente no encontrado." });
    const { nombre, tipoDocumento, numeroDocumento } = req.body;
    const data = {};
    if (nombre !== undefined) {
      if (!String(nombre).trim()) return res.status(400).json({ error: "El nombre es obligatorio." });
      data.nombre = String(nombre).trim();
    }
    if (tipoDocumento !== undefined) {
      const tipo = String(tipoDocumento).trim().toLowerCase();
      if (!TIPOS_DOCUMENTO.has(tipo)) {
        return res.status(400).json({ error: "Tipo de documento inválido. Use cedula, rut u otro." });
      }
      data.tipoDocumento = tipo;
    }
    if (numeroDocumento !== undefined) {
      const numDoc = String(numeroDocumento).trim();
      if (!numDoc) return res.status(400).json({ error: "El número de documento es obligatorio." });
      data.numeroDocumento = numDoc;
    }
    const row = await prisma.cliente.update({
      where: { id },
      data,
      include: { cuentaCorriente: true },
    });
    res.json(mapCliente(row));
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(400).json({ error: "Ya existe un cliente con ese documento en esta tienda." });
    }
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/cuentas-corrientes", async (req, res) => {
  try {
    const rows = await prisma.cuentaCorriente.findMany({
      where: tw(req),
      include: { cliente: true },
      orderBy: { id: "desc" },
    });
    res.json(rows.map(mapCuentaCorriente));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/cuentas-corrientes", async (req, res) => {
  try {
    const { idCliente, limite } = req.body;
    const idCli = Number(idCliente);
    if (!idCli) return res.status(400).json({ error: "Debe seleccionar un cliente." });
    const importeLimite = Number(limite);
    if (!Number.isFinite(importeLimite) || importeLimite <= 0) {
      return res.status(400).json({ error: "El límite debe ser mayor a cero." });
    }
    const cliente = await prisma.cliente.findFirst({
      where: { id: idCli, idSecond: req.user.idSecond },
      include: { cuentaCorriente: true },
    });
    if (!cliente) return res.status(404).json({ error: "Cliente no encontrado." });
    if (cliente.cuentaCorriente) {
      return res.status(400).json({ error: "Este cliente ya tiene una cuenta corriente." });
    }
    const row = await prisma.cuentaCorriente.create({
      data: { idSecond: req.user.idSecond, idCliente: idCli, limite: importeLimite, saldo: 0 },
      include: { cliente: true },
    });
    res.status(201).json(mapCuentaCorriente(row));
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(400).json({ error: "Este cliente ya tiene una cuenta corriente." });
    }
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.put("/api/cuentas-corrientes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existente = await prisma.cuentaCorriente.findFirst({
      where: { id, idSecond: req.user.idSecond },
    });
    if (!existente) return res.status(404).json({ error: "Cuenta corriente no encontrada." });
    const importeLimite = Number(req.body.limite);
    if (!Number.isFinite(importeLimite) || importeLimite <= 0) {
      return res.status(400).json({ error: "El límite debe ser mayor a cero." });
    }
    if (importeLimite < existente.saldo) {
      return res.status(400).json({
        error: `El límite no puede ser menor al saldo actual ($${existente.saldo.toFixed(2)}).`,
      });
    }
    const row = await prisma.cuentaCorriente.update({
      where: { id },
      data: { limite: importeLimite },
      include: { cliente: true },
    });
    res.json(mapCuentaCorriente(row));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/cuentas-corrientes/:id/entregas", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { monto, concepto } = req.body;
    const importe = Number(monto);
    if (!Number.isFinite(importe) || importe <= 0) {
      return res.status(400).json({ error: "El monto debe ser mayor a cero." });
    }
    const cuenta = await prisma.cuentaCorriente.findFirst({
      where: { id, idSecond: req.user.idSecond },
      include: { cliente: true },
    });
    if (!cuenta) return res.status(404).json({ error: "Cuenta corriente no encontrada." });
    if (importe > cuenta.saldo) {
      return res.status(400).json({
        error: `La entrega no puede superar el saldo deudor ($${cuenta.saldo.toFixed(2)}).`,
      });
    }
    const result = await prisma.$transaction(async (tx) => {
      const mov = await tx.cuentaCorrienteMovimiento.create({
        data: {
          idSecond: req.user.idSecond,
          idCuenta: cuenta.id,
          tipo: "entrega",
          monto: importe,
          concepto: concepto?.trim() || null,
        },
      });
      const updated = await tx.cuentaCorriente.update({
        where: { id: cuenta.id },
        data: { saldo: { decrement: importe } },
        include: { cliente: true },
      });
      return { mov, cuenta: updated };
    });
    res.status(201).json({
      movimiento: {
        id: result.mov.id,
        fecha: result.mov.fecha,
        tipo: result.mov.tipo,
        monto: result.mov.monto,
        concepto: result.mov.concepto,
      },
      cuenta: mapCuentaCorriente(result.cuenta),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/cuentas-corrientes/:id/movimientos", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const cuenta = await prisma.cuentaCorriente.findFirst({
      where: { id, idSecond: req.user.idSecond },
    });
    if (!cuenta) return res.status(404).json({ error: "Cuenta corriente no encontrada." });
    const rows = await prisma.cuentaCorrienteMovimiento.findMany({
      where: { idCuenta: id, idSecond: req.user.idSecond },
      orderBy: { fecha: "desc" },
      include: { venta: { select: { id: true } } },
    });
    res.json(
      rows.map((m) => ({
        id: m.id,
        fecha: m.fecha,
        tipo: m.tipo,
        monto: m.monto,
        concepto: m.concepto,
        idVenta: m.idVenta,
        ventaNumero: m.venta?.id ?? null,
      }))
    );
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

app.put("/api/productos/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existente = await prisma.producto.findFirst({ where: { id, idSecond: req.user.idSecond } });
    if (!existente) return res.status(404).json({ error: "Producto no encontrado en su tienda." });
    const { descripcion, tipoPrenda, marca, color, condicion, precioVenta, talle, idProveedor, estado } = req.body;
    if (idProveedor) {
      const prov = await prisma.proveedor.findFirst({ where: { id: Number(idProveedor), idSecond: req.user.idSecond } });
      if (!prov) return res.status(400).json({ error: "Proveedor no vÃ¡lido para esta tienda." });
    }
    const updated = await prisma.producto.update({
      where: { id },
      data: {
        ...(descripcion !== undefined ? { descripcion } : {}),
        ...(tipoPrenda !== undefined ? { tipoPrenda: tipoPrenda || null } : {}),
        ...(marca !== undefined ? { marca: marca || null } : {}),
        ...(color !== undefined ? { color: color || null } : {}),
        ...(condicion !== undefined ? { condicion: condicion || null } : {}),
        ...(precioVenta !== undefined ? { precioVenta: Number(precioVenta) } : {}),
        ...(talle !== undefined ? { talle: talle || null } : {}),
        ...(idProveedor !== undefined ? { idProveedor: Number(idProveedor) } : {}),
        ...(estado !== undefined ? { estado } : {}),
      },
      include: { proveedor: true },
    });
    res.json({
      id: updated.id,
      descripcion: updated.descripcion,
      tipoPrenda: updated.tipoPrenda,
      marca: updated.marca,
      color: updated.color,
      condicion: updated.condicion,
      precioVenta: updated.precioVenta,
      talle: updated.talle,
      idProveedor: updated.idProveedor,
      estado: updated.estado,
      nombreProveedor: updated.proveedor?.nombre,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});
app.get("/api/caja/diario", async (req, res) => {
  try {
    const idSecond = req.user.idSecond;
    const { start, end } = dayBounds();
    const sesionAbierta = await getCajaAbierta(idSecond);
    const ventas = await prisma.venta.findMany({
      where: { idSecond, fecha: { gte: start, lte: end } },
      orderBy: { fecha: "desc" },
      include: { _count: { select: { items: true } } },
    });
    const movimientos = await prisma.cajaMovimiento.findMany({
      where: { idSecond, fecha: { gte: start, lte: end } },
      orderBy: { fecha: "desc" },
    });
    const totalDia = ventas.reduce((s, v) => s + v.total, 0);
    const totalEfectivo = ventas
      .filter((v) => v.medioPago === "efectivo")
      .reduce((s, v) => s + v.total, 0);
    const totalTarjeta = ventas
      .filter((v) => v.medioPago === "tarjeta")
      .reduce((s, v) => s + v.total, 0);
    const totalCuentaCorriente = ventas
      .filter((v) => v.medioPago === "cuenta_corriente")
      .reduce((s, v) => s + v.total, 0);
    const totalIngresos = movimientos
      .filter((m) => m.tipo === "ingreso")
      .reduce((s, m) => s + m.monto, 0);
    const totalEgresos = movimientos
      .filter((m) => m.tipo === "egreso")
      .reduce((s, m) => s + m.monto, 0);
    const efectivoEnCaja = totalEfectivo + totalIngresos - totalEgresos;
    res.json({
      sesionAbierta: Boolean(sesionAbierta),
      sesion: sesionAbierta
        ? { id: sesionAbierta.id, abiertaEn: sesionAbierta.abiertaEn, cerradaEn: sesionAbierta.cerradaEn }
        : null,
      ventas: ventas.map((v) => ({
        id: v.id,
        fecha: v.fecha,
        total: v.total,
        cantidadItems: v._count.items,
        medioPago: v.medioPago,
      })),
      movimientos: movimientos.map((m) => ({
        id: m.id,
        fecha: m.fecha,
        tipo: m.tipo,
        monto: m.monto,
        concepto: m.concepto,
      })),
      totalDia,
      totalEfectivo,
      totalTarjeta,
      totalCuentaCorriente,
      totalIngresos,
      totalEgresos,
      efectivoEnCaja,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/caja/movimientos", async (req, res) => {
  try {
    const idSecond = req.user.idSecond;
    const { tipo, monto, concepto } = req.body;
    const tipoNorm = typeof tipo === "string" ? tipo.trim().toLowerCase() : "";
    if (!TIPOS_MOVIMIENTO_CAJA.has(tipoNorm)) {
      return res.status(400).json({ error: "Tipo inválido. Use ingreso o egreso." });
    }
    const importe = Number(monto);
    if (!Number.isFinite(importe) || importe <= 0) {
      return res.status(400).json({ error: "El monto debe ser mayor a cero." });
    }
    const caja = await getCajaAbierta(idSecond);
    if (!caja) {
      return res.status(403).json({ error: "Debe abrir la caja antes de registrar movimientos." });
    }
    const row = await prisma.cajaMovimiento.create({
      data: {
        idSecond,
        idCaja: caja.id,
        tipo: tipoNorm,
        monto: importe,
        concepto: concepto?.trim() || null,
      },
    });
    res.status(201).json({
      id: row.id,
      fecha: row.fecha,
      tipo: row.tipo,
      monto: row.monto,
      concepto: row.concepto,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/caja/abrir", async (req, res) => {
  try {
    const idSecond = req.user.idSecond;
    const abierta = await getCajaAbierta(idSecond);
    if (abierta) {
      return res.status(400).json({ error: "La caja ya está abierta." });
    }
    const sesion = await prisma.cajaSesion.create({ data: { idSecond } });
    res.status(201).json({
      id: sesion.id,
      abiertaEn: sesion.abiertaEn,
      cerradaEn: sesion.cerradaEn,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/caja/cerrar", async (req, res) => {
  try {
    const idSecond = req.user.idSecond;
    const abierta = await getCajaAbierta(idSecond);
    if (!abierta) {
      return res.status(400).json({ error: "No hay caja abierta para cerrar." });
    }
    const sesion = await prisma.cajaSesion.update({
      where: { id: abierta.id },
      data: { cerradaEn: new Date() },
    });
    res.json({
      id: sesion.id,
      abiertaEn: sesion.abiertaEn,
      cerradaEn: sesion.cerradaEn,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/ventas", async (req, res) => {
  const { items, medioPago, idCliente } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Debe enviar al menos un artÃ­culo en la venta." });
  }
  const medio = typeof medioPago === "string" ? medioPago.trim().toLowerCase() : "";
  if (!MEDIOS_PAGO.has(medio)) {
    return res.status(400).json({ error: "Seleccione medio de pago: efectivo, tarjeta o cuenta corriente." });
  }
  const idSecond = req.user.idSecond;
  const idCli = idCliente != null && idCliente !== "" ? Number(idCliente) : null;
  if (medio === "cuenta_corriente" && !idCli) {
    return res.status(400).json({ error: "Debe seleccionar un cliente para venta en cuenta corriente." });
  }
  try {
    const caja = await getCajaAbierta(idSecond);
    if (!caja) {
      return res.status(403).json({ error: "Debe abrir la caja antes de registrar ventas." });
    }
    let cliente = null;
    let cuenta = null;
    if (idCli) {
      cliente = await prisma.cliente.findFirst({
        where: { id: idCli, idSecond },
        include: { cuentaCorriente: true },
      });
      if (!cliente) return res.status(400).json({ error: "Cliente no válido para esta tienda." });
      cuenta = cliente.cuentaCorriente;
    }
    if (medio === "cuenta_corriente") {
      if (!cuenta) {
        return res.status(400).json({ error: "El cliente seleccionado no tiene cuenta corriente." });
      }
    }
    const ids = items.map((i) => Number(i.idProducto));
    const productos = await prisma.producto.findMany({ where: { id: { in: ids }, idSecond, estado: "disponible" } });
    if (productos.length !== ids.length) {
      return res.status(400).json({ error: "AlgÃºn producto no existe, no estÃ¡ disponible o no pertenece a su tienda." });
    }
    const total = items.reduce((s, i) => s + Number(i.precioUnitario || 0), 0);
    if (medio === "cuenta_corriente") {
      const disponible = cuenta.limite - cuenta.saldo;
      if (total > disponible) {
        return res.status(400).json({
          error: `Crédito insuficiente. Disponible: $${disponible.toFixed(2)}, venta: $${total.toFixed(2)}.`,
        });
      }
    }
    const result = await prisma.$transaction(async (tx) => {
      const venta = await tx.venta.create({
        data: {
          total,
          idSecond,
          idCaja: caja.id,
          medioPago: medio,
          idCliente: idCli,
        },
      });
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
      if (medio === "cuenta_corriente" && cuenta) {
        await tx.cuentaCorrienteMovimiento.create({
          data: {
            idSecond,
            idCuenta: cuenta.id,
            tipo: "cargo",
            monto: total,
            concepto: `Venta #${venta.id}`,
            idVenta: venta.id,
          },
        });
        await tx.cuentaCorriente.update({
          where: { id: cuenta.id },
          data: { saldo: { increment: total } },
        });
      }
      return venta;
    });
    res.status(201).json({
      id: result.id,
      total: result.total,
      fecha: result.fecha,
      medioPago: result.medioPago,
      idCliente: result.idCliente,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/informes/movimientos-caja", async (req, res) => {
  try {
    const { month, from, to } = req.query;
    let fechaWhere = {};
    if (month && typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(new Date(start).setMonth(start.getMonth() + 1));
      fechaWhere = { gte: start, lt: end };
    } else if (from || to) {
      const gte = from ? new Date(String(from)) : undefined;
      const lt = to ? new Date(String(to)) : undefined;
      fechaWhere = { ...(gte ? { gte } : {}), ...(lt ? { lt } : {}) };
    }
    const where = {
      idSecond: req.user.idSecond,
      ...(Object.keys(fechaWhere).length ? { fecha: fechaWhere } : {}),
    };
    const rows = await prisma.cajaMovimiento.findMany({
      where,
      orderBy: { fecha: "desc" },
    });
    const totalIngresos = rows.filter((r) => r.tipo === "ingreso").reduce((s, r) => s + r.monto, 0);
    const totalEgresos = rows.filter((r) => r.tipo === "egreso").reduce((s, r) => s + r.monto, 0);
    res.json({
      movimientos: rows.map((r) => ({
        id: r.id,
        fecha: r.fecha,
        tipo: r.tipo,
        monto: r.monto,
        concepto: r.concepto,
      })),
      totalIngresos,
      totalEgresos,
      neto: totalIngresos - totalEgresos,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/informes", async (req, res) => {
  try {
    const { month, from, to } = req.query;
    let where = { ...tw(req) };
    if (month && typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(new Date(start).setMonth(start.getMonth() + 1));
      where = { ...where, venta: { fecha: { gte: start, lt: end } } };
    } else if (from || to) {
      const gte = from ? new Date(String(from)) : undefined;
      const lt = to ? new Date(String(to)) : undefined;
      where = { ...where, venta: { fecha: { ...(gte ? { gte } : {}), ...(lt ? { lt } : {}) } } };
    }
    const items = await prisma.ventaItem.findMany({
      where,
      include: { venta: true, producto: { include: { proveedor: true } } },
      orderBy: [{ venta: { fecha: "desc" } }, { idVenta: "desc" }],
    });
    res.json(
      items.map((vi) => ({
        idVenta: vi.venta.id,
        fechaVenta: vi.venta.fecha,
        totalVenta: vi.venta.total,
        medioPago: vi.venta.medioPago,
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
    const { month, from, to } = req.query;
    let where = { idSecond: req.user.idSecond, producto: { idProveedor: id } };
    if (month && typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(new Date(start).setMonth(start.getMonth() + 1));
      where = { ...where, venta: { fecha: { gte: start, lt: end } } };
    } else if (from || to) {
      const gte = from ? new Date(String(from)) : undefined;
      const lt = to ? new Date(String(to)) : undefined;
      where = { ...where, venta: { fecha: { ...(gte ? { gte } : {}), ...(lt ? { lt } : {}) } } };
    }
    const items = await prisma.ventaItem.findMany({
      where,
      include: { venta: true, producto: { include: { proveedor: true } } },
      orderBy: [{ venta: { fecha: "desc" } }, { idVenta: "desc" }],
    });
    res.json(
      items.map((vi) => ({
        idVenta: vi.venta.id,
        fechaVenta: vi.venta.fecha,
        totalVenta: vi.venta.total,
        medioPago: vi.venta.medioPago,
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
    const { month, from, to } = req.query;
    let where = { idSecond: req.user.idSecond, producto: { idProveedor: id } };
    if (month && typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(new Date(start).setMonth(start.getMonth() + 1));
      where = { ...where, venta: { fecha: { gte: start, lt: end } } };
    } else if (from || to) {
      const gte = from ? new Date(String(from)) : undefined;
      const lt = to ? new Date(String(to)) : undefined;
      where = { ...where, venta: { fecha: { ...(gte ? { gte } : {}), ...(lt ? { lt } : {}) } } };
    }
    const agg = await prisma.ventaItem.aggregate({
      where,
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