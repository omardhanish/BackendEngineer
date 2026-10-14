import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

public class LendingDemo {
    public static void main(String[] args) {
        // Composition root: pick implementations once and inject them.
        var copies = new InMemoryCopies(List.of(new BookCopy("C1", "Dune"),
                new BookCopy("C2", "Dune"), new BookCopy("C3", "Emma")));
        LoanPolicy policy = member -> member.staff() ? 5 : 2;
        var lending = new LendingService(copies, new InMemoryLoans(), policy);
        var ada = new Member("m-ada", false);
        lending.borrow(ada, "C1");
        lending.borrow(ada, "C3");
        attempt(() -> lending.borrow(new Member("m-alan", true), "C1"));
        attempt(() -> lending.borrow(ada, "C2"));
        attempt(() -> lending.borrow(ada, "C9"));
        System.out.println("On loan: " + lending.onLoan());
    }
    static void attempt(Runnable action) {
        try {
            action.run();
        } catch (LibraryException e) {
            System.out.println(e.code() + " -> " + e.getMessage());
        }
    }
}

record BookCopy(String id, String title) { }
record Member(String id, boolean staff) { }
record Loan(String copyId, String memberId) { }

interface CopyRepository { Optional<BookCopy> findById(String copyId); }
interface LoanRepository {
    Optional<Loan> forCopy(String copyId);
    long countFor(String memberId);
    void save(Loan loan);
    List<Loan> all();
}
interface LoanPolicy { int maxLoans(Member member); }

// One base type; each failure has a stable code clients can switch on.
abstract class LibraryException extends RuntimeException {
    LibraryException(String message) { super(message); }
    abstract String code();
}
final class CopyNotFoundException extends LibraryException {
    CopyNotFoundException(String id) { super("no copy " + id); }
    String code() { return "COPY_NOT_FOUND"; }
}
final class CopyOnLoanException extends LibraryException {
    CopyOnLoanException(String id) { super(id + " is already on loan"); }
    String code() { return "COPY_ON_LOAN"; }
}
final class LoanLimitException extends LibraryException {
    LoanLimitException(String who, int max) {
        super(who + " is at the limit of " + max + " loans");
    }
    String code() { return "LOAN_LIMIT"; }
}

final class LendingService {
    private final CopyRepository copies;
    private final LoanRepository loans;
    private final LoanPolicy policy;

    LendingService(CopyRepository copies, LoanRepository loans,
                   LoanPolicy policy) {
        this.copies = Objects.requireNonNull(copies, "copies");
        this.loans = Objects.requireNonNull(loans, "loans");
        this.policy = Objects.requireNonNull(policy, "policy");
    }

    Loan borrow(Member member, String copyId) {
        BookCopy copy = copies.findById(copyId)
                .orElseThrow(() -> new CopyNotFoundException(copyId));
        if (loans.forCopy(copy.id()).isPresent())
            throw new CopyOnLoanException(copy.id());
        int max = policy.maxLoans(member);
        if (loans.countFor(member.id()) >= max)
            throw new LoanLimitException(member.id(), max);
        Loan loan = new Loan(copy.id(), member.id());
        loans.save(loan);
        return loan;
    }

    List<String> onLoan() {
        return loans.all().stream()
                .map(l -> l.copyId() + "=" + l.memberId()).toList();
    }
}

final class InMemoryCopies implements CopyRepository {
    private final Map<String, BookCopy> byId = new LinkedHashMap<>();
    InMemoryCopies(List<BookCopy> stock) {
        stock.forEach(c -> byId.put(c.id(), c));
    }
    public Optional<BookCopy> findById(String id) {
        return Optional.ofNullable(byId.get(id));
    }
}

// Not thread-safe: a real store needs a unique constraint per copy.
final class InMemoryLoans implements LoanRepository {
    private final Map<String, Loan> byCopy = new LinkedHashMap<>();
    public Optional<Loan> forCopy(String id) {
        return Optional.ofNullable(byCopy.get(id));
    }
    public long countFor(String memberId) {
        return byCopy.values().stream()
                .filter(l -> l.memberId().equals(memberId)).count();
    }
    public void save(Loan loan) { byCopy.put(loan.copyId(), loan); }
    public List<Loan> all() { return List.copyOf(byCopy.values()); }
}
