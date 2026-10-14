import java.util.Objects;
public class CheckoutMediatorDemo {
    public static void main(String[] args) {
        CheckoutForm form = new CheckoutForm(2_000);
        form.quantity().set(3);
        form.quantity().set(0);
        form.coupon().enter("SAVE10");
        form.quantity().set(2);
    }
}
interface FormMediator { void changed(Widget source); }
abstract class Widget {                       // colleagues know only this
    private FormMediator mediator;
    final void attach(FormMediator m) {
        mediator = Objects.requireNonNull(m, "mediator");
    }
    protected final void notifyChanged() { mediator.changed(this); }
}
final class QuantityField extends Widget {
    private int value;
    int value() { return value; }
    void set(int v) {
        if (v < 0) throw new IllegalArgumentException("quantity < 0");
        value = v;
        notifyChanged();
    }
}
final class CouponField extends Widget {
    private String code = "";
    String code() { return code; }
    void enter(String c) { code = Objects.requireNonNull(c); notifyChanged(); }
}
final class TotalLabel {
    void show(int cents) { System.out.println("  total: " + cents); }
}
final class OrderButton {
    void enable(boolean on) { System.out.println("  order button: " + on); }
}
final class CheckoutForm implements FormMediator {    // the mediator
    private final QuantityField quantity = new QuantityField();
    private final CouponField coupon = new CouponField();
    private final TotalLabel total = new TotalLabel();
    private final OrderButton button = new OrderButton();
    private final int unitPrice;
    CheckoutForm(int unitPrice) {
        if (unitPrice <= 0) throw new IllegalArgumentException("price");
        this.unitPrice = unitPrice;
        quantity.attach(this);
        coupon.attach(this);
    }
    QuantityField quantity() { return quantity; }
    CouponField coupon() { return coupon; }
    @Override public void changed(Widget source) {
        System.out.println((source == quantity ? "quantity" : "coupon")
            + " changed");
        int discount = "SAVE10".equals(coupon.code()) ? 1_000 : 0;
        total.show(Math.max(0, quantity.value() * unitPrice - discount));
        button.enable(quantity.value() > 0);          // one rule, one place
    }
}
