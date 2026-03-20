import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const up = await prisma.secondHand.update({ where: { id: 2 }, data: { logoUrl: "/romilogo.jpeg" } });
  console.log({ id: up.id, nombre: up.nombre, logoUrl: up.logoUrl });
}

main().catch(e=>{console.error(e); process.exit(1);}).finally(async()=>{ await prisma.$disconnect(); });
