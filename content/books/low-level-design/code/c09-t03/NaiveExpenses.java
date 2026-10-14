import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class NaiveExpenses {
    public static void main(String[] args) {
        NaiveGroup trip = new NaiveGroup();
        trip.members.add("Asha");
        trip.members.add("Ben");
        trip.members.add("Chen");

        NaiveExpense dinner = new NaiveExpense();
        dinner.paidBy = "Asha";
        dinner.amount = 100.0;
        dinner.shares.put("Asha", 33.33);
        dinner.shares.put("Ben", 33.33);
        dinner.shares.put("Zed", 33.33);   // not in the group
        trip.expenses.add(dinner);

        double total = 0;
        for (double s : dinner.shares.values()) total += s;
        System.out.println("amount " + dinner.amount + ", shares " + total);
        System.out.println("Chen owes nothing, Zed owes "
                + dinner.shares.get("Zed"));

        dinner.amount = 250.0;             // edited after it was recorded
        System.out.println("amount now " + dinner.amount);
    }
}

class NaiveGroup {                          // open, mutable, unchecked
    List<String> members = new ArrayList<>();
    List<NaiveExpense> expenses = new ArrayList<>();
}

class NaiveExpense {
    String paidBy;
    double amount;                          // money as a double
    Map<String, Double> shares = new LinkedHashMap<>();
}
