import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class GuardDemo {
    public static void main(String[] args) {
        List<String> tags = new ArrayList<>(List.of("vip"));
        Profile ana = new Profile("ana", tags);
        tags.add("banned");                     // caller edits its own list
        System.out.println("tags " + ana.tags());

        try {
            ana.tags().add("admin");
        } catch (UnsupportedOperationException e) {
            System.out.println("tags are read-only");
        }

        for (String name : new String[] {" ", null}) {
            try {
                new Profile(name, List.of());
            } catch (IllegalArgumentException | NullPointerException e) {
                System.out.println("rejected: " + e.getMessage());
            }
        }
    }
}

final class Profile {
    private final String name;
    private final List<String> tags;

    Profile(String name, List<String> tags) {
        Objects.requireNonNull(name, "name is required");   // fail fast
        if (name.isBlank()) throw new IllegalArgumentException("blank name");
        this.name = name;
        this.tags = List.copyOf(tags);          // defensive copy in
    }

    String name() { return name; }

    List<String> tags() { return tags; }        // unmodifiable copy out
}
