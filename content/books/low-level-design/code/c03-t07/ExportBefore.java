import java.util.List;

public class ExportBefore {
    public static void main(String[] args) {
        var job = new OrderExportJob();
        for (String format : List.of("csv", "json", "xml")) {
            try {
                job.run(format);
            } catch (IllegalArgumentException e) {
                System.out.println("failed: " + e.getMessage());
            }
        }
    }
}

// Loads, formats and uploads: three reasons to change in one class.
final class OrderExportJob {
    // Data access hard-wired in: tests cannot swap it.
    private final List<String[]> rows = List.of(
            new String[] {"A1", "250"}, new String[] {"A2", "990"});

    void run(String format) {
        StringBuilder out = new StringBuilder();
        // Every new format means editing this method.
        if (format.equals("csv")) {
            out.append("id,cents");
            for (String[] r : rows) out.append(";").append(r[0])
                    .append(",").append(r[1]);
        } else if (format.equals("json")) {
            out.append("[");
            for (String[] r : rows) out.append("{\"id\":\"").append(r[0])
                    .append("\"},");
            out.append("]");
        } else {
            throw new IllegalArgumentException("unknown format " + format);
        }
        new FtpUploader().upload("orders." + format, out.toString());
    }
}

final class FtpUploader {
    void upload(String name, String body) {
        System.out.println("[ftp] " + name + " = " + body);
    }
}
