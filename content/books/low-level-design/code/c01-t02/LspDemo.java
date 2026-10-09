import java.util.Map;
import java.util.TreeMap;

public class LspDemo {
    public static void main(String[] args) {
        System.out.println(rename(new MapSettings()));
        System.out.println(rename(new FrozenSettings()));
    }

    static String rename(Settings s) {    // trusts the Settings contract
        try {
            s.put("name", "shop");
            return "saved " + s.get("name");
        } catch (UnsupportedOperationException e) {
            return "broke: " + e.getMessage();
        }
    }
}

interface Settings {                      // too wide for some classes
    String get(String key);
    void put(String key, String value);
}

class MapSettings implements Settings {
    private final Map<String, String> data = new TreeMap<>();

    public String get(String key) { return data.get(key); }
    public void put(String key, String value) { data.put(key, value); }
}

class FrozenSettings implements Settings { // breaks LSP: refuses put
    public String get(String key) { return "default"; }

    public void put(String key, String value) {
        throw new UnsupportedOperationException("frozen");
    }
}
