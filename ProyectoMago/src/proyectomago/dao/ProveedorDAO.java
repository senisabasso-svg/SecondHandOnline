package proyectomago.dao;

import proyectomago.model.Proveedor;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class ProveedorDAO {

    private Connection connection;

    public ProveedorDAO(Connection connection) {
        this.connection = connection;
    }

    public void agregarProveedor(Proveedor proveedor) throws SQLException {
        String sql = "INSERT INTO proveedores (nombre, telefono, email) VALUES (?, ?, ?)";
        try (PreparedStatement pstmt = connection.prepareStatement(sql)) {
            pstmt.setString(1, proveedor.getNombre());
            pstmt.setString(2, proveedor.getTelefono());
            pstmt.setString(3, proveedor.getEmail());
            pstmt.executeUpdate();
        }
    }

    public List<Proveedor> obtenerTodos() throws SQLException {
        List<Proveedor> proveedores = new ArrayList<>();
        String sql = "SELECT * FROM proveedores ORDER BY nombre";
        try (Statement stmt = connection.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            while (rs.next()) {
                Proveedor proveedor = new Proveedor();
                proveedor.setId(rs.getInt("id"));
                proveedor.setNombre(rs.getString("nombre"));
                proveedor.setTelefono(rs.getString("telefono"));
                proveedor.setEmail(rs.getString("email"));
                proveedores.add(proveedor);
            }
        }
        return proveedores;
    }
}
