import java.lang.reflect.InvocationHandler;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;
import java.util.Objects;

public class DynamicProxyDemo {
    public static void main(String[] args) {
        PriceService svc =
            Audited.wrap(new ShopPrices(), PriceService.class);
        System.out.println(svc.price("tea"));
        System.out.println(svc.basket("tea", "cake"));
        try { svc.price(" "); }
        catch (IllegalArgumentException e) {
            System.out.println("caught " + e.getMessage());
        }
        System.out.println("is proxy: " + Proxy.isProxyClass(svc.getClass()));
    }
}
interface PriceService {
    int price(String item);
    int basket(String first, String second);
}
final class ShopPrices implements PriceService {
    @Override public int price(String item) {
        if (item.isBlank()) throw new IllegalArgumentException("blank item");
        return item.length() * 100;
    }
    @Override public int basket(String first, String second) {
        return price(first) + price(second);   // this.price: no proxy here
    }
}
final class Audited {
    static <T> T wrap(T target, Class<T> type) {
        Objects.requireNonNull(target, "target");
        InvocationHandler handler = (proxy, method, args) -> {
            System.out.println("audit: " + method.getName());
            try { return method.invoke(target, args); }
            catch (InvocationTargetException e) { throw e.getCause(); }
        };
        Object p = Proxy.newProxyInstance(type.getClassLoader(),
            new Class<?>[] {type}, handler);
        return type.cast(p);
    }
}
