import java.util.Map;

public class NullReturnDemo {
    public static void main(String[] args) {
        CustomerDirectory directory = new CustomerDirectory(
            Map.of("c1", "ana@example.com"));
        for (String id : new String[] {"c1", "c2"}) {
            try {
                System.out.println(id + " -> " + directory.emailDomain(id));
            } catch (NullPointerException e) {
                // Demo only: print the crash instead of a stack trace.
                System.out.println(id + " -> NullPointerException");
            }
        }
    }
}

class CustomerDirectory {
    private final Map<String, String> emailsById;

    CustomerDirectory(Map<String, String> emailsById) {
        this.emailsById = Map.copyOf(emailsById);
    }

    // Returns null for an unknown id; the signature hides that.
    String findEmail(String id) {
        return emailsById.get(id);
    }

    String emailDomain(String id) {
        String email = findEmail(id);
        return email.substring(email.indexOf('@') + 1);
    }
}
