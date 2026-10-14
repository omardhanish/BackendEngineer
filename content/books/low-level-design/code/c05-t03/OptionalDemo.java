import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

public class OptionalDemo {
    public static void main(String[] args) {
        CustomerRepository repo = new CustomerRepository(Map.of(
            "c1", new Customer("c1", "ana@example.com"),
            "c3", new Customer("c3", "not-an-email")));
        EmailService emails = new EmailService(repo);
        for (String id : List.of("c1", "c2", "c3")) {
            System.out.println(id + " -> " + emails.domainOrDefault(id));
        }
        try {
            emails.requireDomain("c2");
        } catch (IllegalStateException e) {
            System.out.println("strict: " + e.getMessage());
        }
    }
}

record Customer(String id, String email) {
    Customer {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(email, "email");
    }
}

class CustomerRepository {
    private final Map<String, Customer> byId;

    CustomerRepository(Map<String, Customer> byId) {
        this.byId = Map.copyOf(byId);
    }

    // The return type says "may be absent", so callers cannot forget.
    Optional<Customer> findById(String id) {
        return Optional.ofNullable(byId.get(id));
    }
}

class EmailService {
    private final CustomerRepository repo;

    EmailService(CustomerRepository repo) {
        this.repo = Objects.requireNonNull(repo, "repo");
    }

    private Optional<String> domain(String id) {
        return repo.findById(id)
            .map(Customer::email)
            .filter(email -> email.contains("@"))
            .map(email -> email.substring(email.indexOf('@') + 1));
    }

    String domainOrDefault(String id) {
        return domain(id).orElse("no-domain");
    }

    String requireDomain(String id) {
        return domain(id).orElseThrow(
            () -> new IllegalStateException("no domain for " + id));
    }
}
