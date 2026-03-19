package proyectomago.ui;

import connectDatabase.conection;
import proyectomago.dao.ProductoDAO;
import proyectomago.dao.ProveedorDAO;
import proyectomago.model.Producto;
import proyectomago.model.Proveedor;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.sql.SQLException;
import java.util.List;
import java.util.Vector;

public class ProductoPanel extends JPanel {

    private ProductoDAO productoDAO;
    private ProveedorDAO proveedorDAO;

    private JTextField descripcionField;
    private JComboBox<String> tipoPrendaComboBox;
    private JTextField marcaField;
    private JTextField colorField;
    private JComboBox<String> condicionComboBox;
    private JTextField precioVentaField;
    private JTextField talleField;
    private JComboBox<Proveedor> proveedorComboBox;
    private JTable tablaProductos;
    private DefaultTableModel tableModel;

    public ProductoPanel() {
        // Inicializar DAOs
        try {
            conection dbConnection = new conection();
            Connection conn = dbConnection.getConnection();
            productoDAO = new ProductoDAO(conn);
            proveedorDAO = new ProveedorDAO(conn);
        } catch (SQLException e) {
            JOptionPane.showMessageDialog(this, "Error de conexión a la base de datos: " + e.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
            e.printStackTrace();
        }

        // Configurar layout con fondo moderno
        setLayout(new BorderLayout(10, 10));
        setBackground(new Color(255, 240, 245));
        setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));

        // Panel para el formulario con estilo moderno - Layout más compacto
        JPanel formPanel = new JPanel(new GridBagLayout());
        formPanel.setBackground(Color.WHITE);
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(8, 10, 8, 10);
        gbc.anchor = GridBagConstraints.WEST;
        gbc.fill = GridBagConstraints.HORIZONTAL;
        
        formPanel.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createTitledBorder(
                BorderFactory.createEmptyBorder(),
                "➕ Nueva Prenda de Ropa",
                0, 0,
                new Font("Segoe UI", Font.BOLD, 14)
            ),
            BorderFactory.createEmptyBorder(12, 12, 12, 12)
        ));
        
        // Primera fila
        gbc.gridx = 0; gbc.gridy = 0;
        JLabel descLabel = new JLabel("Descripción:");
        descLabel.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        formPanel.add(descLabel, gbc);
        gbc.gridx = 1; gbc.weightx = 1.0;
        descripcionField = new JTextField();
        descripcionField.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        formPanel.add(descripcionField, gbc);
        
        // Segunda fila
        gbc.gridx = 0; gbc.gridy = 1; gbc.weightx = 0;
        JLabel tipoLabel = new JLabel("Tipo de Prenda:");
        tipoLabel.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        formPanel.add(tipoLabel, gbc);
        gbc.gridx = 1; gbc.weightx = 1.0;
        tipoPrendaComboBox = new JComboBox<>(new String[]{"", "Camisa", "Pantalón", "Vestido", "Blusa", "Short", "Falda", "Chaqueta", "Abrigo", "Sudadera", "Camiseta", "Jeans", "Otro"});
        tipoPrendaComboBox.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        formPanel.add(tipoPrendaComboBox, gbc);
        
        // Tercera fila
        gbc.gridx = 0; gbc.gridy = 2; gbc.weightx = 0;
        JLabel marcaLabel = new JLabel("Marca:");
        marcaLabel.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        formPanel.add(marcaLabel, gbc);
        gbc.gridx = 1; gbc.weightx = 1.0;
        marcaField = new JTextField();
        marcaField.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        formPanel.add(marcaField, gbc);
        
        // Cuarta fila
        gbc.gridx = 0; gbc.gridy = 3; gbc.weightx = 0;
        JLabel colorLabel = new JLabel("Color:");
        colorLabel.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        formPanel.add(colorLabel, gbc);
        gbc.gridx = 1; gbc.weightx = 1.0;
        colorField = new JTextField();
        colorField.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        formPanel.add(colorField, gbc);
        
        // Quinta fila
        gbc.gridx = 0; gbc.gridy = 4; gbc.weightx = 0;
        JLabel condLabel = new JLabel("Condición:");
        condLabel.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        formPanel.add(condLabel, gbc);
        gbc.gridx = 1; gbc.weightx = 1.0;
        condicionComboBox = new JComboBox<>(new String[]{"", "Excelente", "Bueno", "Regular"});
        condicionComboBox.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        formPanel.add(condicionComboBox, gbc);
        
        // Sexta fila
        gbc.gridx = 0; gbc.gridy = 5; gbc.weightx = 0;
        JLabel talleLabel = new JLabel("Talle:");
        talleLabel.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        formPanel.add(talleLabel, gbc);
        gbc.gridx = 1; gbc.weightx = 1.0;
        talleField = new JTextField();
        talleField.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        formPanel.add(talleField, gbc);
        
        // Séptima fila
        gbc.gridx = 0; gbc.gridy = 6; gbc.weightx = 0;
        JLabel precioLabel = new JLabel("Precio de Venta:");
        precioLabel.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        formPanel.add(precioLabel, gbc);
        gbc.gridx = 1; gbc.weightx = 1.0;
        precioVentaField = new JTextField();
        precioVentaField.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        formPanel.add(precioVentaField, gbc);
        
        // Octava fila
        gbc.gridx = 0; gbc.gridy = 7; gbc.weightx = 0;
        JLabel proveedorLabel = new JLabel("Quien trajo la prenda:");
        proveedorLabel.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        formPanel.add(proveedorLabel, gbc);
        gbc.gridx = 1; gbc.weightx = 1.0;
        proveedorComboBox = new JComboBox<>();
        proveedorComboBox.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        formPanel.add(proveedorComboBox, gbc);
        
        // Novena fila - Botones
        gbc.gridx = 0; gbc.gridy = 8; gbc.weightx = 0;
        gbc.gridwidth = 2;
        gbc.fill = GridBagConstraints.NONE;
        gbc.anchor = GridBagConstraints.CENTER;
        JPanel botonesFormPanel = new JPanel(new FlowLayout(FlowLayout.CENTER, 10, 5));
        botonesFormPanel.setBackground(Color.WHITE);
        JButton agregarButton = crearBotonModerno("✅ Agregar Prenda", new Color(255, 105, 180));
        JButton actualizarButton = crearBotonModerno("🔄 Actualizar Lista", new Color(255, 182, 193));
        botonesFormPanel.add(actualizarButton);
        botonesFormPanel.add(agregarButton);
        formPanel.add(botonesFormPanel, gbc);

        // Panel para la tabla con estilo moderno - Más espacio para la tabla
        JPanel tablePanel = new JPanel(new BorderLayout());
        tablePanel.setBackground(Color.WHITE);
        tablePanel.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createTitledBorder(
                BorderFactory.createEmptyBorder(),
                "📋 Prendas Registradas",
                0, 0,
                new Font("Segoe UI", Font.BOLD, 14)
            ),
            BorderFactory.createEmptyBorder(10, 10, 10, 10)
        ));

        String[] columnNames = {"ID", "Descripción", "Tipo", "Marca", "Color", "Condición", "Talle", "Precio", "Estado", "Quien trajo"};
        tableModel = new DefaultTableModel(columnNames, 0) {
            @Override
            public boolean isCellEditable(int row, int column) {
                return false; // Hacer la tabla no editable
            }
        };
        tablaProductos = new JTable(tableModel);
        tablaProductos.setAutoResizeMode(JTable.AUTO_RESIZE_OFF);
        tablaProductos.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        tablaProductos.setRowHeight(28);
        tablaProductos.setGridColor(new Color(255, 192, 203));
        tablaProductos.setSelectionBackground(new Color(255, 182, 193, 50));
        tablaProductos.setSelectionForeground(new Color(33, 37, 41));
        tablaProductos.getTableHeader().setFont(new Font("Segoe UI", Font.BOLD, 13));
        tablaProductos.getTableHeader().setBackground(new Color(255, 240, 245));
        tablaProductos.getTableHeader().setForeground(new Color(139, 0, 98));
        tablaProductos.getTableHeader().setPreferredSize(new Dimension(0, 35));
        
        // Ajustar anchos de columnas para mejor visibilidad
        tablaProductos.getColumnModel().getColumn(0).setPreferredWidth(50);  // ID
        tablaProductos.getColumnModel().getColumn(1).setPreferredWidth(150);  // Descripción
        tablaProductos.getColumnModel().getColumn(2).setPreferredWidth(100); // Tipo
        tablaProductos.getColumnModel().getColumn(3).setPreferredWidth(100);  // Marca
        tablaProductos.getColumnModel().getColumn(4).setPreferredWidth(80);  // Color
        tablaProductos.getColumnModel().getColumn(5).setPreferredWidth(90);   // Condición
        tablaProductos.getColumnModel().getColumn(6).setPreferredWidth(60);  // Talle
        tablaProductos.getColumnModel().getColumn(7).setPreferredWidth(90);  // Precio
        tablaProductos.getColumnModel().getColumn(8).setPreferredWidth(100); // Estado
        tablaProductos.getColumnModel().getColumn(9).setPreferredWidth(120); // Quien trajo
        
        JScrollPane scrollPane = new JScrollPane(tablaProductos);
        scrollPane.setHorizontalScrollBarPolicy(JScrollPane.HORIZONTAL_SCROLLBAR_AS_NEEDED);
        scrollPane.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_AS_NEEDED);
        scrollPane.setBorder(BorderFactory.createLineBorder(new Color(255, 192, 203), 1));
        tablePanel.add(scrollPane, BorderLayout.CENTER);

        // Usar JSplitPane para permitir ajustar el tamaño entre formulario y tabla
        JSplitPane splitPane = new JSplitPane(JSplitPane.VERTICAL_SPLIT, formPanel, tablePanel);
        splitPane.setResizeWeight(0.30); // El formulario ocupa 30%, la tabla 70% (más espacio para ver prendas)
        splitPane.setDividerLocation(280); // Posición inicial del divisor (más pequeño para dar más espacio a la tabla)
        splitPane.setDividerSize(10);
        splitPane.setBorder(BorderFactory.createEmptyBorder());
        splitPane.setOneTouchExpandable(true); // Permitir colapsar/expandir con un clic
        
        // Agregar paneles al panel principal
        add(splitPane, BorderLayout.CENTER);
        
        // Si los DAOs no se pudieron inicializar, no continuar.
        if (productoDAO == null || proveedorDAO == null) {
            // Deshabilitar componentes para que el usuario no pueda interactuar
            descripcionField.setEnabled(false);
            tipoPrendaComboBox.setEnabled(false);
            marcaField.setEnabled(false);
            colorField.setEnabled(false);
            condicionComboBox.setEnabled(false);
            precioVentaField.setEnabled(false);
            talleField.setEnabled(false);
            proveedorComboBox.setEnabled(false);
            agregarButton.setEnabled(false);
            return;
        }

        // Cargar datos iniciales
        cargarProveedores();
        refrescarTablaProductos();

        // Listeners para los botones
        actualizarButton.addActionListener(e -> {
            cargarProveedores();
            refrescarTablaProductos();
        });
        agregarButton.addActionListener(e -> agregarProducto());
    }
    
    private void cargarProveedores() {
        // Limpiar el combo box primero
        proveedorComboBox.removeAllItems();
        
        try {
            List<Proveedor> proveedores = proveedorDAO.obtenerTodos();
            for (Proveedor p : proveedores) {
                proveedorComboBox.addItem(p);
            }
        } catch (SQLException e) {
            JOptionPane.showMessageDialog(this, "Error al cargar proveedores: " + e.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
        }
    }

    private void agregarProducto() {
        String descripcion = descripcionField.getText().trim();
        if (descripcion.isEmpty()) {
            JOptionPane.showMessageDialog(this, "La descripción es obligatoria.", "Error de validación", JOptionPane.ERROR_MESSAGE);
            return;
        }

        double precioVenta;
        try {
            precioVenta = Double.parseDouble(precioVentaField.getText().trim());
            if (precioVenta <= 0) {
                JOptionPane.showMessageDialog(this, "El precio debe ser mayor a cero.", "Error de validación", JOptionPane.ERROR_MESSAGE);
                return;
            }
        } catch (NumberFormatException e) {
            JOptionPane.showMessageDialog(this, "El precio de venta debe ser un número válido.", "Error de validación", JOptionPane.ERROR_MESSAGE);
            return;
        }

        Proveedor proveedorSeleccionado = (Proveedor) proveedorComboBox.getSelectedItem();
        if (proveedorSeleccionado == null) {
            JOptionPane.showMessageDialog(this, "Debe seleccionar quien trajo la prenda.", "Error de validación", JOptionPane.ERROR_MESSAGE);
            return;
        }

        Producto nuevoProducto = new Producto();
        nuevoProducto.setDescripcion(descripcion);
        nuevoProducto.setTipoPrenda((String) tipoPrendaComboBox.getSelectedItem());
        nuevoProducto.setMarca(marcaField.getText().trim());
        nuevoProducto.setColor(colorField.getText().trim());
        nuevoProducto.setCondicion((String) condicionComboBox.getSelectedItem());
        nuevoProducto.setPrecioVenta(precioVenta);
        nuevoProducto.setTalle(talleField.getText().trim());
        nuevoProducto.setIdProveedor(proveedorSeleccionado.getId());
        nuevoProducto.setEstado("disponible");

        try {
            productoDAO.agregarProducto(nuevoProducto);
            JOptionPane.showMessageDialog(this, "Prenda agregada exitosamente.", "Éxito", JOptionPane.INFORMATION_MESSAGE);
            
            // Limpiar campos y refrescar tabla
            descripcionField.setText("");
            tipoPrendaComboBox.setSelectedIndex(0);
            marcaField.setText("");
            colorField.setText("");
            condicionComboBox.setSelectedIndex(0);
            precioVentaField.setText("");
            talleField.setText("");
            refrescarTablaProductos();

        } catch (SQLException e) {
            JOptionPane.showMessageDialog(this, "Error al agregar la prenda: " + e.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
            e.printStackTrace();
        }
    }

    private void refrescarTablaProductos() {
        tableModel.setRowCount(0);
        try {
            List<Producto> productos = productoDAO.obtenerTodos();
            for (Producto p : productos) {
                Object[] rowData = {
                    p.getId(),
                    p.getDescripcion(),
                    p.getTipoPrenda() != null ? p.getTipoPrenda() : "",
                    p.getMarca() != null ? p.getMarca() : "",
                    p.getColor() != null ? p.getColor() : "",
                    p.getCondicion() != null ? p.getCondicion() : "",
                    p.getTalle() != null ? p.getTalle() : "",
                    String.format("$%.2f", p.getPrecioVenta()),
                    p.getEstado(),
                    p.getNombreProveedor() != null ? p.getNombreProveedor() : ""
                };
                tableModel.addRow(rowData);
            }
        } catch (SQLException e) {
            JOptionPane.showMessageDialog(this, "Error al cargar las prendas: " + e.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
            e.printStackTrace();
        }
    }
    
    /**
     * Crea un botón con estilo moderno
     */
    private JButton crearBotonModerno(String texto, Color color) {
        JButton boton = new JButton(texto);
        boton.setBackground(color);
        boton.setForeground(Color.WHITE);
        boton.setFont(new Font("Segoe UI", Font.BOLD, 13));
        boton.setBorder(BorderFactory.createEmptyBorder(10, 20, 10, 20));
        boton.setFocusPainted(false);
        boton.setCursor(new Cursor(Cursor.HAND_CURSOR));
        return boton;
    }
}
