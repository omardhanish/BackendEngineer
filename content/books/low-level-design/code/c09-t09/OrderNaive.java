import java.util.ArrayList;
import java.util.List;

public class OrderNaive {
    public static void main(String[] args) {
        MenuItem pizza = new MenuItem("Margherita", 900);
        MenuItem sushi = new MenuItem("Salmon roll", 700);

        Order order = new Order();
        order.items.add(pizza);    // from Pizza Place
        order.items.add(sushi);    // from Sushi Bar: two kitchens, one rider
        order.items.add(pizza);    // quantity means adding the same object
        System.out.println("total at checkout: " + order.total());

        pizza.price = 1200;        // restaurant raises the price an hour later
        System.out.println("total on receipt:  " + order.total());
    }
}

class MenuItem {
    String name;
    long price;   // mutable and unguarded, shared by every order
    MenuItem(String name, long price) { this.name = name; this.price = price; }
}

class Order {
    List<MenuItem> items = new ArrayList<>(); // live references, no restaurant
    long total() {
        long sum = 0;
        for (MenuItem i : items) sum += i.price;
        return sum;
    }
}
