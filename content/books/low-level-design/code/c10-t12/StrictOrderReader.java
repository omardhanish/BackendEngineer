import java.util.LinkedHashMap;
import java.util.Map;

public class StrictOrderReader {
    public static void main(String[] args) {
        String[] messages = {
            "sku=PEN-1;qty=3",
            "sku=PEN-1;qty=3;giftWrap=true",
            "sku=PEN-1;quantity=3"
        };
        for (String message : messages) {
            try {
                System.out.println("read " + OrderV1.parse(message));
            } catch (IllegalArgumentException e) {
                System.out.println("REJECTED " + e.getMessage());
            }
        }
    }
}

// A consumer shipped with v1. It accepts only the fields it knew then.
record OrderV1(String sku, int qty) {
    static OrderV1 parse(String message) {
        Map<String, String> fields = Wire.fields(message);
        for (String key : fields.keySet()) {
            if (!key.equals("sku") && !key.equals("qty")) {
                throw new IllegalArgumentException("unknown field " + key);
            }
        }
        String qty = fields.get("qty");
        if (qty == null) {
            throw new IllegalArgumentException("missing field qty");
        }
        return new OrderV1(fields.get("sku"), Integer.parseInt(qty));
    }
}

// Splits "a=1;b=2" into an ordered map.
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
