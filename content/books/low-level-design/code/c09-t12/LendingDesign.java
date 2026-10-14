import java.util.*;

public class LendingDesign {
    public static void main(String[] args) {
        FinePolicy flat = daysLate -> daysLate * 5;
        FinePolicy grace = daysLate -> Math.max(0, daysLate - 2) * 5;
        for (FinePolicy policy : List.of(flat, grace)) {
            LendingService desk = new LendingService(policy, 14);
            desk.addCopy("C1");
            Loan loan = desk.borrow("C1", "ana", 0);
            System.out.println("ana has C1, due day " + loan.dueDay());
            tryRun(() -> desk.borrow("C1", "raj", 3));
            System.out.println("fine on day 17: " + desk.giveBack("C1", 17));
        }
        LendingService desk = new LendingService(flat, 14);
        tryRun(() -> desk.borrow("C9", "raj", 1));
        tryRun(() -> desk.giveBack("C1", 1));
    }

    static void tryRun(Runnable action) {
        try { action.run(); }
        catch (LendingException e) {
            System.out.println(e.code() + ": " + e.getMessage());
        }
    }
}

enum CopyState { AVAILABLE, ON_LOAN }
record Loan(String copyId, String memberId, int dueDay) {}
interface FinePolicy { int fine(int daysLate); }

class LendingException extends RuntimeException {
    private final String code;
    LendingException(String code, String msg) { super(msg); this.code = code; }
    String code() { return code; }
}

class LendingService {
    private final Map<String, CopyState> states = new HashMap<>();
    private final Map<String, Loan> loans = new HashMap<>();
    private final FinePolicy fines;
    private final int loanDays;

    LendingService(FinePolicy fines, int loanDays) {
        if (loanDays <= 0) throw new IllegalArgumentException("loanDays <= 0");
        this.fines = Objects.requireNonNull(fines, "fines");
        this.loanDays = loanDays;
    }

    void addCopy(String copyId) { states.put(copyId, CopyState.AVAILABLE); }

    Loan borrow(String copyId, String memberId, int today) {
        Objects.requireNonNull(memberId, "memberId");
        CopyState state = states.get(copyId);
        if (state == null)
            throw new LendingException("UNKNOWN_COPY", copyId + " unknown");
        if (state != CopyState.AVAILABLE)
            throw new LendingException("NOT_AVAILABLE", copyId + " " + state);
        Loan loan = new Loan(copyId, memberId, today + loanDays);
        states.put(copyId, CopyState.ON_LOAN);
        loans.put(copyId, loan);
        return loan;
    }

    int giveBack(String copyId, int today) {
        Loan loan = loans.remove(copyId);
        if (loan == null)
            throw new LendingException("NOT_ON_LOAN", copyId + " is not lent");
        states.put(copyId, CopyState.AVAILABLE);
        return fines.fine(Math.max(0, today - loan.dueDay()));
    }
}
