import java.util.List;

public class OverloadTrap {
    public static void main(String[] args) {
        List<Expr> exprs =
            List.of(new Num(4), new Add(new Num(1), new Num(2)));
        Printer printer = new Printer();
        for (Expr e : exprs) System.out.println(printer.print(e));
        // The workaround: an instanceof chain that grows per node type
        for (Expr e : exprs) System.out.println(eval(e));
    }

    static int eval(Expr e) {
        if (e instanceof Num n) return n.value();
        if (e instanceof Add a) return eval(a.left()) + eval(a.right());
        throw new IllegalArgumentException("unknown node type");
    }
}

interface Expr {}
record Num(int value) implements Expr {}
record Add(Expr left, Expr right) implements Expr {}

final class Printer {
    // Java picks an overload at COMPILE time, from the declared type
    String print(Expr e) { return "?"; }
    String print(Num n) { return String.valueOf(n.value()); }
    String print(Add a) {
        return print(a.left()) + " + " + print(a.right());
    }
}
