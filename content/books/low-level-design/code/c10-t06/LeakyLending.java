import java.util.LinkedHashMap;
import java.util.Map;

public class LeakyLending {
    public static void main(String[] args) {
        Map<String, Integer> loans = new LinkedHashMap<>();
        Map<String, String> holders = new LinkedHashMap<>();
        var kiosk = new KioskDesk(loans, holders);
        var web = new WebDesk(loans, holders);
        kiosk.lend("ann", "C1");
        web.lend("bob", "C1");   // C1 is already out
        web.lend("ann", "C2");
        web.lend("ann", "C3");   // limit is 2 loans
        System.out.println("loans   " + loans);
        System.out.println("holders " + holders);
    }
}
// Each caller edits raw maps and re-implements the rules itself.
final class KioskDesk {
    private final Map<String, Integer> loans;
    private final Map<String, String> holders;
    KioskDesk(Map<String, Integer> loans, Map<String, String> holders) {
        this.loans = loans;
        this.holders = holders;
    }
    void lend(String member, String copy) {
        if (holders.containsKey(copy)) throw new IllegalStateException("out");
        if (loans.getOrDefault(member, 0) >= 2)
            throw new IllegalStateException("limit");
        holders.put(copy, member);
        loans.merge(member, 1, Integer::sum);
    }
}
// Added later by another team: the copy-paste lost both checks.
final class WebDesk {
    private final Map<String, Integer> loans;
    private final Map<String, String> holders;
    WebDesk(Map<String, Integer> loans, Map<String, String> holders) {
        this.loans = loans;
        this.holders = holders;
    }
    void lend(String member, String copy) {
        holders.put(copy, member);
        loans.merge(member, 1, Integer::sum);
    }
}
