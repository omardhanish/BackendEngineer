public class TangledForm {
    public static void main(String[] args) {
        TotalLabel total = new TotalLabel();
        OrderButton button = new OrderButton();
        QuantityField qty = new QuantityField(total, button);
        CouponField coupon = new CouponField(total, button, qty);
        qty.wire(coupon);                  // the two fields point at each other
        qty.set(3);
        qty.set(0);
        coupon.enter("SAVE10");
    }
}
final class TotalLabel {
    void show(int qty, int discount) {
        System.out.println("total: " + (qty * 2_000 - discount));
    }
}
final class OrderButton {
    void enable(boolean on) { System.out.println("order button: " + on); }
}
final class QuantityField {
    private final TotalLabel total;
    private final OrderButton button;
    private CouponField coupon;
    private int qty;
    QuantityField(TotalLabel total, OrderButton button) {
        this.total = total; this.button = button;
    }
    void wire(CouponField coupon) { this.coupon = coupon; }
    int value() { return qty; }
    void set(int qty) {
        this.qty = qty;
        total.show(qty, coupon.discount());
        button.enable(qty > 0);
    }
}
final class CouponField {
    private final TotalLabel total;
    private final OrderButton button;
    private final QuantityField qty;
    private int discount;
    CouponField(TotalLabel total, OrderButton button, QuantityField qty) {
        this.total = total; this.button = button; this.qty = qty;
    }
    int discount() { return discount; }
    void enter(String code) {
        discount = "SAVE10".equals(code) ? 1_000 : 0;
        total.show(qty.value(), discount);
        button.enable(true);              // copied rule, forgot qty > 0
    }
}
