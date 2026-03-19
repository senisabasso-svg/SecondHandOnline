package proyectomago.dao;

import proyectomago.model.InformeVenta;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class InformeDAO {

    private Connection connection;

    public InformeDAO(Connection connection) {
        this.connection = connection;
    }

    /**
     * Obtiene todos los informes de ventas con información de productos y proveedores
     * Consulta desde la tabla ventas hacia productos y proveedores
     */
    public List<InformeVenta> obtenerTodos() throws SQLException {
        List<InformeVenta> informes = new ArrayList<>();
        
        String sql = "SELECT " +
                     "v.id as id_venta, " +
                     "v.fecha as fecha_venta, " +
                     "v.total as total_venta, " +
                     "p.id as id_producto, " +
                     "p.descripcion as descripcion_producto, " +
                     "p.tipo_prenda, " +
                     "p.marca, " +
                     "p.color, " +
                     "vi.precio_unitario, " +
                     "pr.id as id_proveedor, " +
                     "pr.nombre as nombre_proveedor, " +
                     "pr.telefono as telefono_proveedor " +
                     "FROM ventas v " +
                     "INNER JOIN venta_items vi ON v.id = vi.id_venta " +
                     "INNER JOIN productos p ON vi.id_producto = p.id " +
                     "INNER JOIN proveedores pr ON p.id_proveedor = pr.id " +
                     "ORDER BY v.fecha DESC, v.id DESC";
        
        try (Statement stmt = connection.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            
            while (rs.next()) {
                InformeVenta informe = mapearInforme(rs);
                informes.add(informe);
            }
        }
        return informes;
    }

    /**
     * Obtiene informes filtrados por proveedor
     * Consulta desde la tabla ventas hacia productos y proveedores, filtrando por proveedor
     */
    public List<InformeVenta> obtenerPorProveedor(int idProveedor) throws SQLException {
        List<InformeVenta> informes = new ArrayList<>();
        
        String sql = "SELECT " +
                     "v.id as id_venta, " +
                     "v.fecha as fecha_venta, " +
                     "v.total as total_venta, " +
                     "p.id as id_producto, " +
                     "p.descripcion as descripcion_producto, " +
                     "p.tipo_prenda, " +
                     "p.marca, " +
                     "p.color, " +
                     "vi.precio_unitario, " +
                     "pr.id as id_proveedor, " +
                     "pr.nombre as nombre_proveedor, " +
                     "pr.telefono as telefono_proveedor " +
                     "FROM ventas v " +
                     "INNER JOIN venta_items vi ON v.id = vi.id_venta " +
                     "INNER JOIN productos p ON vi.id_producto = p.id " +
                     "INNER JOIN proveedores pr ON p.id_proveedor = pr.id " +
                     "WHERE pr.id = ? " +
                     "ORDER BY v.fecha DESC, v.id DESC";
        
        try (PreparedStatement pstmt = connection.prepareStatement(sql)) {
            pstmt.setInt(1, idProveedor);
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    InformeVenta informe = mapearInforme(rs);
                    informes.add(informe);
                }
            }
        }
        return informes;
    }


    /**
     * Mapea un ResultSet a un objeto InformeVenta
     */
    private InformeVenta mapearInforme(ResultSet rs) throws SQLException {
        InformeVenta informe = new InformeVenta();
        
        // Información de la venta
        informe.setIdVenta(rs.getInt("id_venta"));
        
        Timestamp fechaTimestamp = rs.getTimestamp("fecha_venta");
        if (fechaTimestamp != null) {
            informe.setFechaVenta(new Date(fechaTimestamp.getTime()));
        }
        
        informe.setTotalVenta(rs.getDouble("total_venta"));
        
        // Información del producto
        informe.setIdProducto(rs.getInt("id_producto"));
        informe.setDescripcionProducto(rs.getString("descripcion_producto"));
        informe.setTipoPrenda(rs.getString("tipo_prenda"));
        informe.setMarca(rs.getString("marca"));
        informe.setColor(rs.getString("color"));
        informe.setPrecioUnitario(rs.getDouble("precio_unitario"));
        
        // Información del proveedor
        informe.setIdProveedor(rs.getInt("id_proveedor"));
        informe.setNombreProveedor(rs.getString("nombre_proveedor"));
        informe.setTelefonoProveedor(rs.getString("telefono_proveedor"));
        
        return informe;
    }

    /**
     * Obtiene el total de ventas por proveedor
     * Consulta desde la tabla ventas hacia productos y proveedores
     */
    public double obtenerTotalPorProveedor(int idProveedor) throws SQLException {
        String sql = "SELECT SUM(vi.precio_unitario) as total " +
                     "FROM ventas v " +
                     "INNER JOIN venta_items vi ON v.id = vi.id_venta " +
                     "INNER JOIN productos p ON vi.id_producto = p.id " +
                     "INNER JOIN proveedores pr ON p.id_proveedor = pr.id " +
                     "WHERE pr.id = ?";
        
        try (PreparedStatement pstmt = connection.prepareStatement(sql)) {
            pstmt.setInt(1, idProveedor);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getDouble("total");
                }
            }
        }
        return 0.0;
    }
}

