/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/GUIForms/JPanel.java to edit this template
 */
package proyectomago.panelclass;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import connectDatabase.conection;
import proyectomago.dao.ProductoDAO;
import proyectomago.dao.VentaDAO;
import proyectomago.model.Producto;
import proyectomago.model.Venta;
import proyectomago.model.VentaItem;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import javax.print.Doc;
import javax.print.DocFlavor;
import javax.print.DocPrintJob;
import javax.print.PrintService;
import javax.print.PrintServiceLookup;
import javax.print.SimpleDoc;
import java.util.Date;


/**
 * 
 * @author mago
 */
public class PrincipalPanel extends javax.swing.JPanel {

    // --- Nuevos Componentes y DAOs ---
    private ProductoDAO productoDAO;
    private VentaDAO ventaDAO;

    private JTable tablaProductosDisponibles;
    private DefaultTableModel productosDisponiblesModel;

    private JTable tablaVentaActual;
    private DefaultTableModel ventaActualModel;

    private List<Producto> ventaActualItems = new ArrayList<>();
    private JLabel totalLabel;
    
    public PrincipalPanel() {
        // --- Inicialización de DAOs ---
        try {
            conection dbConnection = new conection();
            Connection conn = dbConnection.getConnection();
            productoDAO = new ProductoDAO(conn);
            ventaDAO = new VentaDAO(conn);
        } catch (SQLException e) {
            JOptionPane.showMessageDialog(this, "Error de conexión: " + e.getMessage(), "Error de Base de Datos", JOptionPane.ERROR_MESSAGE);
            e.printStackTrace();
        }

        // --- Configuración del Layout Principal con fondo moderno ---
        setLayout(new BorderLayout(15, 15));
        setBackground(new Color(255, 240, 245));
        setBorder(BorderFactory.createEmptyBorder(15, 15, 15, 15));

        // --- Panel de Prendas Disponibles (Izquierda) con estilo moderno ---
        JPanel panelIzquierdo = new JPanel(new BorderLayout(10, 10));
        panelIzquierdo.setBackground(Color.WHITE);
        panelIzquierdo.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createTitledBorder(
                BorderFactory.createEmptyBorder(),
                "👕 Prendas Disponibles",
                0, 0,
                new Font("Segoe UI", Font.BOLD, 14)
            ),
            BorderFactory.createEmptyBorder(10, 10, 10, 10)
        ));

        productosDisponiblesModel = new DefaultTableModel(new Object[]{"ID", "Descripción", "Tipo", "Marca", "Color", "Talle", "Precio", "Quien trajo"}, 0) {
            @Override
            public boolean isCellEditable(int row, int column) {
                return false; // Hacer la tabla no editable
            }
        };
        tablaProductosDisponibles = new JTable(productosDisponiblesModel);
        tablaProductosDisponibles.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        tablaProductosDisponibles.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        tablaProductosDisponibles.setRowHeight(25);
        tablaProductosDisponibles.setGridColor(new Color(255, 192, 203));
        tablaProductosDisponibles.setSelectionBackground(new Color(255, 182, 193, 50));
        tablaProductosDisponibles.setSelectionForeground(new Color(33, 37, 41));
        tablaProductosDisponibles.getTableHeader().setFont(new Font("Segoe UI", Font.BOLD, 12));
        tablaProductosDisponibles.getTableHeader().setBackground(new Color(255, 240, 245));
        tablaProductosDisponibles.getTableHeader().setForeground(new Color(139, 0, 98));
        JScrollPane scrollIzquierdo = new JScrollPane(tablaProductosDisponibles);
        scrollIzquierdo.setBorder(BorderFactory.createLineBorder(new Color(255, 192, 203), 1));
        panelIzquierdo.add(scrollIzquierdo, BorderLayout.CENTER);

        // Panel de botones con estilo moderno
        JPanel botonesPanel = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 5));
        botonesPanel.setBackground(Color.WHITE);
        JButton actualizarButton = crearBotonModerno("🔄 Actualizar Lista", new Color(255, 182, 193));
        JButton agregarAlCarritoButton = crearBotonModerno("➕ Agregar al Carrito", new Color(255, 105, 180));
        botonesPanel.add(actualizarButton);
        botonesPanel.add(agregarAlCarritoButton);
        panelIzquierdo.add(botonesPanel, BorderLayout.SOUTH);

        // --- Panel de Venta Actual (Derecha) con estilo moderno ---
        JPanel panelDerecho = new JPanel(new BorderLayout(10, 10));
        panelDerecho.setBackground(Color.WHITE);
        panelDerecho.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createTitledBorder(
                BorderFactory.createEmptyBorder(),
                "🛒 Venta Actual",
                0, 0,
                new Font("Segoe UI", Font.BOLD, 14)
            ),
            BorderFactory.createEmptyBorder(10, 10, 10, 10)
        ));

        ventaActualModel = new DefaultTableModel(new Object[]{"Descripción", "Precio"}, 0) {
             @Override
            public boolean isCellEditable(int row, int column) {
                return false; // Hacer la tabla no editable
            }
        };
        tablaVentaActual = new JTable(ventaActualModel);
        tablaVentaActual.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        tablaVentaActual.setRowHeight(25);
        tablaVentaActual.setGridColor(new Color(255, 192, 203));
        tablaVentaActual.setSelectionBackground(new Color(255, 182, 193, 50));
        tablaVentaActual.setSelectionForeground(new Color(33, 37, 41));
        tablaVentaActual.getTableHeader().setFont(new Font("Segoe UI", Font.BOLD, 12));
        tablaVentaActual.getTableHeader().setBackground(new Color(255, 240, 245));
        tablaVentaActual.getTableHeader().setForeground(new Color(139, 0, 98));
        JScrollPane scrollDerecho = new JScrollPane(tablaVentaActual);
        scrollDerecho.setBorder(BorderFactory.createLineBorder(new Color(255, 192, 203), 1));
        panelDerecho.add(scrollDerecho, BorderLayout.CENTER);

        // Panel para total y botones con estilo moderno
        JPanel panelSurDerecho = new JPanel(new FlowLayout(FlowLayout.RIGHT, 15, 10));
        panelSurDerecho.setBackground(new Color(255, 240, 245));
        panelSurDerecho.setBorder(BorderFactory.createEmptyBorder(10, 15, 10, 15));
        totalLabel = new JLabel("💰 Total: $0.00");
        totalLabel.setFont(new Font("Segoe UI", Font.BOLD, 18));
        totalLabel.setForeground(new Color(255, 20, 147));
        JButton cobrarButton = crearBotonModerno("💳 Cobrar e Imprimir Ticket", new Color(255, 105, 180));
        panelSurDerecho.add(totalLabel);
        panelSurDerecho.add(cobrarButton);
        panelDerecho.add(panelSurDerecho, BorderLayout.SOUTH);

        // --- Añadir paneles al layout principal ---
        JSplitPane splitPane = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, panelIzquierdo, panelDerecho);
        splitPane.setResizeWeight(0.6); // Dar más espacio a la lista de productos
        add(splitPane, BorderLayout.CENTER);

        // Si los DAOs no se pudieron inicializar, no continuar.
        if (productoDAO == null || ventaDAO == null) {
            actualizarButton.setEnabled(false);
            agregarAlCarritoButton.setEnabled(false);
            cobrarButton.setEnabled(false);
            return;
        }
        
        // --- Cargar Datos Iniciales ---
        refrescarTablaProductosDisponibles();

        // --- Action Listeners ---
        actualizarButton.addActionListener(e -> refrescarTablaProductosDisponibles());
        agregarAlCarritoButton.addActionListener(e -> agregarProductoACarrito());
        cobrarButton.addActionListener(e -> realizarVenta());
    }

    private void refrescarTablaProductosDisponibles() {
        // Asegurarse de que el DAO no es nulo
        if (productoDAO == null) return;
        
        productosDisponiblesModel.setRowCount(0);
        try {
            List<Producto> productos = productoDAO.obtenerDisponibles();
            for (Producto p : productos) {
                productosDisponiblesModel.addRow(new Object[]{
                    p.getId(),
                    p.getDescripcion(),
                    p.getTipoPrenda() != null ? p.getTipoPrenda() : "",
                    p.getMarca() != null ? p.getMarca() : "",
                    p.getColor() != null ? p.getColor() : "",
                    p.getTalle() != null ? p.getTalle() : "",
                    String.format("$%.2f", p.getPrecioVenta()),
                    p.getNombreProveedor() != null ? p.getNombreProveedor() : ""
                });
            }
        } catch (SQLException e) {
            JOptionPane.showMessageDialog(this, "Error al cargar prendas disponibles: " + e.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
        }
    }

    private void agregarProductoACarrito() {
        int selectedRow = tablaProductosDisponibles.getSelectedRow();
        if (selectedRow == -1) {
            JOptionPane.showMessageDialog(this, "Por favor, seleccione una prenda de la lista.", "Atención", JOptionPane.WARNING_MESSAGE);
            return;
        }

        int productoId = (int) productosDisponiblesModel.getValueAt(selectedRow, 0);
        
        try {
            List<Producto> productosDisponibles = productoDAO.obtenerDisponibles();
            Producto productoSeleccionado = null;
            for (Producto p : productosDisponibles) {
                if (p.getId() == productoId) {
                    productoSeleccionado = p;
                    break;
                }
            }

            if (productoSeleccionado != null) {
                ventaActualItems.add(productoSeleccionado);
                productosDisponiblesModel.removeRow(selectedRow);
                refrescarTablaVentaActual();
            }

        } catch (SQLException e) {
             JOptionPane.showMessageDialog(this, "Error al obtener producto: " + e.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
        }
    }
    
    private void refrescarTablaVentaActual() {
        ventaActualModel.setRowCount(0);
        double total = 0;
        for (Producto p : ventaActualItems) {
            ventaActualModel.addRow(new Object[]{p.getDescripcion(), p.getPrecioVenta()});
            total += p.getPrecioVenta();
        }
        totalLabel.setText(String.format("Total: $%.2f", total));
    }

    private void realizarVenta() {
        if (ventaActualItems.isEmpty()) {
            JOptionPane.showMessageDialog(this, "No hay prendas en el carrito.", "Venta Vacía", JOptionPane.WARNING_MESSAGE);
            return;
        }

        Venta nuevaVenta = new Venta();
        double total = 0;
        for (Producto p : ventaActualItems) {
            VentaItem item = new VentaItem();
            item.setIdProducto(p.getId());
            item.setPrecioUnitario(p.getPrecioVenta());
            item.setDescripcionProducto(p.getDescripcion());
            nuevaVenta.getItems().add(item);
            total += p.getPrecioVenta();
        }
        nuevaVenta.setTotal(total);

        try {
            // Guardar la venta en la base de datos
            ventaDAO.guardarVenta(nuevaVenta);
            
            // Imprimir el ticket
            imprimirTicket(nuevaVenta);
            
            // Limpiar el carrito DESPUÉS de guardar la venta exitosamente
            limpiarCarrito();
            
            // Mostrar mensaje de éxito
            JOptionPane.showMessageDialog(this, "Venta realizada exitosamente. El carrito ha sido limpiado.", "Éxito", JOptionPane.INFORMATION_MESSAGE);

        } catch (SQLException e) {
            JOptionPane.showMessageDialog(this, "Error al guardar la venta: " + e.getMessage(), "Error de Base de Datos", JOptionPane.ERROR_MESSAGE);
        } catch (Exception e) {
            // Si hay error al imprimir, igualmente limpiar el carrito si la venta se guardó
            JOptionPane.showMessageDialog(this, "Venta guardada pero hubo un error al imprimir: " + e.getMessage(), "Advertencia", JOptionPane.WARNING_MESSAGE);
            limpiarCarrito();
        }
    }
    
    /**
     * Limpia el carrito de venta y actualiza las tablas
     */
    private void limpiarCarrito() {
        // Limpiar la lista de items del carrito
        ventaActualItems.clear();
        
        // Refrescar la tabla del carrito (debe quedar vacía)
        refrescarTablaVentaActual();
        
        // Refrescar la lista de productos disponibles (para que aparezcan los vendidos como no disponibles)
        refrescarTablaProductosDisponibles();
    }
    
    private void imprimirTicket(Venta venta) {
        StringBuilder sb = new StringBuilder();
        sb.append("   TIENDA DE ROPA DE SEGUNDA MANO\n");
        sb.append("--------------------------------------\n");
        sb.append("TICKET DE VENTA\n\n");

        for (VentaItem item : venta.getItems()) {
            sb.append(String.format("% -25s $%.2f\n", item.getDescripcionProducto(), item.getPrecioUnitario()));
        }

        sb.append("\n--------------------------------------\n");
        sb.append(String.format("TOTAL: $%.2f\n", venta.getTotal()));
        sb.append("\nGracias por su compra!\n\n\n\n\n");

        try {
            PrintService printService = findPrintService("POS-80C"); 
            if (printService == null) {
                System.out.println("Impresora no encontrada. Ticket en consola:");
                System.out.println(sb.toString());
                JOptionPane.showMessageDialog(this, "Impresora no encontrada. El ticket se mostrará en la consola del sistema.", "Aviso", JOptionPane.INFORMATION_MESSAGE);
                return;
            }

            DocPrintJob job = printService.createPrintJob();
            
            byte[] ticketBytes = sb.toString().getBytes("CP437");
            
            // Comando de corte ESC/POS
            byte[] cutCommand = new byte[]{0x1D, 'V', 1};
            
            // Concatenar ticket con corte
            byte[] finalBytes = new byte[ticketBytes.length + cutCommand.length];
            System.arraycopy(ticketBytes, 0, finalBytes, 0, ticketBytes.length);
            System.arraycopy(cutCommand, 0, finalBytes, ticketBytes.length, cutCommand.length);

            Doc finalDoc = new SimpleDoc(finalBytes, DocFlavor.BYTE_ARRAY.AUTOSENSE, null);
            job.print(finalDoc, null);

        } catch (Exception e) {
            JOptionPane.showMessageDialog(this, "Error al imprimir el ticket: " + e.getMessage(), "Error de Impresión", JOptionPane.ERROR_MESSAGE);
        }
    }

    private PrintService findPrintService(String printerName) {
        for (PrintService service : PrintServiceLookup.lookupPrintServices(null, null)) {
            if (service.getName().equalsIgnoreCase(printerName)) {
                return service;
            }
        }
        return null;
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