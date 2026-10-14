import java.lang.reflect.Constructor;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

public class MiniContainerDemo {
    public static void main(String[] args) {
        var container = new MiniContainer();
        container.bind(PaymentGateway.class, FakeGateway.class);
        OrderService orders = container.get(OrderService.class);
        System.out.println(orders.place("A-7", 2500));
        System.out.println("Same instance: "
                + (orders == container.get(OrderService.class)));
        System.out.println("Build order: " + container.buildOrder());
        tryGet(new MiniContainer(), OrderService.class);
        tryGet(new MiniContainer(), Inventory.class);
    }
    static void tryGet(MiniContainer c, Class<?> type) {
        try {
            c.get(type);
        } catch (IllegalStateException e) {
            System.out.println("Startup failed: " + e.getMessage());
        }
    }
}

interface PaymentGateway { String charge(long cents); }

final class FakeGateway implements PaymentGateway {
    public String charge(long cents) { return "charged " + cents; }
}

final class AuditLog {
    String record(String event) { return "audit[" + event + "]"; }
}

final class OrderService {
    private final PaymentGateway gateway;
    private final AuditLog audit;
    OrderService(PaymentGateway gateway, AuditLog audit) {
        this.gateway = Objects.requireNonNull(gateway, "gateway");
        this.audit = Objects.requireNonNull(audit, "audit");
    }
    String place(String id, long cents) {
        return audit.record(id + " " + gateway.charge(cents));
    }
}

// Two constructors that need each other: neither can be built first.
final class Inventory { Inventory(Pricing pricing) { } }
final class Pricing { Pricing(Inventory inventory) { } }

final class MiniContainer {
    private final Map<Class<?>, Class<?>> bindings = new HashMap<>();
    private final Map<Class<?>, Object> singletons = new HashMap<>();
    private final Set<Class<?>> inProgress = new LinkedHashSet<>();
    private final List<String> built = new ArrayList<>();

    <T> void bind(Class<T> role, Class<? extends T> impl) {
        bindings.put(role, impl);
    }

    <T> T get(Class<T> role) {
        Class<?> impl = bindings.getOrDefault(role, role);
        Object bean = singletons.get(impl);
        return role.cast(bean != null ? bean : create(impl));
    }

    private Object create(Class<?> impl) {
        String name = impl.getSimpleName();
        if (impl.isInterface())
            throw new IllegalStateException("no binding for " + name);
        if (!inProgress.add(impl))
            throw new IllegalStateException("cycle " + path(name));
        try {
            Constructor<?>[] ctors = impl.getDeclaredConstructors();
            if (ctors.length != 1)
                throw new IllegalStateException(name + ": need 1 constructor");
            Class<?>[] types = ctors[0].getParameterTypes();
            Object[] deps = new Object[types.length];
            for (int i = 0; i < types.length; i++) deps[i] = get(types[i]);
            Object bean = ctors[0].newInstance(deps);
            singletons.put(impl, bean);
            built.add(name);
            return bean;
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("cannot build " + name, e);
        } finally {
            inProgress.remove(impl);
        }
    }

    private String path(String again) {
        List<String> names = new ArrayList<>();
        for (Class<?> c : inProgress) names.add(c.getSimpleName());
        names.add(again);
        return String.join(" -> ", names);
    }

    List<String> buildOrder() { return List.copyOf(built); }
}
