import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class LibraryDemo {
    public static void main(String[] args) {
        var library = new Library(new StudentPolicy());
        Book dune = library.addBook("978-0441013593", "Dune");
        var ada = new Member("m1", "Ada");
        Loan loan = library.lend(dune, ada, 14);
        System.out.println(loan.member().name() + " has " + loan.book().title()
                + " for " + loan.days() + " days");
        tryLend(library, dune, new Member("m2", "Lin"), 7);
        tryLend(library, library.addBook("978-0261102217", "The Hobbit"),
                ada, 30);
        System.out.println("Active loans: " + library.activeLoans().size());
    }
    static void tryLend(Library lib, Book b, Member m, int days) {
        try {
            lib.lend(b, m, days);
        } catch (IllegalStateException | IllegalArgumentException e) {
            System.out.println("Rejected: " + e.getMessage());
        }
    }
}
interface LoanPolicy {                          // <<interface>>
    int maxDays();
}
final class StudentPolicy implements LoanPolicy { // dashed line, hollow head
    public int maxDays() { return 14; }
}
record Book(String isbn, String title) {}       // - isbn, - title
record Member(String id, String name) {}
record Loan(Book book, Member member, int days) {} // Loan --> 1 Book, 1 Member
final class Library {
    private final LoanPolicy policy;                   // --> "1" LoanPolicy
    private final List<Book> books = new ArrayList<>(); // --> "0..*" Book
    private final List<Loan> loans = new ArrayList<>(); // --> "0..*" Loan
    Library(LoanPolicy policy) {
        this.policy = Objects.requireNonNull(policy, "policy");
    }
    Book addBook(String isbn, String title) {
        var book = new Book(isbn, title);
        books.add(book);
        return book;
    }
    Loan lend(Book book, Member member, int days) {
        if (!books.contains(book))
            throw new IllegalArgumentException("not our book");
        if (days < 1) throw new IllegalArgumentException("days must be >= 1");
        if (days > policy.maxDays()) throw new IllegalArgumentException(
                days + " days exceeds limit " + policy.maxDays());
        if (loans.stream().anyMatch(l -> l.book().equals(book)))
            throw new IllegalStateException(book.title() + " is on loan");
        var loan = new Loan(book, Objects.requireNonNull(member), days);
        loans.add(loan);
        return loan;
    }
    List<Loan> activeLoans() { return List.copyOf(loans); }
}
