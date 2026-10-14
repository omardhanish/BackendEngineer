import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public class SolidRegistration {
    public static void main(String[] args) {
        List<String> saved = new ArrayList<>();          // a test double
        var signup = new Registration(new MinLength(8), saved::add, Map.of(
                "email", new EmailWelcome(),
                "sms", new SmsWelcome()));         // added, nothing edited
        System.out.println(signup.register("ada@x.test", "pw", "email"));
        System.out.println(signup.register("bob@x.test", "longsecret", "sms"));
        System.out.println("saved " + saved);
    }
}

// S: the password rule has its own small type.
interface PasswordPolicy { boolean accepts(String password); }
record MinLength(int min) implements PasswordPolicy {
    public boolean accepts(String password) { return password.length() >= min; }
}

// I: registration needs one method from storage, nothing more.
interface UserWriter { void add(String email); }

// O + L: each channel is a class; every one returns text and never throws.
interface Welcome { String send(String email); }
final class EmailWelcome implements Welcome {
    public String send(String email) { return "emailed " + email; }
}
final class SmsWelcome implements Welcome {
    public String send(String email) { return "texted " + email; }
}

// D: every part arrives through the constructor.
final class Registration {
    private final PasswordPolicy policy;
    private final UserWriter users;
    private final Map<String, Welcome> welcomes;
    Registration(PasswordPolicy policy, UserWriter users,
                 Map<String, Welcome> welcomes) {
        this.policy = Objects.requireNonNull(policy, "policy");
        this.users = Objects.requireNonNull(users, "users");
        this.welcomes = Map.copyOf(welcomes);
    }
    String register(String email, String password, String channel) {
        if (!policy.accepts(password)) return "weak password";
        Welcome welcome = welcomes.get(channel);
        if (welcome == null) throw new IllegalArgumentException(channel);
        users.add(email);
        return welcome.send(email);
    }
}
