import java.util.ArrayList;
import java.util.List;

public class LibraryDemo {
    public static void main(String[] args) {
        Library lib = new Library(new PerDayFine(20));
        lib.addCopy(new BookCopy("C1", new Book("isbn-1", "Dune")));
        Member ada = new Member("M1", 2);
        Member lin = new Member("M2", 2);
        Loan adaLoan = lib.lend(ada, "Dune", 0);
        System.out.println("M1 borrows " + adaLoan.copy().id());
        try {
            lib.lend(lin, "Dune", 3);
        } catch (LibraryException e) {
            System.out.println("refused: " + e.getMessage());
        }
        System.out.println("fine " + lib.giveBack(adaLoan, 17));
        Loan linLoan = lib.lend(lin, "Dune", 17);
        System.out.println("M2 borrows " + linLoan.copy().id());
    }
}

record Book(String isbn, String title) { }
record BookCopy(String id, Book book) { }
record Member(String id, int maxLoans) { }
record Loan(BookCopy copy, Member member, int dueDay) { }

interface FinePolicy { long fineFor(int daysLate); }

record PerDayFine(long perDay) implements FinePolicy {
    public long fineFor(int daysLate) { return Math.max(0, daysLate) * perDay; }
}

class LibraryException extends RuntimeException {
    LibraryException(String message) { super(message); }
}

class Library {
    private static final int LOAN_DAYS = 14;
    private final List<BookCopy> copies = new ArrayList<>();
    private final List<Loan> loans = new ArrayList<>();      // open loans
    private final FinePolicy finePolicy;

    Library(FinePolicy finePolicy) { this.finePolicy = finePolicy; }

    void addCopy(BookCopy copy) { copies.add(copy); }

    Loan lend(Member member, String title, int today) {
        if (loans.stream().filter(l -> l.member().equals(member)).count()
                >= member.maxLoans()) {
            throw new LibraryException(member.id() + " is at the loan limit");
        }
        BookCopy copy = copies.stream()
                .filter(c -> c.book().title().equals(title) && !isOut(c))
                .findFirst()
                .orElseThrow(() -> new LibraryException("no free " + title));
        Loan loan = new Loan(copy, member, today + LOAN_DAYS);
        loans.add(loan);
        return loan;
    }

    long giveBack(Loan loan, int today) {
        loans.remove(loan);
        return finePolicy.fineFor(today - loan.dueDay());
    }

    private boolean isOut(BookCopy copy) {
        return loans.stream().anyMatch(l -> l.copy().equals(copy));
    }
}
