package proyectomago.panelclass;

import javax.swing.*;
import java.awt.*;
import proyectomago.ui.ProveedorPanel;
import proyectomago.ui.ProductoPanel;
import proyectomago.ui.InformePanel;

public class ProyectoMago {

    public static void main(String[] args) {
        // Cambiar el Look and Feel a Nimbus (moderno)
        try {
            UIManager.setLookAndFeel("javax.swing.plaf.nimbus.NimbusLookAndFeel");
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Personalizar la apariencia de los componentes ANTES de crear los componentes
        customizeComponents();

        // Crear el frame
        JFrame frame = new JFrame("🛍️ Tienda de Ropa de Segunda Mano - Sistema de Gestión");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setResizable(true);
        
        // Establecer color de fondo moderno
        frame.getContentPane().setBackground(new Color(255, 240, 245));

        // Crear el JTabbedPane con estilo moderno
        JTabbedPane tabbedPane = new JTabbedPane();
        tabbedPane.setBackground(new Color(255, 255, 255));
        tabbedPane.setForeground(new Color(33, 37, 41));

        // Panel de Ventas (el panel principal original)
        PrincipalPanel ventasPanel = new PrincipalPanel();
        tabbedPane.addTab("💰 Ventas", ventasPanel);

        // Panel de Personas que traen prendas
        ProveedorPanel proveedorPanel = new ProveedorPanel();
        tabbedPane.addTab("👥 Personas", proveedorPanel);

        // Panel de Prendas
        ProductoPanel productoPanel = new ProductoPanel();
        tabbedPane.addTab("👕 Prendas", productoPanel);

        // Panel de Informes
        InformePanel informePanel = new InformePanel();
        tabbedPane.addTab("📊 Informes", informePanel);

        // Añadir el JTabbedPane al frame
        frame.add(tabbedPane, BorderLayout.CENTER);

        // Establecer un tamaño preferido
        frame.setPreferredSize(new Dimension(1400, 800));

        // Ajustar el tamaño y hacerlo visible
        frame.pack();
        frame.setLocationRelativeTo(null); // Centrar la ventana
        frame.setVisible(true);
    }

    private static void customizeComponents() {
        // Colores modernos
        Color primaryColor = new Color(255, 105, 180); // Rosa moderno
        Color backgroundColor = new Color(255, 240, 245); // Fondo rosa claro
        
        // Fuente moderna
        Font modernFont = new Font("Segoe UI", Font.PLAIN, 13);
        Font modernFontBold = new Font("Segoe UI", Font.BOLD, 13);
        Font titleFont = new Font("Segoe UI", Font.BOLD, 16);
        
        // Estilo para botones
        UIManager.put("Button.background", primaryColor);
        UIManager.put("Button.foreground", Color.WHITE);
        UIManager.put("Button.font", modernFontBold);
        UIManager.put("Button.border", BorderFactory.createEmptyBorder(10, 20, 10, 20));
        UIManager.put("Button.focus", new Color(primaryColor.getRed(), primaryColor.getGreen(), primaryColor.getBlue(), 100));
        
        // Estilo para tabs
        UIManager.put("TabbedPane.font", titleFont);
        UIManager.put("TabbedPane.selected", primaryColor);
        UIManager.put("TabbedPane.background", backgroundColor);
        
        // Estilo para labels
        UIManager.put("Label.font", modernFont);
        UIManager.put("Label.foreground", new Color(33, 37, 41));
        
        // Estilo para campos de texto
        UIManager.put("TextField.font", modernFont);
        UIManager.put("TextField.background", Color.WHITE);
        UIManager.put("TextField.border", BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(new Color(255, 192, 203), 1),
            BorderFactory.createEmptyBorder(8, 12, 8, 12)
        ));
        
        // Estilo para tablas
        UIManager.put("Table.font", modernFont);
        UIManager.put("Table.background", Color.WHITE);
        UIManager.put("Table.gridColor", new Color(255, 192, 203));
        UIManager.put("Table.selectionBackground", new Color(255, 182, 193, 50));
        UIManager.put("Table.selectionForeground", new Color(33, 37, 41));
        
        // Estilo para combobox
        UIManager.put("ComboBox.font", modernFont);
        UIManager.put("ComboBox.background", Color.WHITE);
        
        // Estilo para paneles con borde
        UIManager.put("TitledBorder.font", modernFontBold);
        UIManager.put("TitledBorder.titleColor", new Color(33, 37, 41));
    }
}
