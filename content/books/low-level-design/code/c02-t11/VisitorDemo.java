import java.util.List;

public class VisitorDemo {
    public static void main(String[] args) {
        List<Item> cart = List.of(new Book(20.0), new Food(10.0));
        for (Item item : cart) {
            String label = item.accept(new LabelVisitor());
            double tax = item.accept(new TaxVisitor());
            System.out.println(label + " tax " + tax);
        }
    }
}

// One method per element type: a new operation is a new visitor class.
interface ItemVisitor<R> {
    R visitBook(Book b);
    R visitFood(Food f);
}

interface Item {
    <R> R accept(ItemVisitor<R> visitor);
}

record Book(double price) implements Item {
    public <R> R accept(ItemVisitor<R> v) { return v.visitBook(this); }
}

record Food(double price) implements Item {
    public <R> R accept(ItemVisitor<R> v) { return v.visitFood(this); }
}

class TaxVisitor implements ItemVisitor<Double> {
    public Double visitBook(Book b) { return 0.0; }
    public Double visitFood(Food f) { return f.price() * 0.05; }
}

class LabelVisitor implements ItemVisitor<String> {
    public String visitBook(Book b) { return "book " + b.price(); }
    public String visitFood(Food f) { return "food " + f.price(); }
}
