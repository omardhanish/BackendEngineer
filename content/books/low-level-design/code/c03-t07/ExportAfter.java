import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

public class ExportAfter {
    public static void main(String[] args) {
        OrderSource source = () -> List.of(
                new Order("A1", 250), new Order("A2", 990));
        Destination ftp = (name, body) ->
                System.out.println("[ftp] " + name + " = " + body);
        for (ExportFormat f : List.of(new CsvFormat(), new JsonFormat()))
            new ExportJob(source, f, ftp).run();
    }
}

record Order(String id, long cents) {
    Order {
        Objects.requireNonNull(id, "id");
        if (cents < 0) throw new IllegalArgumentException("cents < 0");
    }
}
// DIP + ISP: small ports the job owns; adapters plug in from outside.
interface OrderSource { List<Order> load(); }
interface Destination { void put(String name, String body); }
// OCP + LSP: a new format is a new class that honours this contract.
interface ExportFormat {
    String extension();
    String render(List<Order> orders); // never throws for valid orders
}

final class CsvFormat implements ExportFormat {
    public String extension() { return "csv"; }
    // rows joined with ';' only to keep demo output on one line
    public String render(List<Order> orders) {
        return "id,cents;" + orders.stream()
                .map(o -> o.id() + "," + o.cents())
                .collect(Collectors.joining(";"));
    }
}
final class JsonFormat implements ExportFormat {
    public String extension() { return "json"; }
    public String render(List<Order> orders) {
        return orders.stream()
                .map(o -> "{\"id\":\"" + o.id() + "\",\"cents\":"
                        + o.cents() + "}")
                .collect(Collectors.joining(",", "[", "]"));
    }
}
// SRP: the job only sequences load, render, put.
record ExportJob(OrderSource source, ExportFormat format, Destination to) {
    ExportJob {
        Objects.requireNonNull(source, "source");
        Objects.requireNonNull(format, "format");
        Objects.requireNonNull(to, "to");
    }
    void run() {
        String body = format.render(source.load());
        to.put("orders." + format.extension(), body);
    }
}
