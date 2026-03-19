package connectDatabase;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.net.URISyntaxException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

public class conection {

    // Bloque estático para cargar el controlador JDBC de SQLite
    static {
        cargarDriver();
    }
    
    // Método para cargar el driver de SQLite
    private static void cargarDriver() {
        try {
            // Intentar cargar el driver
            Class.forName("org.sqlite.JDBC");
            System.out.println("Controlador SQLite cargado correctamente.");
        } catch (ClassNotFoundException e) {
            System.err.println("ERROR CRÍTICO: No se pudo encontrar el controlador JDBC de SQLite.");
            System.err.println("Asegúrate de que el archivo sqlite-jdbc-3.39.3.0.jar esté en el classpath.");
            System.err.println("Ubicación esperada: build/lib/sqlite-jdbc-3.39.3.0.jar");
            e.printStackTrace();
        }
    }

    // Variable para mantener la conexión activa
    private static Connection connection;

    /**
     * Obtiene la ruta del directorio donde se ejecuta el JAR o la aplicación
     */
    private static String getJarDirectory() {
        try {
            // Obtener la ruta del JAR o del directorio de clases
            File jarFile = new File(conection.class.getProtectionDomain().getCodeSource().getLocation().toURI());
            
            // Si es un JAR, obtener el directorio padre
            if (jarFile.isFile()) {
                String parent = jarFile.getParent();
                if (parent != null) {
                    return parent;
                }
            } else {
                // Si es un directorio (desarrollo), usar el directorio actual
                return jarFile.getAbsolutePath();
            }
        } catch (URISyntaxException e) {
            // Si hay error, usar el directorio actual de trabajo
            System.err.println("Advertencia: No se pudo obtener la ruta del JAR, usando directorio actual.");
        } catch (Exception e) {
            System.err.println("Advertencia: Error al obtener la ruta del JAR: " + e.getMessage());
        }
        
        // Fallback: usar el directorio actual de trabajo
        return System.getProperty("user.dir");
    }
    
    /**
     * Lee la ruta de la base de datos desde el archivo config.ini
     * @return La ruta de la base de datos, o null si no se puede leer
     */
    private static String leerRutaDesdeConfig() {
        String jarDir = getJarDirectory();
        File configFile = new File(jarDir, "config.ini");
        
        System.out.println("Buscando config.ini en: " + configFile.getAbsolutePath());
        
        if (!configFile.exists()) {
            System.err.println("ADVERTENCIA: El archivo config.ini no existe en: " + configFile.getAbsolutePath());
            System.err.println("Se usará la ruta por defecto: prueba.db en el mismo directorio.");
            return null;
        }
        
        try (BufferedReader reader = new BufferedReader(new FileReader(configFile))) {
            String line;
            while ((line = reader.readLine()) != null) {
                // Ignorar comentarios y líneas vacías
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#") || line.startsWith(";")) {
                    continue;
                }
                
                // Buscar la línea database_path
                if (line.toLowerCase().startsWith("database_path")) {
                    int equalsIndex = line.indexOf('=');
                    if (equalsIndex > 0) {
                        String path = line.substring(equalsIndex + 1).trim();
                        // Eliminar comillas si las tiene
                        if ((path.startsWith("\"") && path.endsWith("\"")) || 
                            (path.startsWith("'") && path.endsWith("'"))) {
                            path = path.substring(1, path.length() - 1);
                        }
                        
                        // Si la ruta es relativa, hacerla absoluta desde el directorio del JAR
                        File dbFile = new File(path);
                        if (!dbFile.isAbsolute()) {
                            dbFile = new File(jarDir, path);
                        }
                        
                        System.out.println("Ruta de base de datos leída desde config.ini: " + dbFile.getAbsolutePath());
                        return dbFile.getAbsolutePath();
                    }
                }
            }
            
            System.err.println("ADVERTENCIA: No se encontró 'database_path' en config.ini");
            return null;
        } catch (IOException e) {
            System.err.println("ERROR al leer config.ini: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }
    
    /**
     * Obtiene la URL de la base de datos desde config.ini o usa una ruta por defecto
     */
    private static String getDatabaseURL() {
        String databasePath = leerRutaDesdeConfig();
        
        // Si no se pudo leer del config, usar ruta por defecto en el mismo directorio del JAR
        if (databasePath == null || databasePath.isEmpty()) {
            String jarDir = getJarDirectory();
            databasePath = new File(jarDir, "prueba.db").getAbsolutePath();
            System.out.println("Usando ruta por defecto: " + databasePath);
        }
        
        // Mostrar la ruta final
        System.out.println("Ruta final de la base de datos: " + databasePath);
        
        // Devuelve la URL completa para la conexión a la base de datos SQLite
        return "jdbc:sqlite:" + databasePath;
    }
    
    // Método para verificar que el driver esté disponible
    private static void verificarDriver() throws SQLException {
        try {
            // Verificar que el driver esté registrado
            java.sql.Driver driver = DriverManager.getDriver("jdbc:sqlite:");
            if (driver == null) {
                // Si no está registrado, intentar cargarlo manualmente
                Class.forName("org.sqlite.JDBC");
            }
        } catch (ClassNotFoundException e) {
            throw new SQLException("El driver JDBC de SQLite no está disponible en el classpath. " +
                    "Asegúrate de que sqlite-jdbc-3.39.3.0.jar esté en el classpath.", e);
        } catch (SQLException e) {
            // Si hay un error al obtener el driver, intentar cargarlo manualmente
            try {
                Class.forName("org.sqlite.JDBC");
            } catch (ClassNotFoundException ex) {
                throw new SQLException("El driver JDBC de SQLite no está disponible en el classpath.", ex);
            }
        }
    }

    // Método para obtener la conexión a la base de datos
    public Connection getConnection() throws SQLException {
        // Verificar que el driver esté disponible
        verificarDriver();
        
        if (connection == null || connection.isClosed()) {
            // Si la conexión no está activa o es nula, abrir una nueva
            String databaseUrl = getDatabaseURL();
            System.out.println("Intentando conectar a: " + databaseUrl);
            
            try {
                // Verificar que la URL sea válida
                if (databaseUrl == null || databaseUrl.isEmpty()) {
                    throw new SQLException("La URL de la base de datos está vacía o es nula.");
                }
                
                // Intentar establecer la conexión
                connection = DriverManager.getConnection(databaseUrl);
                System.out.println("Conexión a la base de datos establecida correctamente."); 
                
                // Inicializar las tablas si no existen
                inicializarTablas(connection);
            } catch (SQLException e) {
                String errorMsg = e.getMessage();
                System.err.println("========================================");
                System.err.println("ERROR AL CONECTAR A LA BASE DE DATOS:");
                System.err.println("========================================");
                System.err.println("Mensaje: " + errorMsg);
                System.err.println("URL de conexión: " + databaseUrl);
                
                if (errorMsg != null && errorMsg.contains("no suitable driver")) {
                    System.err.println("\nSOLUCIÓN:");
                    System.err.println("El driver JDBC de SQLite no se encuentra en el classpath.");
                    System.err.println("Si ejecutas desde NetBeans:");
                    System.err.println("  1. Verifica que el JAR esté en: build/lib/sqlite-jdbc-3.39.3.0.jar");
                    System.err.println("  2. En NetBeans: Click derecho en el proyecto > Properties > Libraries");
                    System.err.println("     Asegúrate de que el JAR esté agregado.");
                    System.err.println("\nSi ejecutas el JAR directamente:");
                    System.err.println("  java -cp \"ProyectoMago.jar;build/lib/sqlite-jdbc-3.39.3.0.jar\" proyectomago.panelclass.ProyectoMago");
                }
                System.err.println("========================================");
                throw e;
            }
        }
        return connection;
    }
    
    // Método para inicializar todas las tablas
    private void inicializarTablas(Connection conn) {
        createTableIfNotExists(conn);
        createTableIfNotExistsInformes(conn);
        createTableIfNotExistsProveedores(conn);
        createTableIfNotExistsProductos(conn);
        createTableIfNotExistsVentas(conn);
        createTableIfNotExistsVentaItems(conn);
    }

    // Método para realizar la conexión y ejecutar el SELECT
    public void main(String[] args) {
        // Cargar el controlador SQLite
        try {
            Class.forName("org.sqlite.JDBC"); // Cargar el controlador
            System.out.println("Controlador SQLite cargado correctamente.");
        } catch (ClassNotFoundException e) {
            System.out.println("Error al cargar el controlador: " + e.getMessage());
            return;  // Detener el programa si no se puede cargar el controlador
        }

        try (Connection conn = getConnection()) {

            // Verificar que la conexión fue exitosa
            if (conn != null) {
                // Verificar si la tabla "menuPrecios" existe. Si no, crearla.
                createTableIfNotExists(conn);
                createTableIfNotExistsInformes(conn);
                createTableIfNotExistsProveedores(conn);
                createTableIfNotExistsProductos(conn);
                createTableIfNotExistsVentas(conn);
                createTableIfNotExistsVentaItems(conn);

                // Crear la consulta SQL
                String sql = "SELECT * FROM menuPrecios WHERE nombre = ?";

                // Crear el PreparedStatement
                try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
                    // Establecer el parámetro del nombre en la consulta
                    pstmt.setString(1, "milanesa");

                    // Ejecutar la consulta
                    try (ResultSet rs = pstmt.executeQuery()) {
                        // Verificar si se obtuvo algún resultado
                        if (rs.next()) {
                            // Obtener los datos de la consulta
                            int id = rs.getInt("id"); // Suponiendo que la tabla tiene un campo id
                            String nombre = rs.getString("nombre");
                            double precio = rs.getDouble("precio"); // Suponiendo que la tabla tiene un campo precio

                            // Mostrar los resultados
                            System.out.println("ID: " + id);
                            System.out.println("Nombre: " + nombre);
                            System.out.println("Precio: " + precio);
                        } else {
                            System.out.println("No se encontró ningún registro con el nombre 'milanesa'.");
                        }
                    }
                }
            }
        } catch (SQLException e) {
            System.out.println("Error de conexión: " + e.getMessage());
        }
    }

    // Método para crear la tabla "menuPrecios" si no existe
    private static void createTableIfNotExists(Connection conn) {
        // SQL para crear la tabla si no existe
        String createTableSQL = "CREATE TABLE IF NOT EXISTS menuPrecios ("
                + "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                + "nombre TEXT NOT NULL, "
                + "precio REAL NOT NULL"
                + ");";

        // Crear la tabla
        try (Statement stmt = conn.createStatement()) {
            stmt.execute(createTableSQL);
            System.out.println("Tabla 'menuPrecios' verificada o creada.");
        } catch (SQLException e) {
            System.out.println("Error al crear la tabla: " + e.getMessage());
        }
    }
    
    // Método para crear la tabla "menuPrecios" si no existe
    private static void createTableIfNotExistsInformes(Connection conn) {
        // SQL para crear la tabla si no existe
        String createTableSQL = "CREATE TABLE IF NOT EXISTS informes ("
                + "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                + "fecha TEXT NOT NULL, "
                + "fechaActivo TEXT NOT NULL, "
                + "total REAL NOT NULL"
                + ");";

        // Crear la tabla
        try (Statement stmt = conn.createStatement()) {
            stmt.execute(createTableSQL);
            System.out.println("Tabla 'informes' verificada o creada.");
        } catch (SQLException e) {
            System.out.println("Error al crear la tabla informes: " + e.getMessage());
        }
    }

    // Método para crear la tabla "proveedores" si no existe
    private static void createTableIfNotExistsProveedores(Connection conn) {
        String createTableSQL = "CREATE TABLE IF NOT EXISTS proveedores ("
                + "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                + "nombre TEXT NOT NULL, "
                + "telefono TEXT, "
                + "email TEXT"
                + ");";

        try (Statement stmt = conn.createStatement()) {
            stmt.execute(createTableSQL);
            System.out.println("Tabla 'proveedores' verificada o creada.");
        } catch (SQLException e) {
            System.out.println("Error al crear la tabla proveedores: " + e.getMessage());
        }
    }

    // Método para crear la tabla "productos" si no existe
    private static void createTableIfNotExistsProductos(Connection conn) {
        try (Statement stmt = conn.createStatement()) {
            // Habilitar el soporte para claves foráneas (debe ejecutarse primero)
            stmt.execute("PRAGMA foreign_keys = ON;");
            
            String createTableSQL = "CREATE TABLE IF NOT EXISTS productos ("
                    + "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                    + "descripcion TEXT NOT NULL, "
                    + "tipo_prenda TEXT, "
                    + "marca TEXT, "
                    + "color TEXT, "
                    + "condicion TEXT, "
                    + "precio_venta REAL NOT NULL, "
                    + "talle TEXT, "
                    + "id_proveedor INTEGER NOT NULL, "
                    + "estado TEXT NOT NULL DEFAULT 'disponible', "
                    + "FOREIGN KEY(id_proveedor) REFERENCES proveedores(id)"
                    + ");";

            stmt.execute(createTableSQL);
            
            // Agregar nuevas columnas si la tabla ya existe pero no tiene estas columnas (migración)
            // Verificar si la columna existe antes de agregarla
            try {
                stmt.execute("ALTER TABLE productos ADD COLUMN tipo_prenda TEXT;");
                System.out.println("Columna 'tipo_prenda' agregada a la tabla productos.");
            } catch (SQLException e) {
                // La columna ya existe, ignorar silenciosamente
            }
            try {
                stmt.execute("ALTER TABLE productos ADD COLUMN marca TEXT;");
                System.out.println("Columna 'marca' agregada a la tabla productos.");
            } catch (SQLException e) {
                // La columna ya existe, ignorar silenciosamente
            }
            try {
                stmt.execute("ALTER TABLE productos ADD COLUMN color TEXT;");
                System.out.println("Columna 'color' agregada a la tabla productos.");
            } catch (SQLException e) {
                // La columna ya existe, ignorar silenciosamente
            }
            try {
                stmt.execute("ALTER TABLE productos ADD COLUMN condicion TEXT;");
                System.out.println("Columna 'condicion' agregada a la tabla productos.");
            } catch (SQLException e) {
                // La columna ya existe, ignorar silenciosamente
            }
            
            System.out.println("Tabla 'productos' verificada o creada y claves foráneas habilitadas.");
        } catch (SQLException e) {
            System.err.println("Error al crear la tabla productos: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // Método para crear la tabla "ventas" si no existe
    private static void createTableIfNotExistsVentas(Connection conn) {
        String createTableSQL = "CREATE TABLE IF NOT EXISTS ventas ("
                + "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                + "fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "
                + "total REAL NOT NULL"
                + ");";

        try (Statement stmt = conn.createStatement()) {
            stmt.execute(createTableSQL);
            System.out.println("Tabla 'ventas' verificada o creada.");
        } catch (SQLException e) {
            System.out.println("Error al crear la tabla ventas: " + e.getMessage());
        }
    }

    // Método para crear la tabla "venta_items" si no existe
    private static void createTableIfNotExistsVentaItems(Connection conn) {
        String createTableSQL = "CREATE TABLE IF NOT EXISTS venta_items ("
                + "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                + "id_venta INTEGER NOT NULL, "
                + "id_producto INTEGER NOT NULL, "
                + "precio_unitario REAL NOT NULL, "
                + "FOREIGN KEY(id_venta) REFERENCES ventas(id), "
                + "FOREIGN KEY(id_producto) REFERENCES productos(id)"
                + ");";

        try (Statement stmt = conn.createStatement()) {
            stmt.execute(createTableSQL);
            System.out.println("Tabla 'venta_items' verificada o creada.");
        } catch (SQLException e) {
            System.out.println("Error al crear la tabla venta_items: " + e.getMessage());
        }
    }

    // Método para crear y devolver un PreparedStatement
    public PreparedStatement prepareStatement(Connection conn, String sql) {
        try {
            // Crear y devolver un PreparedStatement con la conexión proporcionada
            return conn.prepareStatement(sql);
        } catch (SQLException e) {
            System.out.println("Error al preparar la consulta: " + e.getMessage());
            return null;
        }
    }
}
