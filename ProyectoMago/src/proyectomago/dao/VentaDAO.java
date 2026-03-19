package proyectomago.dao;

import proyectomago.model.Venta;
import proyectomago.model.VentaItem;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

public class VentaDAO {

    private Connection connection;

    public VentaDAO(Connection connection) {
        this.connection = connection;
    }

    public void guardarVenta(Venta venta) throws SQLException {
        // Deshabilitar auto-commit para manejar la transacción manualmente
        connection.setAutoCommit(false);

        String sqlVenta = "INSERT INTO ventas (total) VALUES (?)";
        String sqlVentaItem = "INSERT INTO venta_items (id_venta, id_producto, precio_unitario) VALUES (?, ?, ?)";
        String sqlUpdateProducto = "UPDATE productos SET estado = 'vendido' WHERE id = ?";

        try (PreparedStatement pstmtVenta = connection.prepareStatement(sqlVenta, Statement.RETURN_GENERATED_KEYS)) {
            // Guardar la venta principal
            pstmtVenta.setDouble(1, venta.getTotal());
            pstmtVenta.executeUpdate();

            // Obtener el ID de la venta generada
            int idVenta;
            try (ResultSet generatedKeys = pstmtVenta.getGeneratedKeys()) {
                if (generatedKeys.next()) {
                    idVenta = generatedKeys.getInt(1);
                } else {
                    throw new SQLException("No se pudo obtener el ID de la venta.");
                }
            }
            
            // Guardar los items de la venta y actualizar productos
            try (PreparedStatement pstmtVentaItem = connection.prepareStatement(sqlVentaItem);
                 PreparedStatement pstmtUpdateProducto = connection.prepareStatement(sqlUpdateProducto)) {

                for (VentaItem item : venta.getItems()) {
                    // Guardar item de la venta
                    pstmtVentaItem.setInt(1, idVenta);
                    pstmtVentaItem.setInt(2, item.getIdProducto());
                    pstmtVentaItem.setDouble(3, item.getPrecioUnitario());
                    pstmtVentaItem.addBatch();

                    // Actualizar estado del producto
                    pstmtUpdateProducto.setInt(1, item.getIdProducto());
                    pstmtUpdateProducto.addBatch();
                }
                
                pstmtVentaItem.executeBatch();
                pstmtUpdateProducto.executeBatch();
            }

            // Si todo fue bien, confirmar la transacción
            connection.commit();

        } catch (SQLException e) {
            // Si algo falla, revertir la transacción
            connection.rollback();
            throw e; // Re-lanzar la excepción para notificar al llamador
        } finally {
            // Volver a habilitar el auto-commit
            connection.setAutoCommit(true);
        }
    }
}
