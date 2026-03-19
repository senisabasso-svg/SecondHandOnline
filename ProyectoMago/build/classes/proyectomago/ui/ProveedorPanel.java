package proyectomago.ui;

import connectDatabase.conection;
import proyectomago.dao.ProveedorDAO;
import proyectomago.model.Proveedor;

import javax.swing.*;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.sql.SQLException;
import java.util.List;
import javax.swing.table.DefaultTableModel;

public class ProveedorPanel extends JPanel {

    private ProveedorDAO proveedorDAO;
    private JTextField nombreField;
    private JTextField telefonoField;
    private JTextField emailField;
    private JTable tablaProveedores;
    private DefaultTableModel tableModel;

    public ProveedorPanel() {
        // Inicializar DAO
        try {
            conection dbConnection = new conection();
            proveedorDAO = new ProveedorDAO(dbConnection.getConnection());
        } catch (SQLException e) {
            JOptionPane.showMessageDialog(this, "Error de conexión a la base de datos: " + e.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
            e.printStackTrace();
        }

        // Configurar el layout con fondo moderno
        setLayout(new BorderLayout(15, 15));
        setBackground(new Color(255, 240, 245));
        setBorder(BorderFactory.createEmptyBorder(15, 15, 15, 15));

        // Panel para el formulario de entrada con estilo moderno
        JPanel formPanel = new JPanel(new GridLayout(4, 2, 10, 12));
        formPanel.setBackground(Color.WHITE);
        formPanel.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createTitledBorder(
                BorderFactory.createEmptyBorder(),
                "➕ Registrar Persona que trae Prendas",
                0, 0,
                new Font("Segoe UI", Font.BOLD, 14)
            ),
            BorderFactory.createEmptyBorder(15, 15, 15, 15)
        ));

        JLabel nombreLabel = new JLabel("Nombre completo:");
        nombreLabel.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        formPanel.add(nombreLabel);
        nombreField = new JTextField();
        nombreField.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        formPanel.add(nombreField);

        JLabel telLabel = new JLabel("Teléfono:");
        telLabel.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        formPanel.add(telLabel);
        telefonoField = new JTextField();
        telefonoField.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        formPanel.add(telefonoField);

        JLabel emailLabel = new JLabel("Email (opcional):");
        emailLabel.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        formPanel.add(emailLabel);
        emailField = new JTextField();
        emailField.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        formPanel.add(emailField);

        JButton actualizarButton = crearBotonModerno("🔄 Actualizar Lista", new Color(255, 182, 193));
        JButton agregarButton = crearBotonModerno("✅ Registrar Persona", new Color(255, 105, 180));
        formPanel.add(actualizarButton);
        formPanel.add(agregarButton);

        // Panel para la tabla con estilo moderno
        JPanel tablePanel = new JPanel(new BorderLayout());
        tablePanel.setBackground(Color.WHITE);
        tablePanel.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createTitledBorder(
                BorderFactory.createEmptyBorder(),
                "👥 Personas Registradas",
                0, 0,
                new Font("Segoe UI", Font.BOLD, 14)
            ),
            BorderFactory.createEmptyBorder(10, 10, 10, 10)
        ));

        // Configurar tabla con estilo moderno
        String[] columnNames = {"ID", "Nombre", "Teléfono", "Email"};
        tableModel = new DefaultTableModel(columnNames, 0);
        tablaProveedores = new JTable(tableModel);
        tablaProveedores.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        tablaProveedores.setRowHeight(25);
        tablaProveedores.setGridColor(new Color(255, 192, 203));
        tablaProveedores.setSelectionBackground(new Color(255, 182, 193, 50));
        tablaProveedores.setSelectionForeground(new Color(33, 37, 41));
        tablaProveedores.getTableHeader().setFont(new Font("Segoe UI", Font.BOLD, 12));
        tablaProveedores.getTableHeader().setBackground(new Color(255, 240, 245));
        tablaProveedores.getTableHeader().setForeground(new Color(139, 0, 98));
        JScrollPane scrollPane = new JScrollPane(tablaProveedores);
        scrollPane.setBorder(BorderFactory.createLineBorder(new Color(255, 192, 203), 1));
        tablePanel.add(scrollPane, BorderLayout.CENTER);

        // Agregar paneles al panel principal
        add(formPanel, BorderLayout.NORTH);
        add(tablePanel, BorderLayout.CENTER);

        // Si el DAO no se pudo inicializar, no continuar.
        if (proveedorDAO == null) {
            // Deshabilitar componentes para que el usuario no pueda interactuar
            nombreField.setEnabled(false);
            telefonoField.setEnabled(false);
            emailField.setEnabled(false);
            agregarButton.setEnabled(false);
            return;
        }

        // Cargar datos iniciales
        refrescarTabla();

        // Listeners
        actualizarButton.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                refrescarTabla();
            }
        });
        agregarButton.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                agregarProveedor();
            }
        });
    }

    private void agregarProveedor() {
        String nombre = nombreField.getText().trim();
        if (nombre.isEmpty()) {
            JOptionPane.showMessageDialog(this, "El nombre es obligatorio.", "Error de validación", JOptionPane.ERROR_MESSAGE);
            return;
        }

        Proveedor nuevoProveedor = new Proveedor();
        nuevoProveedor.setNombre(nombre);
        nuevoProveedor.setTelefono(telefonoField.getText().trim());
        nuevoProveedor.setEmail(emailField.getText().trim());

        try {
            proveedorDAO.agregarProveedor(nuevoProveedor);
            JOptionPane.showMessageDialog(this, "Persona registrada exitosamente.", "Éxito", JOptionPane.INFORMATION_MESSAGE);
            
            // Limpiar campos y refrescar tabla
            nombreField.setText("");
            telefonoField.setText("");
            emailField.setText("");
            refrescarTabla();

        } catch (SQLException e) {
            JOptionPane.showMessageDialog(this, "Error al registrar la persona: " + e.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
            e.printStackTrace();
        }
    }

    private void refrescarTabla() {
        // Limpiar tabla
        tableModel.setRowCount(0);

        try {
            List<Proveedor> proveedores = proveedorDAO.obtenerTodos();
            for (Proveedor p : proveedores) {
                Object[] rowData = {p.getId(), p.getNombre(), p.getTelefono(), p.getEmail()};
                tableModel.addRow(rowData);
            }
        } catch (SQLException e) {
            JOptionPane.showMessageDialog(this, "Error al cargar las personas registradas: " + e.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
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
