import java.util.Objects;

public class ExprVisitorDemo {
    public static void main(String[] args) {
        Expr e = new Mul(new Add(new Num(1), new Num(2)), new Num(4));
        System.out.println(e.accept(new PrintVisitor()));
        System.out.println(e.accept(new EvalVisitor()));
    }
}

interface Visitor<R> {
    R visitNum(Num n);
    R visitAdd(Add a);
    R visitMul(Mul m);
}

sealed interface Expr permits Num, Add, Mul {
    <R> R accept(Visitor<R> v);
}
record Num(int value) implements Expr {
    public <R> R accept(Visitor<R> v) { return v.visitNum(this); }
}
record Add(Expr left, Expr right) implements Expr {
    Add { Objects.requireNonNull(left); Objects.requireNonNull(right); }
    public <R> R accept(Visitor<R> v) { return v.visitAdd(this); }
}
record Mul(Expr left, Expr right) implements Expr {
    Mul { Objects.requireNonNull(left); Objects.requireNonNull(right); }
    public <R> R accept(Visitor<R> v) { return v.visitMul(this); }
}

final class EvalVisitor implements Visitor<Integer> {
    public Integer visitNum(Num n) { return n.value(); }
    public Integer visitAdd(Add a) {
        return Math.addExact(a.left().accept(this), a.right().accept(this));
    }
    public Integer visitMul(Mul m) {
        return Math.multiplyExact(
            m.left().accept(this), m.right().accept(this));
    }
}

final class PrintVisitor implements Visitor<String> {
    public String visitNum(Num n) { return String.valueOf(n.value()); }
    public String visitAdd(Add a) {
        return "(" + a.left().accept(this) + " + "
            + a.right().accept(this) + ")";
    }
    public String visitMul(Mul m) {
        return m.left().accept(this) + " * " + m.right().accept(this);
    }
}

