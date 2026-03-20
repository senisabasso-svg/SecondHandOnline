import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DATA_DIR = path.resolve(
  path.join(process.cwd(), "data_export")
);

const readJson = (name) =>
  JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${name}.json`), "utf8"));

async function ensureSecondHandAndUser(email) {
  // Crear o reutilizar la tienda de Romina
  let tienda = await prisma.secondHand.findFirst({
    where: { nombre: { contains: "Romina", mode: "insensitive" } },
  });
  if (!tienda) {
    tienda = await prisma.secondHand.create({
      data: { nombre: "Tienda Romina", activo: true },
    });
  }

  // Crear o asociar usuario
  let user = await prisma.usuario.findUnique({ where: { email } });
  if (!user) {
    const hash = await bcrypt.hash("cambiar123", 10);
    user = await prisma.usuario.create({
      data: {
        email,
        passwordHash: hash,
        nombre: "Romina",
        rol: "admin",
        idSecond: tienda.id,
      },
    });
  } else if (user.idSecond == null) {
    user = await prisma.usuario.update({
      where: { id: user.id },
      data: { idSecond: tienda.id },
    });
  }

  return { tiendaId: tienda.id, userId: user.id };
}

async function clearSecondHandData(idSecond) {
  // Borrar en orden por FK
  await prisma.ventaItem.deleteMany({ where: { idSecond } });
  await prisma.venta.deleteMany({ where: { idSecond } });
  await prisma.producto.deleteMany({ where: { idSecond } });
  await prisma.proveedor.deleteMany({ where: { idSecond } });
  await prisma.menuPrecio.deleteMany({ where: { idSecond } });
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const email = "romina@gmail.com";
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "Falta DATABASE_URL. Defínelo en el entorno o en un archivo .env"
    );
  }
  if (!fs.existsSync(DATA_DIR)) {
    throw new Error(`No se encuentra la carpeta de datos: ${DATA_DIR}`);
  }

  const { tiendaId } = await ensureSecondHandAndUser(email);

  // Limpiar datos previos de esa tienda para evitar duplicados
  await clearSecondHandData(tiendaId);

  const proveedores = readJson("proveedores");
  const productos = readJson("productos");
  const ventas = readJson("ventas");
  const ventaItems = readJson("venta_items");

  // Importar proveedores
  if (proveedores.length) {
    const data = proveedores.map((p) => ({
      id: p.id,
      idSecond: tiendaId,
      nombre: p.nombre,
      telefono: p.telefono || null,
      email: p.email || null,
    }));
    for (const batch of chunk(data, 500)) {
      await prisma.proveedor.createMany({ data: batch });
    }
  }

  // Importar productos
  if (productos.length) {
    const data = productos.map((p) => ({
      id: p.id,
      idSecond: tiendaId,
      descripcion: p.descripcion,
      tipoPrenda: p.tipo_prenda || null,
      marca: p.marca || null,
      color: p.color || null,
      condicion: p.condicion || null,
      precioVenta: Number(p.precio_venta),
      talle: p.talle || null,
      idProveedor: p.id_proveedor,
      estado: p.estado || "disponible",
    }));
    for (const batch of chunk(data, 500)) {
      await prisma.producto.createMany({ data: batch });
    }
  }

  // Importar ventas
  if (ventas.length) {
    const data = ventas.map((v) => ({
      id: v.id,
      idSecond: tiendaId,
      fecha: new Date(v.fecha),
      total: Number(v.total),
    }));
    for (const batch of chunk(data, 500)) {
      await prisma.venta.createMany({ data: batch });
    }
  }

  // Importar venta_items
  if (ventaItems.length) {
    const data = ventaItems.map((vi) => ({
      id: vi.id,
      idSecond: tiendaId,
      idVenta: vi.id_venta,
      idProducto: vi.id_producto,
      precioUnitario: Number(vi.precio_unitario),
    }));
    for (const batch of chunk(data, 500)) {
      await prisma.ventaItem.createMany({ data: batch });
    }
  }

  console.log("Importación finalizada para tienda", tiendaId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
