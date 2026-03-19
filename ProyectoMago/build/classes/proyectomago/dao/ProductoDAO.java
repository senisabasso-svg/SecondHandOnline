package proyectomago.dao;

import proyectomago.model.Producto;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class ProductoDAO {

    private Connection connection;

    public ProductoDAO(Connection connection) {
        this.connection = connection;
    }

    public void agregarProducto(Producto producto) throws SQLException {
        String sql = "INSERT INTO productos (descripcion, tipo_prenda, marca, color, condicion, precio_venta, talle, id_proveedor, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (PreparedStatement pstmt = connection.prepareStatement(sql)) {
            pstmt.setString(1, producto.getDescripcion());
            pstmt.setString(2, producto.getTipoPrenda());
            pstmt.setString(3, producto.getMarca());
            pstmt.setString(4, producto.getColor());
            pstmt.setString(5, producto.getCondicion());
            pstmt.setDouble(6, producto.getPrecioVenta());
            pstmt.setString(7, producto.getTalle());
            pstmt.setInt(8, producto.getIdProveedor());
            pstmt.setString(9, producto.getEstado());
            pstmt.executeUpdate();
        }
    }

    public List<Producto> obtenerTodos() throws SQLException {
        List<Producto> productos = new ArrayList<>();
        // Unir productos con proveedores para obtener el nombre del proveedor
        String sql = "SELECT p.id, p.descripcion, p.tipo_prenda, p.marca, p.color, p.condicion, p.precio_venta, p.talle, p.estado, p.id_proveedor, pr.nombre as nombre_proveedor " +
                     "FROM productos p " +
                     "JOIN proveedores pr ON p.id_proveedor = pr.id " +
                     "ORDER BY p.id DESC";
        
        try (Statement stmt = connection.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            
            while (rs.next()) {
                Producto producto = new Producto();
                producto.setId(rs.getInt("id"));
                producto.setDescripcion(rs.getString("descripcion"));
                producto.setTipoPrenda(rs.getString("tipo_prenda"));
                producto.setMarca(rs.getString("marca"));
                producto.setColor(rs.getString("color"));
                producto.setCondicion(rs.getString("condicion"));
                producto.setPrecioVenta(rs.getDouble("precio_venta"));
                producto.setTalle(rs.getString("talle"));
                producto.setEstado(rs.getString("estado"));
                producto.setIdProveedor(rs.getInt("id_proveedor"));
                producto.setNombreProveedor(rs.getString("nombre_proveedor"));
                productos.add(producto);
            }
        }
        return productos;
    }

    public List<Producto> obtenerDisponibles() throws SQLException {
        List<Producto> productos = new ArrayList<>();
        String sql = "SELECT p.id, p.descripcion, p.tipo_prenda, p.marca, p.color, p.condicion, p.precio_venta, p.talle, p.estado, p.id_proveedor, pr.nombre as nombre_proveedor " +
                     "FROM productos p " +
                     "JOIN proveedores pr ON p.id_proveedor = pr.id " +
                     "WHERE p.estado = 'disponible' " +
                     "ORDER BY p.id DESC";
        
        try (Statement stmt = connection.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            
            while (rs.next()) {
                Producto producto = new Producto();
                producto.setId(rs.getInt("id"));
                producto.setDescripcion(rs.getString("descripcion"));
                producto.setTipoPrenda(rs.getString("tipo_prenda"));
                producto.setMarca(rs.getString("marca"));
                producto.setColor(rs.getString("color"));
                producto.setCondicion(rs.getString("condicion"));
                producto.setPrecioVenta(rs.getDouble("precio_venta"));
                producto.setTalle(rs.getString("talle"));
                producto.setEstado(rs.getString("estado"));
                producto.setIdProveedor(rs.getInt("id_proveedor"));
                producto.setNombreProveedor(rs.getString("nombre_proveedor"));
                productos.add(producto);
            }
        }
        return productos;
    }
}
