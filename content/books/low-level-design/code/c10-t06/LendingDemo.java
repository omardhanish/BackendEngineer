import java.util.*;
import java.util.function.Function;

public class LendingDemo {
    static final Repository<Member> members = new InMemoryRepo<>(Member::id);
    static final Repository<Copy> copies = new InMemoryRepo<>(Copy::id);
    static final LendingService rules = new LendingService();
    public static void main(String[] args) {
        members.save(new Member("ann", 0));
        members.save(new Member("bob", 0));
        for (String id : List.of("C1", "C2", "C3"))
            copies.save(new Copy(id, null));
        lend("ann", "C1"); lend("bob", "C1");
        lend("ann", "C2"); lend("ann", "C3"); lend("zoe", "C3");
    }
    // Application service: load, ask the domain, save. No rules here.
    static void lend(String memberId, String copyId) {
        try {
            Member m = members.findById(memberId).orElseThrow(
                () -> new IllegalArgumentException("unknown member"));
            Copy c = copies.findById(copyId).orElseThrow(
                () -> new IllegalArgumentException("unknown copy"));
            Loan loan = rules.lend(m, c);
            members.save(loan.member());
            copies.save(loan.copy());
            System.out.println(memberId + " borrowed " + copyId);
        } catch (IllegalArgumentException | IllegalStateException e) {
            System.out.println(memberId + " " + copyId + ": " + e.getMessage());
        }
    }
}
// Repository: a collection-like port in domain words; one per aggregate.
interface Repository<T> {
    Optional<T> findById(String id);
    void save(T aggregate);
}
// In-memory adapter for tests; a JDBC adapter would implement the same port.
final class InMemoryRepo<T> implements Repository<T> {
    private final Map<String, T> rows = new LinkedHashMap<>();
    private final Function<T, String> idOf;
    InMemoryRepo(Function<T, String> idOf) { this.idOf = idOf; }
    public Optional<T> findById(String id) {
        return Optional.ofNullable(rows.get(id));
    }
    public void save(T item) { rows.put(idOf.apply(item), item); }
}
// Domain service: one operation across two aggregates; stateless.
final class LendingService {
    Loan lend(Member member, Copy copy) {
        return new Loan(member.borrowOne(), copy.lendTo(member.id()));
    }
}
record Loan(Member member, Copy copy) {}
record Member(String id, int onLoan) {
    Member borrowOne() {
        if (onLoan >= 2) throw new IllegalStateException("at loan limit");
        return new Member(id, onLoan + 1);
    }
}
record Copy(String id, String holder) {
    Copy lendTo(String memberId) {
        if (holder != null) throw new IllegalStateException("already out");
        return new Copy(id, Objects.requireNonNull(memberId));
    }
}
