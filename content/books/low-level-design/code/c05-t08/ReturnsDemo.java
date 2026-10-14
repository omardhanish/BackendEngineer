import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

public class ReturnsDemo {
    public static void main(String[] args) {
        var clock = Clock.fixed(Instant.parse("2026-03-10T12:00:00Z"),
                ZoneOffset.UTC);
        var loans = new InMemoryLoans();
        loans.save(new Loan("C1", "m-ada", LocalDate.of(2026, 3, 12)));
        loans.save(new Loan("C2", "m-ada", LocalDate.of(2026, 3, 3)));
        loans.save(new Loan("C3", "m-alan", LocalDate.of(2026, 1, 5)));
        var returns = new ReturnService(loans, new DailyFine(25, 500), clock);
        System.out.println(returns.giveBack("C1"));
        System.out.println(returns.giveBack("C2"));
        System.out.println(returns.giveBack("C3"));
        try {
            returns.giveBack("C2");
        } catch (LibraryException e) {
            System.out.println(e.code() + " -> " + e.getMessage());
        }
        // Fine amnesty: inject another policy; ReturnService is unchanged.
        loans.save(new Loan("C4", "m-ada", LocalDate.of(2026, 3, 1)));
        var amnesty = new ReturnService(loans, daysLate -> 0, clock);
        System.out.println(amnesty.giveBack("C4"));
    }
}

record Loan(String copyId, String memberId, LocalDate due) { }
record Receipt(String copyId, long daysLate, long fineCents) { }

interface FinePolicy { long fineCents(long daysLate); }

record DailyFine(long centsPerDay, long capCents) implements FinePolicy {
    DailyFine {
        if (centsPerDay < 0 || capCents < 0)
            throw new IllegalArgumentException("fines cannot be negative");
    }
    public long fineCents(long daysLate) {
        return Math.min(daysLate * centsPerDay, capCents);
    }
}

abstract class LibraryException extends RuntimeException {
    LibraryException(String message) { super(message); }
    abstract String code();
}
final class NotOnLoanException extends LibraryException {
    NotOnLoanException(String id) { super(id + " is not on loan"); }
    String code() { return "NOT_ON_LOAN"; }
}

// The return side of the same store: only the methods it needs.
interface LoanRepository {
    void save(Loan loan);
    Optional<Loan> remove(String copyId);
}
final class InMemoryLoans implements LoanRepository {
    private final Map<String, Loan> byCopy = new LinkedHashMap<>();
    public void save(Loan loan) { byCopy.put(loan.copyId(), loan); }
    public Optional<Loan> remove(String copyId) {
        return Optional.ofNullable(byCopy.remove(copyId));
    }
}

final class ReturnService {
    private final LoanRepository loans;
    private final FinePolicy fines;
    private final Clock clock;

    ReturnService(LoanRepository loans, FinePolicy fines, Clock clock) {
        this.loans = Objects.requireNonNull(loans, "loans");
        this.fines = Objects.requireNonNull(fines, "fines");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    Receipt giveBack(String copyId) {
        Loan loan = loans.remove(copyId)
                .orElseThrow(() -> new NotOnLoanException(copyId));
        LocalDate today = LocalDate.now(clock);
        long late = Math.max(0, ChronoUnit.DAYS.between(loan.due(), today));
        return new Receipt(copyId, late, fines.fineCents(late));
    }
}
