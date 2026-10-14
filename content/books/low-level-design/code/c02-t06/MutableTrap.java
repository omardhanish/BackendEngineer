import java.util.ArrayList;
import java.util.List;

public class MutableTrap {
    public static void main(String[] args) {
        Money base = new Money(500, "GBP");
        Item tea = new Item("Tea", base);
        Item coffee = new Item("Coffee", base);
        coffee.price.cents = 650; // meant: only coffee gets dearer
        System.out.println(tea.name + " costs " + tea.price.cents);

        List<String> tags = new ArrayList<>(List.of("hot"));
        Item soup = new Item("Soup", new Money(400, "GBP"));
        soup.tags = tags;
        tags.add("vegan?"); // the caller still holds the same list
        System.out.println(soup.name + " tags " + soup.tags);

        tea.status = "SHIPED"; // a typo, and it compiles
        System.out.println(tea.name + " status " + tea.status);
    }
}

// Non-private mutable fields: any code in the package can change them.
class Money {
    long cents;
    String currency;
    Money(long cents, String currency) {
        this.cents = cents;
        this.currency = currency;
    }
}

class Item {
    String name;
    Money price;
    List<String> tags = new ArrayList<>();
    String status = "NEW";
    Item(String name, Money price) {
        this.name = name;
        this.price = price;
    }
}
