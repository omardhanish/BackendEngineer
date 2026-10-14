import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

public class TolerantOrderReader {
    public static void main(String[] args) {
        String[] messages = {
            "sku=PEN-1;qty=3",
            "sku=PEN-1;qty=3;giftWrap=true",
            "v=2;sku=PEN-1;quantity=3;channel=app",
            "v=9;sku=PEN-1;quantity=3"
        };
        for (String message : messages) {
            try {
                System.out.println("read " + OrderReader.parse(message));
            } catch (IllegalArgumentException e) {
                System.out.println("REJECTED " + e.getMessage());
            }
        }
    }
}

// The current model. Fields added later get safe defaults.
record Order(String sku, int quantity, boolean giftWrap) {
    Order {
        Objects.requireNonNull(sku, "sku");
        if (quantity <= 0) {
            throw new IllegalArgumentException("quantity must be > 0");
        }
    }
}

final class OrderReader {
    private static final int NEWEST = 2;

    static Order parse(String message) {
        Map<String, String> f = Wire.fields(message);
        int version = Integer.parseInt(f.getOrDefault("v", "1"));
        if (version > NEWEST) {
            throw new IllegalArgumentException(
                "schema v" + version + " is newer than v" + NEWEST);
        }
        // Upcast: v1 named the field "qty".
        String qty = version < 2 ? f.get("qty") : f.get("quantity");
        String sku = f.get("sku");
        if (qty == null || sku == null) {
            throw new IllegalArgumentException("missing sku or quantity");
        }
        boolean wrap =
            Boolean.parseBoolean(f.getOrDefault("giftWrap", "false"));
        // Unknown keys such as "channel" are ignored, not rejected.
        return new Order(sku, Integer.parseInt(qty), wrap);
    }
}

class Wire {
    static Map<String, String> fields(String message) {
        Map<String, String> out = new LinkedHashMap<>();
        for (String pair : message.split(";")) {
            String[] kv = pair.split("=", 2);
            out.put(kv[0], kv[1]);
        }
        return out;
    }
}
