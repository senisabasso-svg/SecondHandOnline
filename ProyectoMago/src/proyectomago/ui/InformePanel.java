package proyectomago.ui;

import connectDatabase.conection;
import proyectomago.dao.InformeDAO;
import proyectomago.dao.ProveedorDAO;
import proyectomago.model.InformeVenta;
import proyectomago.model.Proveedor;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.sql.Connection;
import java.sql.SQLException;
import java.text.SimpleDateFormat;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import javax.swing.JFileChooser;

public class InformePanel extends JPanel {

    private InformeDAO informeDAO;
    private ProveedorDAO proveedorDAO;

    private JComboBox<Proveedor> proveedorComboBox;
    private JTable tablaInformes;
    private DefaultTableModel tableModel;
    private JLabel totalLabel;

    public InformePanel() {
        // Inicializar DAOs
        try {
            conection dbConnection = new conection();
            Connection conn = dbConnection.getConnection();
            informeDAO = new InformeDAO(conn);
            proveedorDAO = new ProveedorDAO(conn);
        } catch (SQLException e) {
            JOptionPane.showMessageDialog(this, "Error de conexión a la base de datos: " + e.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
            e.printStackTrace();
        }

        // Configurar layout con fondo moderno
        setLayout(new BorderLayout(15, 15));
        setBackground(new Color(255, 240, 245));
        setBorder(BorderFactory.createEmptyBorder(15, 15, 15, 15));

        // Panel de filtros con estilo moderno
        JPanel filtrosPanel = new JPanel(new GridBagLayout());
        filtrosPanel.setBackground(Color.WHITE);
        filtrosPanel.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createTitledBorder(
                BorderFactory.createEmptyBorder(),
                "🔍 Filtros de Búsqueda",
                0, 0,
                new Font("Segoe UI", Font.BOLD, 14)
            ),
            BorderFactory.createEmptyBorder(15, 15, 15, 15)
        ));
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(5, 5, 5, 5);
        gbc.anchor = GridBagConstraints.WEST;

        // Filtro por proveedor
        gbc.gridx = 0;
        gbc.gridy = 0;
        JLabel proveedorLabel = new JLabel("Persona (Proveedor):");
        proveedorLabel.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        filtrosPanel.add(proveedorLabel, gbc);
        gbc.gridx = 1;
        proveedorComboBox = new JComboBox<>();
        proveedorComboBox.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        proveedorComboBox.addItem(null); // Opción "Todos"
        filtrosPanel.add(proveedorComboBox, gbc);

        // Botones
        gbc.gridx = 0;
        gbc.gridy = 1;
        gbc.gridwidth = 2;
        gbc.fill = GridBagConstraints.HORIZONTAL;
        JPanel botonesPanel = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 5));
        JButton actualizarButton = crearBotonModerno("🔄 Actualizar", new Color(255, 182, 193));
        JButton buscarButton = crearBotonModerno("🔍 Buscar Informes", new Color(255, 105, 180));
        JButton limpiarButton = crearBotonModerno("🗑️ Limpiar Filtro", new Color(255, 20, 147));
        JButton exportarExcelButton = crearBotonModerno("📊 Exportar a Excel", new Color(255, 105, 180));
        botonesPanel.add(actualizarButton);
        botonesPanel.add(buscarButton);
        botonesPanel.add(limpiarButton);
        botonesPanel.add(exportarExcelButton);
        filtrosPanel.add(botonesPanel, gbc);

        // Panel para la tabla con estilo moderno
        JPanel tablePanel = new JPanel(new BorderLayout());
        tablePanel.setBackground(Color.WHITE);
        tablePanel.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createTitledBorder(
                BorderFactory.createEmptyBorder(),
                "📋 Informes de Ventas",
                0, 0,
                new Font("Segoe UI", Font.BOLD, 14)
            ),
            BorderFactory.createEmptyBorder(10, 10, 10, 10)
        ));

        String[] columnNames = {"ID Venta", "Fecha", "Prenda", "Tipo", "Marca", "Color", "Precio", "Persona", "Teléfono"};
        tableModel = new DefaultTableModel(columnNames, 0) {
            @Override
            public boolean isCellEditable(int row, int column) {
                return false; // Hacer la tabla no editable
            }
        };
        tablaInformes = new JTable(tableModel);
        tablaInformes.setAutoResizeMode(JTable.AUTO_RESIZE_OFF);
        tablaInformes.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        tablaInformes.setRowHeight(25);
        tablaInformes.setGridColor(new Color(255, 192, 203));
        tablaInformes.setSelectionBackground(new Color(255, 182, 193, 50));
        tablaInformes.setSelectionForeground(new Color(33, 37, 41));
        tablaInformes.getTableHeader().setFont(new Font("Segoe UI", Font.BOLD, 12));
        tablaInformes.getTableHeader().setBackground(new Color(255, 240, 245));
        tablaInformes.getTableHeader().setForeground(new Color(139, 0, 98));
        JScrollPane scrollPane = new JScrollPane(tablaInformes);
        scrollPane.setHorizontalScrollBarPolicy(JScrollPane.HORIZONTAL_SCROLLBAR_AS_NEEDED);
        scrollPane.setBorder(BorderFactory.createLineBorder(new Color(255, 192, 203), 1));
        tablePanel.add(scrollPane, BorderLayout.CENTER);

        // Panel de totales con estilo moderno
        JPanel totalesPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        totalesPanel.setBackground(new Color(255, 240, 245));
        totalesPanel.setBorder(BorderFactory.createEmptyBorder(10, 15, 10, 15));
        totalLabel = new JLabel("💰 Total: $0.00");
        totalLabel.setFont(new Font("Segoe UI", Font.BOLD, 16));
        totalLabel.setForeground(new Color(255, 20, 147));
        totalesPanel.add(totalLabel);
        tablePanel.add(totalesPanel, BorderLayout.SOUTH);

        // Agregar paneles al panel principal
        add(filtrosPanel, BorderLayout.NORTH);
        add(tablePanel, BorderLayout.CENTER);

        // Si los DAOs no se pudieron inicializar, no continuar
        if (informeDAO == null || proveedorDAO == null) {
            proveedorComboBox.setEnabled(false);
            buscarButton.setEnabled(false);
            limpiarButton.setEnabled(false);
            return;
        }

        // Cargar datos iniciales
        cargarProveedores();

        // Listeners
        actualizarButton.addActionListener(e -> {
            cargarProveedores();
            buscarInformes();
        });
        buscarButton.addActionListener(e -> buscarInformes());
        limpiarButton.addActionListener(e -> limpiarFiltros());
        exportarExcelButton.addActionListener(e -> exportarAExcel());
    }

    private void cargarProveedores() {
        // Limpiar el combo box primero (excepto el primer item que es "Todos")
        int itemCount = proveedorComboBox.getItemCount();
        for (int i = itemCount - 1; i > 0; i--) {
            proveedorComboBox.removeItemAt(i);
        }
        
        try {
            List<Proveedor> proveedores = proveedorDAO.obtenerTodos();
            for (Proveedor p : proveedores) {
                proveedorComboBox.addItem(p);
            }
        } catch (SQLException e) {
            JOptionPane.showMessageDialog(this, "Error al cargar proveedores: " + e.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
        }
    }

    private void buscarInformes() {
        tableModel.setRowCount(0);
        double total = 0.0;

        try {
            List<InformeVenta> informes;
            Proveedor proveedorSeleccionado = (Proveedor) proveedorComboBox.getSelectedItem();

            // Determinar qué filtro aplicar
            if (proveedorSeleccionado == null) {
                // Sin filtro, mostrar todos los informes
                informes = informeDAO.obtenerTodos();
            } else {
                // Filtrar solo por proveedor
                informes = informeDAO.obtenerPorProveedor(proveedorSeleccionado.getId());
            }

            // Formateador de fecha
            SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy HH:mm");

            // Llenar la tabla
            for (InformeVenta informe : informes) {
                Object[] rowData = {
                    informe.getIdVenta(),
                    informe.getFechaVenta() != null ? dateFormat.format(informe.getFechaVenta()) : "",
                    informe.getDescripcionProducto() != null ? informe.getDescripcionProducto() : "",
                    informe.getTipoPrenda() != null ? informe.getTipoPrenda() : "",
                    informe.getMarca() != null ? informe.getMarca() : "",
                    informe.getColor() != null ? informe.getColor() : "",
                    String.format("$%.2f", informe.getPrecioUnitario()),
                    informe.getNombreProveedor() != null ? informe.getNombreProveedor() : "",
                    informe.getTelefonoProveedor() != null ? informe.getTelefonoProveedor() : ""
                };
                tableModel.addRow(rowData);
                total += informe.getPrecioUnitario();
            }

            totalLabel.setText(String.format("Total: $%.2f", total));

            if (informes.isEmpty()) {
                JOptionPane.showMessageDialog(this, "No se encontraron informes con los filtros seleccionados.", "Sin resultados", JOptionPane.INFORMATION_MESSAGE);
            }

        } catch (SQLException e) {
            JOptionPane.showMessageDialog(this, "Error al buscar informes: " + e.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
            e.printStackTrace();
        }
    }

    private void limpiarFiltros() {
        proveedorComboBox.setSelectedIndex(0); // Seleccionar "Todos"
        buscarInformes();
    }
    
    /**
     * Exporta el informe actual a un archivo Excel (formato XML Spreadsheet)
     * Ordenado por proveedor en forma ascendente
     */
    private void exportarAExcel() {
        try {
            // Obtener los datos actuales
            List<InformeVenta> informes;
            Proveedor proveedorSeleccionado = (Proveedor) proveedorComboBox.getSelectedItem();

            if (proveedorSeleccionado == null) {
                informes = informeDAO.obtenerTodos();
            } else {
                informes = informeDAO.obtenerPorProveedor(proveedorSeleccionado.getId());
            }

            if (informes.isEmpty()) {
                JOptionPane.showMessageDialog(this, "No hay datos para exportar.", "Sin datos", JOptionPane.WARNING_MESSAGE);
                return;
            }

            // Ordenar por proveedor en forma ascendente
            Collections.sort(informes, new Comparator<InformeVenta>() {
                @Override
                public int compare(InformeVenta i1, InformeVenta i2) {
                    String nombre1 = i1.getNombreProveedor() != null ? i1.getNombreProveedor() : "";
                    String nombre2 = i2.getNombreProveedor() != null ? i2.getNombreProveedor() : "";
                    return nombre1.compareToIgnoreCase(nombre2);
                }
            });

            // Diálogo para seleccionar dónde guardar el archivo
            JFileChooser fileChooser = new JFileChooser();
            fileChooser.setDialogTitle("Guardar informe de ventas como Excel");
            fileChooser.setSelectedFile(new File("Informe_Ventas_" + new SimpleDateFormat("yyyyMMdd_HHmmss").format(new Date()) + ".xls"));
            
            int userSelection = fileChooser.showSaveDialog(this);
            
            if (userSelection == JFileChooser.APPROVE_OPTION) {
                File fileToSave = fileChooser.getSelectedFile();
                String filePath = fileToSave.getAbsolutePath();
                
                // Asegurar que tenga extensión .xls
                if (!filePath.toLowerCase().endsWith(".xls")) {
                    filePath += ".xls";
                    fileToSave = new File(filePath);
                }

                // Generar el archivo Excel (formato XML Spreadsheet)
                generarArchivoExcel(informes, fileToSave);
                
                JOptionPane.showMessageDialog(this, 
                    "Informe exportado exitosamente a:\n" + filePath, 
                    "Exportación exitosa", 
                    JOptionPane.INFORMATION_MESSAGE);
            }

        } catch (SQLException e) {
            JOptionPane.showMessageDialog(this, "Error al obtener datos: " + e.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
            e.printStackTrace();
        } catch (IOException e) {
            JOptionPane.showMessageDialog(this, "Error al exportar el archivo: " + e.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
            e.printStackTrace();
        }
    }
    
    /**
     * Genera un archivo Excel en formato XML Spreadsheet
     */
    private void generarArchivoExcel(List<InformeVenta> informes, File archivo) throws IOException {
        SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy HH:mm");
        
        try (FileWriter writer = new FileWriter(archivo, false)) {
            // Encabezado XML del archivo Excel
            writer.write("<?xml version=\"1.0\"?>\n");
            writer.write("<?mso-application progid=\"Excel.Sheet\"?>\n");
            writer.write("<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\"\n");
            writer.write(" xmlns:o=\"urn:schemas-microsoft-com:office:office\"\n");
            writer.write(" xmlns:x=\"urn:schemas-microsoft-com:office:excel\"\n");
            writer.write(" xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\"\n");
            writer.write(" xmlns:html=\"http://www.w3.org/TR/REC-html40\">\n");
            
            // Estilos
            writer.write("<Styles>\n");
            writer.write("<Style ss:ID=\"Header\">\n");
            writer.write("<Font ss:Bold=\"1\"/>\n");
            writer.write("<Interior ss:Color=\"#CCCCCC\" ss:Pattern=\"Solid\"/>\n");
            writer.write("</Style>\n");
            writer.write("</Styles>\n");
            
            // Hoja de trabajo
            writer.write("<Worksheet ss:Name=\"Informe de Ventas\">\n");
            writer.write("<Table>\n");
            
            // Encabezados de columna
            writer.write("<Row>\n");
            String[] headers = {"ID Venta", "Fecha", "Prenda", "Tipo", "Marca", "Color", "Precio", "Persona", "Teléfono"};
            for (String header : headers) {
                writer.write("<Cell ss:StyleID=\"Header\"><Data ss:Type=\"String\">" + escapeXML(header) + "</Data></Cell>\n");
            }
            writer.write("</Row>\n");
            
            // Datos
            double total = 0.0;
            for (InformeVenta informe : informes) {
                writer.write("<Row>\n");
                
                writer.write("<Cell><Data ss:Type=\"Number\">" + informe.getIdVenta() + "</Data></Cell>\n");
                
                String fecha = informe.getFechaVenta() != null ? dateFormat.format(informe.getFechaVenta()) : "";
                writer.write("<Cell><Data ss:Type=\"String\">" + escapeXML(fecha) + "</Data></Cell>\n");
                
                writer.write("<Cell><Data ss:Type=\"String\">" + escapeXML(informe.getDescripcionProducto() != null ? informe.getDescripcionProducto() : "") + "</Data></Cell>\n");
                writer.write("<Cell><Data ss:Type=\"String\">" + escapeXML(informe.getTipoPrenda() != null ? informe.getTipoPrenda() : "") + "</Data></Cell>\n");
                writer.write("<Cell><Data ss:Type=\"String\">" + escapeXML(informe.getMarca() != null ? informe.getMarca() : "") + "</Data></Cell>\n");
                writer.write("<Cell><Data ss:Type=\"String\">" + escapeXML(informe.getColor() != null ? informe.getColor() : "") + "</Data></Cell>\n");
                writer.write("<Cell><Data ss:Type=\"Number\">" + informe.getPrecioUnitario() + "</Data></Cell>\n");
                writer.write("<Cell><Data ss:Type=\"String\">" + escapeXML(informe.getNombreProveedor() != null ? informe.getNombreProveedor() : "") + "</Data></Cell>\n");
                writer.write("<Cell><Data ss:Type=\"String\">" + escapeXML(informe.getTelefonoProveedor() != null ? informe.getTelefonoProveedor() : "") + "</Data></Cell>\n");
                
                writer.write("</Row>\n");
                total += informe.getPrecioUnitario();
            }
            
            // Fila de total
            writer.write("<Row>\n");
            writer.write("<Cell ss:StyleID=\"Header\"><Data ss:Type=\"String\">TOTAL</Data></Cell>\n");
            for (int i = 0; i < 7; i++) {
                writer.write("<Cell></Cell>\n");
            }
            writer.write("<Cell ss:StyleID=\"Header\"><Data ss:Type=\"Number\">" + total + "</Data></Cell>\n");
            writer.write("</Row>\n");
            
            writer.write("</Table>\n");
            writer.write("</Worksheet>\n");
            writer.write("</Workbook>\n");
        }
    }
    
    /**
     * Escapa caracteres especiales para XML
     */
    private String escapeXML(String str) {
        if (str == null) return "";
        return str.replace("&", "&amp;")
                  .replace("<", "&lt;")
                  .replace(">", "&gt;")
                  .replace("\"", "&quot;")
                  .replace("'", "&apos;");
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

