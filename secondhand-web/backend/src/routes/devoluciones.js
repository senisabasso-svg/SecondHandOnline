/** Rutas /api/devoluciones/* — sección aislada. No modifica ventas existentes. */

const MEDIOS_REINTEGRO = new Set(["efectivo", "tarjeta", "cuenta_corriente"]);

export function mountDevolucionesRoutes(app, { prisma, getCajaAbierta }) {
  function mapDevolucion(row) {
    return {
      id: row.id,
      idVenta: row.idVenta,
      fecha: row.fecha,
      monto: row.monto,
      medioReintegro: row.medioReintegro,
      motivo: row.motivo,
      items: (row.items || []).map((it) => ({
        id: it.id,
        idVentaItem: it.idVentaItem,
        idProducto: it.idProducto,
        precioUnitario: it.precioUnitario,
        descripcion: it.producto?.descripcion ?? null,
      })),
    };
  }

  function mapVentaParaDevolucion(venta, returnedItemIds) {
    const returned = new Set(returnedItemIds);
    return {
      id: venta.id,
      fecha: venta.fecha,
      total: venta.total,
      medioPago: venta.medioPago,
      idCliente: venta.idCliente,
      nombreCliente: venta.cliente?.nombre ?? null,
      items: venta.items.map((it) => ({
        id: it.id,
        idProducto: it.idProducto,
        precioUnitario: it.precioUnitario,
        descripcion: it.producto?.descripcion ?? null,
        marca: it.producto?.marca ?? null,
        yaDevuelto: returned.has(it.id),
      })),
    };
  }

  // GET /api/devoluciones — historial reciente
  app.get("/api/devoluciones", async (req, res) => {
    try {
      const rows = await prisma.devolucion.findMany({
        where: { idSecond: req.user.idSecond },
        include: {
          items: { include: { producto: true } },
        },
        orderBy: { fecha: "desc" },
        take: 100,
      });
      res.json(rows.map(mapDevolucion));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  });

  // GET /api/devoluciones/venta/:id — detalle de venta con ítems ya devueltos
  app.get("/api/devoluciones/venta/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const venta = await prisma.venta.findFirst({
        where: { id, idSecond: req.user.idSecond },
        include: {
          cliente: true,
          items: { include: { producto: true }, orderBy: { id: "asc" } },
        },
      });
      if (!venta) return res.status(404).json({ error: "Venta no encontrada." });

      const yaDevueltos = await prisma.devolucionItem.findMany({
        where: { idVentaItem: { in: venta.items.map((i) => i.id) } },
        select: { idVentaItem: true },
      });
      res.json(mapVentaParaDevolucion(venta, yaDevueltos.map((d) => d.idVentaItem)));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  });

  // GET /api/devoluciones/buscar?q= — por id de venta o id de producto
  app.get("/api/devoluciones/buscar", async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      if (!q) return res.status(400).json({ error: "Ingrese un número de venta o ID de producto." });
      const n = Number(q);
      if (!Number.isInteger(n) || n <= 0) {
        return res.status(400).json({ error: "Busque por número de venta o ID de producto." });
      }

      const idSecond = req.user.idSecond;
      let ventas = await prisma.venta.findMany({
        where: { id: n, idSecond },
        include: {
          cliente: true,
          items: { include: { producto: true }, orderBy: { id: "asc" } },
        },
        take: 1,
      });

      if (ventas.length === 0) {
        ventas = await prisma.venta.findMany({
          where: {
            idSecond,
            items: { some: { idProducto: n } },
          },
          include: {
            cliente: true,
            items: { include: { producto: true }, orderBy: { id: "asc" } },
          },
          orderBy: { fecha: "desc" },
          take: 20,
        });
      }

      const allItemIds = ventas.flatMap((v) => v.items.map((i) => i.id));
      const yaDevueltos = allItemIds.length
        ? await prisma.devolucionItem.findMany({
            where: { idVentaItem: { in: allItemIds } },
            select: { idVentaItem: true },
          })
        : [];

      res.json(ventas.map((v) => mapVentaParaDevolucion(v, yaDevueltos.map((d) => d.idVentaItem))));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  });

  // POST /api/devoluciones
  app.post("/api/devoluciones", async (req, res) => {
    try {
      const idSecond = req.user.idSecond;
      const { idVenta, ventaItemIds, medioReintegro, motivo } = req.body || {};
      if (!idVenta || !Array.isArray(ventaItemIds) || ventaItemIds.length === 0) {
        return res.status(400).json({ error: "Indique la venta y al menos un ítem a devolver." });
      }

      const venta = await prisma.venta.findFirst({
        where: { id: Number(idVenta), idSecond },
        include: {
          cliente: { include: { cuentaCorriente: true } },
          items: { include: { producto: true } },
        },
      });
      if (!venta) return res.status(404).json({ error: "Venta no encontrada." });

      const ids = [...new Set(ventaItemIds.map(Number))];
      const items = venta.items.filter((it) => ids.includes(it.id));
      if (items.length !== ids.length) {
        return res.status(400).json({ error: "Algún ítem no pertenece a esta venta." });
      }

      const ya = await prisma.devolucionItem.findMany({
        where: { idVentaItem: { in: ids } },
        select: { idVentaItem: true },
      });
      if (ya.length > 0) {
        return res.status(409).json({ error: "Alguna prenda ya fue devuelta." });
      }

      const medioDefault = (venta.medioPago || "efectivo").toLowerCase();
      const medio =
        typeof medioReintegro === "string" && medioReintegro.trim()
          ? medioReintegro.trim().toLowerCase()
          : medioDefault;
      if (!MEDIOS_REINTEGRO.has(medio)) {
        return res.status(400).json({ error: "Medio de reintegro no válido." });
      }

      if (medio === "cuenta_corriente") {
        if (!venta.idCliente || !venta.cliente?.cuentaCorriente) {
          return res.status(400).json({
            error: "Esta venta no tiene cuenta corriente asociada. Elegí efectivo o tarjeta.",
          });
        }
      }

      let caja = null;
      if (medio === "efectivo") {
        caja = await getCajaAbierta(idSecond);
        if (!caja) {
          return res.status(403).json({ error: "Debe abrir la caja para reintegrar en efectivo." });
        }
      }

      const monto = items.reduce((s, it) => s + Number(it.precioUnitario), 0);

      const result = await prisma.$transaction(async (tx) => {
        const devolucion = await tx.devolucion.create({
          data: {
            idSecond,
            idVenta: venta.id,
            idCaja: caja?.id ?? null,
            monto,
            medioReintegro: medio,
            motivo: motivo ? String(motivo).trim() || null : null,
          },
        });

        for (const it of items) {
          await tx.devolucionItem.create({
            data: {
              idSecond,
              idDevolucion: devolucion.id,
              idVentaItem: it.id,
              idProducto: it.idProducto,
              precioUnitario: it.precioUnitario,
            },
          });

          const p = it.producto;
          if (p.cantidad == null) {
            await tx.producto.update({
              where: { id: p.id },
              data: { estado: "disponible" },
            });
          } else {
            await tx.producto.update({
              where: { id: p.id },
              data: {
                cantidad: { increment: 1 },
                estado: "disponible",
              },
            });
          }
        }

        if (medio === "efectivo" && caja) {
          await tx.cajaMovimiento.create({
            data: {
              idSecond,
              idCaja: caja.id,
              tipo: "egreso",
              monto,
              concepto: `Devolución venta #${venta.id}`,
            },
          });
        }

        if (medio === "cuenta_corriente" && venta.cliente?.cuentaCorriente) {
          const cuenta = venta.cliente.cuentaCorriente;
          await tx.cuentaCorrienteMovimiento.create({
            data: {
              idSecond,
              idCuenta: cuenta.id,
              tipo: "devolucion",
              monto,
              concepto: `Devolución venta #${venta.id}`,
            },
          });
          await tx.cuentaCorriente.update({
            where: { id: cuenta.id },
            data: { saldo: { decrement: monto } },
          });
        }

        return tx.devolucion.findUnique({
          where: { id: devolucion.id },
          include: { items: { include: { producto: true } } },
        });
      });

      res.status(201).json(mapDevolucion(result));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  });
}
