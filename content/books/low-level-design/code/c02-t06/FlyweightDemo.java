import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class FlyweightDemo {
    public static void main(String[] args) {
        StyleCache styles = new StyleCache();
        List<Marker> markers = List.of(
            new Marker(1, 2, styles.get("cafe", "brown")),
            new Marker(5, 8, styles.get("cafe", "brown")),
            new Marker(3, 3, styles.get("park", "green")),
            new Marker(9, 4, styles.get("cafe", "brown")));
        for (Marker m : markers) m.draw();
        System.out.println("markers: " + markers.size());
        System.out.println("styles: " + styles.size());
        Style a = markers.get(0).style(), b = markers.get(1).style();
        System.out.println("same object: " + (a == b));
    }
}

// Shared, immutable part. Imagine a large icon bitmap in here too.
record Style(String icon, String colour) { }

// Per-marker part: only the position differs.
record Marker(int x, int y, Style style) {
    void draw() {
        System.out.println(style.icon() + " at " + x + "," + y);
    }
}

class StyleCache {
    private final Map<String, Style> pool = new HashMap<>();

    Style get(String icon, String colour) {
        return pool.computeIfAbsent(icon + "/" + colour,
            key -> new Style(icon, colour));
    }

    int size() { return pool.size(); }
}
