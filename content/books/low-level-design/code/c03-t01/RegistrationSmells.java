import java.util.ArrayList;
import java.util.List;

public class RegistrationSmells {
    public static void main(String[] args) {
        var signup = new Registration();
        System.out.println(signup.register("ada@x.test", "pw", "email"));
        System.out.println(signup.register("bob@x.test", "longsecret", "sms"));
        UserStore archive = new ArchivedUsers();
        try {
            archive.save("eve@x.test");
        } catch (UnsupportedOperationException e) {
            System.out.println("L: " + e.getMessage());
        }
    }
}

// S: password rule, storage and welcome messages in one class.
class Registration {
    private final MemoryUsers users = new MemoryUsers();  // D: builds its own
    String register(String email, String password, String channel) {
        if (password.length() < 8) return "weak password";
        users.save(email);
        return switch (channel) {        // O: each channel is a new branch
            case "email" -> "emailed " + email;
            case "sms" -> "texted " + email;
            default -> throw new IllegalArgumentException(channel);
        };
    }
}

// I: one wide interface; a sign-up needs save, an admin page needs all.
interface UserStore {
    void save(String email);
    void delete(String email);
    List<String> all();
}

class MemoryUsers implements UserStore {
    private final List<String> emails = new ArrayList<>();
    public void save(String email) { emails.add(email); }
    public void delete(String email) { emails.remove(email); }
    public List<String> all() { return List.copyOf(emails); }
}

// L: a subtype that refuses a method its parent promises.
class ArchivedUsers extends MemoryUsers {
    @Override public void save(String email) {
        throw new UnsupportedOperationException("archive is read-only");
    }
}
