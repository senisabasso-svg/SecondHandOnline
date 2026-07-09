import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Falta DATABASE_URL para conectarse a la base de datos.");
  }
  // Borrado en orden por dependencias
  await prisma.ventaItem.deleteMany({});
  await prisma.venta.deleteMany({});
  await prisma.cuentaCorrienteMovimiento.deleteMany({});
  await prisma.cuentaCorriente.deleteMany({});
  await prisma.cliente.deleteMany({});
  await prisma.cajaMovimiento.deleteMany({});
  await prisma.cajaSesion.deleteMany({});
  await prisma.producto.deleteMany({});
  await prisma.proveedor.deleteMany({});
  console.log("Tablas limpiadas: venta_items, ventas, productos, proveedores");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
