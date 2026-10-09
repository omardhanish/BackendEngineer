import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Function;

public class ContainerDemo {
    public static void main(String[] args) {
        Container c = new Container();
        c.register(Clock.class, k -> new FixedClock(9));
        c.register(Greeter.class, k -> new Greeter(k.get(Clock.class)));
        System.out.println(c.get(Greeter.class).greet("Ada"));
        System.out.println("one shared Greeter: "
                + (c.get(Greeter.class) == c.get(Greeter.class)));
    }
}

class Container {                          // inversion of control, in small
    private final Map<Class<?>, Function<Container, ?>> recipes =
            new LinkedHashMap<>();
    private final Map<Class<?>, Object> built = new LinkedHashMap<>();

    <T> void register(Class<T> type, Function<Container, T> recipe) {
        recipes.put(type, recipe);
    }

    <T> T get(Class<T> type) {
        Object instance = built.get(type);
        if (instance == null) {            // build on first request only
            instance = recipes.get(type).apply(this);
            built.put(type, instance);
        }
        return type.cast(instance);
    }
}

interface Clock { int hour(); }

record FixedClock(int hour) implements Clock { }

class Greeter {
    private final Clock clock;
    Greeter(Clock clock) { this.clock = clock; }
    String greet(String name) {
        return (clock.hour() < 12 ? "Good morning, " : "Hello, ") + name;
    }
}
