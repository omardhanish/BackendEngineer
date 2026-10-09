import java.util.LinkedHashMap;
import java.util.Map;

public class VersionRouterDemo {
    public static void main(String[] args) {
        RoomApi api = new RoomApi();
        for (String version : new String[] {"v1", "v2", "v9"}) {
            System.out.println(version + " " + api.get(version, "R1"));
        }
    }
}

record Room(String id, String name, int seats, boolean hasScreen) {}

class RoomApi {
    private Room load(String id) {                // one current model
        return new Room(id, "Orion", 8, true);
    }

    Map<String, Object> get(String version, String id) {
        Room room = load(id);
        Map<String, Object> body = new LinkedHashMap<>();
        switch (version) {
            case "v1" -> {                        // frozen: old clients
                body.put("id", room.id());
                body.put("capacity", room.seats());
            }
            case "v2" -> {                        // renamed field: breaking
                body.put("id", room.id());
                body.put("name", room.name());
                body.put("seats", room.seats());
                body.put("hasScreen", room.hasScreen());
            }
            default -> body.put("error", "UNSUPPORTED_VERSION");
        }
        return body;
    }
}
