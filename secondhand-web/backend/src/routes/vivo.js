/** Rutas /api/vivo/* — sección Vivo TikTok (aislada del resto del sistema). */

export function mountVivoRoutes(app, { prisma }) {
  const itemInclude = {
    producto: { include: { proveedor: true } },
    reservas: { orderBy: { orden: "asc" } },
  };

  async function findVivoForTenant(idSecond, vivoId) {
    return prisma.vivo.findFirst({
      where: { id: Number(vivoId), idSecond },
      include: { items: { include: itemInclude, orderBy: { orden: "asc" } } },
    });
  }

  async function findItemForTenant(idSecond, itemId) {
    return prisma.vivoItem.findFirst({
      where: { id: Number(itemId), vivo: { idSecond } },
      include: { vivo: true, producto: { include: { proveedor: true } }, reservas: { orderBy: { orden: "asc" } } },
    });
  }

  async function findReservaForTenant(idSecond, reservaId) {
    return prisma.vivoReserva.findFirst({
      where: { id: Number(reservaId), vivoItem: { vivo: { idSecond } } },
      include: { vivoItem: { include: { reservas: { orderBy: { orden: "asc" } }, vivo: true } } },
    });
  }

  function mapItem(row) {
    const p = row.producto;
    return {
      id: row.id,
      vivoId: row.vivoId,
      productoId: row.productoId,
      codigo: row.codigo,
      precioVivo: row.precioVivo,
      descripcionLibre: row.descripcionLibre,
      estado: row.estado,
      orden: row.orden,
      createdAt: row.createdAt,
      descripcion: p?.descripcion ?? row.descripcionLibre,
      marca: p?.marca ?? null,
      talle: p?.talle ?? null,
      color: p?.color ?? null,
      precioLista: p?.precioVenta ?? null,
      nombreProveedor: p?.proveedor?.nombre ?? null,
      reservas: (row.reservas || []).map(mapReserva),
    };
  }

  function mapReserva(r) {
    return {
      id: r.id,
      vivoItemId: r.vivoItemId,
      usuario: r.usuario,
      orden: r.orden,
      estado: r.estado,
      ventaId: r.ventaId,
      createdAt: r.createdAt,
    };
  }

  function mapVivo(row, { withItems = true } = {}) {
    const items = row.items || [];
    const reservasCount = items.reduce((n, it) => n + (it.reservas?.length || 0), 0);
    const adjudicado = items
      .filter((it) => it.estado === "vendida" || it.estado === "reservada")
      .reduce((s, it) => s + (it.reservas?.length ? it.precioVivo : 0), 0);
    const base = {
      id: row.id,
      titulo: row.titulo,
      plataforma: row.plataforma,
      inicio: row.inicio,
      fin: row.fin,
      estado: row.estado,
      createdAt: row.createdAt,
      prendasMostradas: items.length,
      reservas: reservasCount,
      totalAdjudicado: adjudicado,
    };
    if (!withItems) return base;
    return { ...base, items: items.map(mapItem) };
  }

  function duracionMs(inicio, fin) {
    const end = fin ? new Date(fin).getTime() : Date.now();
    return Math.max(0, end - new Date(inicio).getTime());
  }

  async function siguienteCodigo(tx, vivoId) {
    const items = await tx.vivoItem.findMany({
      where: { vivoId },
      select: { codigo: true },
    });
    const nums = items
      .map((i) => i.codigo)
      .filter((c) => /^\d+$/.test(c))
      .map((c) => Number(c));
    if (nums.length === 0) return "1";
    return String(Math.max(...nums) + 1);
  }

  async function resolverItemEnPantalla(tx, item) {
    const tieneReservas = item.reservas?.length > 0;
    const nuevoEstado = tieneReservas ? "reservada" : "liberada";
    if (item.estado === "en_pantalla") {
      await tx.vivoItem.update({ where: { id: item.id }, data: { estado: nuevoEstado } });
    }
  }

  function catalogoWhere(idSecond) {
    return {
      idSecond,
      estado: "disponible",
      OR: [{ cantidad: null }, { cantidad: { gt: 0 } }],
    };
  }

  // GET /api/vivo/actual
  app.get("/api/vivo/actual", async (req, res) => {
    try {
      const vivo = await prisma.vivo.findFirst({
        where: { idSecond: req.user.idSecond, estado: "abierto" },
        include: { items: { include: itemInclude, orderBy: { orden: "asc" } } },
      });
      res.json(vivo ? mapVivo(vivo) : null);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  });

  // GET /api/vivo — historial
  app.get("/api/vivo", async (req, res) => {
    try {
      const rows = await prisma.vivo.findMany({
        where: { idSecond: req.user.idSecond },
        include: { items: { include: { reservas: true } } },
        orderBy: { inicio: "desc" },
      });
      res.json(
        rows.map((v) => ({
          ...mapVivo(v, { withItems: false }),
          duracionMs: duracionMs(v.inicio, v.fin),
        }))
      );
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  });

  // POST /api/vivo — abrir
  app.post("/api/vivo", async (req, res) => {
    try {
      const idSecond = req.user.idSecond;
      const abierto = await prisma.vivo.findFirst({
        where: { idSecond, estado: "abierto" },
      });
      if (abierto) {
        return res.status(409).json({ error: "Ya hay un vivo abierto. Cerralo antes de empezar otro." });
      }
      const { titulo, plataforma } = req.body || {};
      const vivo = await prisma.vivo.create({
        data: {
          idSecond,
          titulo: titulo ? String(titulo).trim() || null : null,
          plataforma: plataforma ? String(plataforma).trim() || "tiktok" : "tiktok",
          estado: "abierto",
        },
        include: { items: { include: itemInclude } },
      });
      res.status(201).json(mapVivo(vivo));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  });

  // GET /api/vivo/:id/catalogo — antes de :id genérico en orden de registro no importa en express si paths are distinct
  app.get("/api/vivo/:id/catalogo", async (req, res) => {
    try {
      const vivo = await findVivoForTenant(req.user.idSecond, req.params.id);
      if (!vivo) return res.status(404).json({ error: "Vivo no encontrado." });
      const rows = await prisma.producto.findMany({
        where: catalogoWhere(req.user.idSecond),
        include: { proveedor: true },
        orderBy: { id: "desc" },
      });
      res.json(
        rows.map((p) => ({
          id: p.id,
          descripcion: p.descripcion,
          marca: p.marca,
          talle: p.talle,
          color: p.color,
          precio: p.precioVenta,
          proveedorNombre: p.proveedor?.nombre ?? null,
        }))
      );
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  });

  // GET /api/vivo/:id/cierre
  app.get("/api/vivo/:id/cierre", async (req, res) => {
    try {
      const vivo = await findVivoForTenant(req.user.idSecond, req.params.id);
      if (!vivo) return res.status(404).json({ error: "Vivo no encontrado." });

      const items = vivo.items;
      const enPantalla = items.find((it) => it.estado === "en_pantalla") || null;
      const mostradas = items.length;
      let adjudicadas = 0;
      let sinComentarios = 0;
      let totalCobrar = 0;

      const porUsuario = new Map();

      for (const it of items) {
        const pendientes = (it.reservas || []).filter((r) => r.estado === "pendiente");
        if (pendientes.length > 0 && it.productoId) adjudicadas += 1;
        if (pendientes.length === 0 && it.estado !== "liberada") sinComentarios += 1;

        const primera = pendientes[0];
        if (!primera || !it.productoId) continue;

        const sub = porUsuario.get(primera.usuario) || { usuario: primera.usuario, prendas: [], subtotal: 0, reservaIds: [] };
        sub.prendas.push({
          itemId: it.id,
          reservaId: primera.id,
          codigo: it.codigo,
          descripcion: it.producto?.descripcion ?? it.descripcionLibre,
          precioVivo: it.precioVivo,
          productoId: it.productoId,
        });
        sub.subtotal += it.precioVivo;
        sub.reservaIds.push(primera.id);
        totalCobrar += it.precioVivo;
        porUsuario.set(primera.usuario, sub);
      }

      res.json({
        vivoId: vivo.id,
        estado: vivo.estado,
        enPantalla: enPantalla ? mapItem(enPantalla) : null,
        resumen: { mostradas, adjudicadas, sinComentarios, totalCobrar },
        grupos: [...porUsuario.values()],
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  });

  // POST /api/vivo/:id/cerrar
  app.post("/api/vivo/:id/cerrar", async (req, res) => {
    try {
      const idSecond = req.user.idSecond;
      const vivo = await findVivoForTenant(idSecond, req.params.id);
      if (!vivo) return res.status(404).json({ error: "Vivo no encontrado." });
      if (vivo.estado === "cerrado") {
        return res.status(400).json({ error: "Este vivo ya está cerrado." });
      }

      const result = await prisma.$transaction(async (tx) => {
        const enPantalla = vivo.items.find((it) => it.estado === "en_pantalla");
        if (enPantalla) {
          await resolverItemEnPantalla(tx, enPantalla);
        }
        return tx.vivo.update({
          where: { id: vivo.id },
          data: { estado: "cerrado", fin: new Date() },
          include: { items: { include: itemInclude, orderBy: { orden: "asc" } } },
        });
      });

      res.json(mapVivo(result));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  });

  // POST /api/vivo/:id/confirmar-venta — vincula venta_id a reservas tras POST /api/ventas
  app.post("/api/vivo/:id/confirmar-venta", async (req, res) => {
    try {
      const idSecond = req.user.idSecond;
      const { usuario, ventaId, reservaIds } = req.body || {};
      if (!usuario || !ventaId || !Array.isArray(reservaIds) || reservaIds.length === 0) {
        return res.status(400).json({ error: "usuario, ventaId y reservaIds son obligatorios." });
      }

      const vivo = await findVivoForTenant(idSecond, req.params.id);
      if (!vivo) return res.status(404).json({ error: "Vivo no encontrado." });

      const venta = await prisma.venta.findFirst({ where: { id: Number(ventaId), idSecond } });
      if (!venta) return res.status(404).json({ error: "Venta no encontrada." });

      const ids = reservaIds.map(Number);
      const reservas = await prisma.vivoReserva.findMany({
        where: {
          id: { in: ids },
          estado: "pendiente",
          vivoItem: { vivoId: vivo.id },
        },
        include: { vivoItem: true },
      });
      if (reservas.length !== ids.length) {
        return res.status(400).json({ error: "Alguna reserva no es válida o ya fue procesada." });
      }

      await prisma.$transaction(async (tx) => {
        for (const r of reservas) {
          await tx.vivoReserva.update({
            where: { id: r.id },
            data: { estado: "confirmada", ventaId: venta.id },
          });
          await tx.vivoItem.update({
            where: { id: r.vivoItemId },
            data: { estado: "vendida" },
          });
        }
      });

      res.json({ ok: true, ventaId: venta.id });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  });

  // GET /api/vivo/:id
  app.get("/api/vivo/:id", async (req, res) => {
    try {
      const vivo = await findVivoForTenant(req.user.idSecond, req.params.id);
      if (!vivo) return res.status(404).json({ error: "Vivo no encontrado." });
      res.json(mapVivo(vivo));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  });

  // POST /api/vivo/:id/items
  app.post("/api/vivo/:id/items", async (req, res) => {
    try {
      const idSecond = req.user.idSecond;
      const { producto_id, productoId, descripcion_libre, descripcionLibre, codigo, precio_vivo, precioVivo } = req.body || {};
      const pid = producto_id ?? productoId;
      const descLibre = descripcion_libre ?? descripcionLibre;
      const precioBody = precio_vivo ?? precioVivo;

      const vivo = await prisma.vivo.findFirst({
        where: { id: Number(req.params.id), idSecond, estado: "abierto" },
        include: { items: { include: { reservas: true } } },
      });
      if (!vivo) return res.status(404).json({ error: "Vivo no encontrado o no está abierto." });

      let producto = null;
      if (pid != null && pid !== "") {
        producto = await prisma.producto.findFirst({
          where: { id: Number(pid), idSecond },
          include: { proveedor: true },
        });
        if (!producto) return res.status(400).json({ error: "Producto no válido para esta tienda." });
      } else if (!descLibre || !String(descLibre).trim()) {
        return res.status(400).json({ error: "Indique producto_id o descripcion_libre." });
      }

      const precioFinal =
        precioBody != null && precioBody !== ""
          ? Number(precioBody)
          : producto
            ? producto.precioVenta
            : null;
      if (precioFinal == null || Number.isNaN(precioFinal)) {
        return res.status(400).json({ error: "precio_vivo es obligatorio si no hay producto con precio de lista." });
      }

      const item = await prisma.$transaction(async (tx) => {
        const enPantalla = await tx.vivoItem.findFirst({
          where: { vivoId: vivo.id, estado: "en_pantalla" },
          include: { reservas: true },
        });
        if (enPantalla) await resolverItemEnPantalla(tx, enPantalla);

        const codigoFinal =
          codigo != null && String(codigo).trim() !== ""
            ? String(codigo).trim()
            : await siguienteCodigo(tx, vivo.id);

        const dup = await tx.vivoItem.findUnique({
          where: { vivoId_codigo: { vivoId: vivo.id, codigo: codigoFinal } },
          include: { producto: true },
        });
        if (dup) {
          const nombre = dup.producto?.descripcion ?? dup.descripcionLibre ?? "Prenda";
          const err = new Error(`El código "${codigoFinal}" ya está usado en este vivo (${nombre}).`);
          err.status = 409;
          throw err;
        }

        const maxOrden = await tx.vivoItem.aggregate({
          where: { vivoId: vivo.id },
          _max: { orden: true },
        });

        return tx.vivoItem.create({
          data: {
            vivoId: vivo.id,
            productoId: producto ? producto.id : null,
            codigo: codigoFinal,
            precioVivo: precioFinal,
            descripcionLibre: producto ? null : String(descLibre).trim(),
            estado: "en_pantalla",
            orden: (maxOrden._max.orden ?? 0) + 1,
          },
          include: itemInclude,
        });
      });

      res.status(201).json(mapItem(item));
    } catch (e) {
      if (e.status === 409) return res.status(409).json({ error: e.message });
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  });

  // PATCH /api/vivo/items/:itemId
  app.patch("/api/vivo/items/:itemId", async (req, res) => {
    try {
      const item = await findItemForTenant(req.user.idSecond, req.params.itemId);
      if (!item) return res.status(404).json({ error: "Ítem no encontrado." });

      const { codigo, precio_vivo, precioVivo, estado } = req.body || {};
      const precioBody = precio_vivo ?? precioVivo;
      const data = {};

      if (codigo !== undefined) {
        const c = String(codigo).trim();
        if (!c) return res.status(400).json({ error: "El código no puede estar vacío." });
        const dup = await prisma.vivoItem.findFirst({
          where: { vivoId: item.vivoId, codigo: c, NOT: { id: item.id } },
          include: { producto: true },
        });
        if (dup) {
          const nombre = dup.producto?.descripcion ?? dup.descripcionLibre ?? "Prenda";
          return res.status(409).json({ error: `El código "${c}" ya está usado en este vivo (${nombre}).` });
        }
        data.codigo = c;
      }
      if (precioBody !== undefined) data.precioVivo = Number(precioBody);
      if (estado !== undefined) {
        const valid = new Set(["en_pantalla", "reservada", "vendida", "liberada"]);
        if (!valid.has(estado)) return res.status(400).json({ error: "Estado de ítem no válido." });
        data.estado = estado;
      }

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: "Nada que actualizar." });
      }

      const updated = await prisma.$transaction(async (tx) => {
        if (data.estado === "en_pantalla") {
          const otro = await tx.vivoItem.findFirst({
            where: { vivoId: item.vivoId, estado: "en_pantalla", NOT: { id: item.id } },
            include: { reservas: true },
          });
          if (otro) await resolverItemEnPantalla(tx, otro);
        }
        if (data.estado === "vendida" || data.estado === "liberada") {
          const enPantalla = item.estado === "en_pantalla";
          if (!enPantalla && data.estado === "liberada") {
            // ok
          }
        }
        return tx.vivoItem.update({
          where: { id: item.id },
          data,
          include: itemInclude,
        });
      });

      res.json(mapItem(updated));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  });

  // DELETE /api/vivo/items/:itemId
  app.delete("/api/vivo/items/:itemId", async (req, res) => {
    try {
      const item = await findItemForTenant(req.user.idSecond, req.params.itemId);
      if (!item) return res.status(404).json({ error: "Ítem no encontrado." });
      await prisma.vivoItem.delete({ where: { id: item.id } });
      res.status(204).send();
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  });

  // POST /api/vivo/items/:itemId/reservas
  app.post("/api/vivo/items/:itemId/reservas", async (req, res) => {
    try {
      const item = await findItemForTenant(req.user.idSecond, req.params.itemId);
      if (!item) return res.status(404).json({ error: "Ítem no encontrado." });
      if (item.vivo.estado !== "abierto") {
        return res.status(400).json({ error: "El vivo no está abierto." });
      }

      let usuario = String(req.body?.usuario || "").trim();
      if (!usuario) return res.status(400).json({ error: "usuario es obligatorio." });
      if (!usuario.startsWith("@")) usuario = `@${usuario}`;

      const existe = item.reservas.some((r) => r.usuario.toLowerCase() === usuario.toLowerCase());
      if (existe) {
        return res.json(mapReserva(item.reservas.find((r) => r.usuario.toLowerCase() === usuario.toLowerCase())));
      }

      const maxOrden = await prisma.vivoReserva.aggregate({
        where: { vivoItemId: item.id },
        _max: { orden: true },
      });

      const reserva = await prisma.vivoReserva.create({
        data: {
          vivoItemId: item.id,
          usuario,
          orden: (maxOrden._max.orden ?? 0) + 1,
          estado: "pendiente",
        },
      });

      res.status(201).json(mapReserva(reserva));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  });

  // PATCH /api/vivo/reservas/:reservaId — marcar caída (cierre)
  app.patch("/api/vivo/reservas/:reservaId", async (req, res) => {
    try {
      const reserva = await findReservaForTenant(req.user.idSecond, req.params.reservaId);
      if (!reserva) return res.status(404).json({ error: "Reserva no encontrada." });

      const { estado } = req.body || {};
      if (estado !== "caida") {
        return res.status(400).json({ error: "Solo se permite marcar estado 'caida'." });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const r = await tx.vivoReserva.update({
          where: { id: reserva.id },
          data: { estado: "caida" },
        });
        const item = reserva.vivoItem;
        const pendientes = item.reservas.filter((x) => x.id !== reserva.id && x.estado === "pendiente");
        if (pendientes.length > 0 && item.estado !== "en_pantalla") {
          await tx.vivoItem.update({ where: { id: item.id }, data: { estado: "reservada" } });
        } else if (pendientes.length === 0 && item.estado === "reservada") {
          await tx.vivoItem.update({ where: { id: item.id }, data: { estado: "liberada" } });
        }
        return r;
      });

      res.json(mapReserva(updated));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  });

  // DELETE /api/vivo/reservas/:reservaId
  app.delete("/api/vivo/reservas/:reservaId", async (req, res) => {
    try {
      const reserva = await findReservaForTenant(req.user.idSecond, req.params.reservaId);
      if (!reserva) return res.status(404).json({ error: "Reserva no encontrada." });

      await prisma.$transaction(async (tx) => {
        await tx.vivoReserva.delete({ where: { id: reserva.id } });
        const restantes = await tx.vivoReserva.findMany({
          where: { vivoItemId: reserva.vivoItemId },
          orderBy: { orden: "asc" },
        });
        for (let i = 0; i < restantes.length; i++) {
          await tx.vivoReserva.update({ where: { id: restantes[i].id }, data: { orden: i + 1 } });
        }
        const item = await tx.vivoItem.findUnique({
          where: { id: reserva.vivoItemId },
          include: { reservas: true },
        });
        if (item && item.estado !== "en_pantalla" && item.reservas.length === 0 && item.estado === "reservada") {
          await tx.vivoItem.update({ where: { id: item.id }, data: { estado: "liberada" } });
        }
      });

      res.status(204).send();
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  });
}
