package proyectomago.model;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class Venta {
    private int id;
    private Date fecha;
    private double total;
    private List<VentaItem> items;

    public Venta() {
        this.items = new ArrayList<>();
        this.fecha = new Date();
    }

    // Getters y Setters
    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public Date getFecha() {
        return fecha;
    }

    public void setFecha(Date fecha) {
        this.fecha = fecha;
    }

    public double getTotal() {
        return total;
    }

    public void setTotal(double total) {
        this.total = total;
    }

    public List<VentaItem> getItems() {
        return items;
    }

    public void setItems(List<VentaItem> items) {
        this.items = items;
    }

    public void agregarItem(VentaItem item) {
        this.items.add(item);
        recalcularTotal();
    }

    private void recalcularTotal() {
        this.total = 0;
        for (VentaItem item : this.items) {
            this.total += item.getPrecioUnitario();
        }
    }
}
