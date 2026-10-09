import java.util.*;
import java.util.function.Supplier;

public class PluginHostDemo {
    public static void main(String[] args) {
        Map<String, Supplier<Plugin>> known = Map.of(
                "csv", CsvExport::new, "broken", Broken::new);
        Host host = new Host(known);
        host.load(List.of("csv", "broken", "pdf"));   // read from config
        System.out.println(host.run("export"));
        System.out.println(host.run("print"));
    }
}

interface HostApi {                        // all a plugin may touch
    void command(String name, Supplier<String> action);
}
interface Plugin { void start(HostApi api); }   // the contract to sign

class Host implements HostApi {
    private final Map<String, Supplier<Plugin>> known;
    private final Map<String, Supplier<String>> commands = new TreeMap<>();
    Host(Map<String, Supplier<Plugin>> known) { this.known = known; }
    public void command(String n, Supplier<String> a) { commands.put(n, a); }
    void load(List<String> enabled) {
        for (String id : enabled) {
            Supplier<Plugin> factory = known.get(id);
            if (factory == null) { System.out.println("skip " + id); continue; }
            try { factory.get().start(this); System.out.println("on " + id); }
            catch (RuntimeException e) { System.out.println("off " + id); }
        }
    }
    String run(String name) {
        return commands.getOrDefault(name, () -> "no command " + name).get();
    }
}

class CsvExport implements Plugin {        // in a real app: its own jar
    public void start(HostApi api) { api.command("export", () -> "a,b,c"); }
}

class Broken implements Plugin {
    public void start(HostApi api) { throw new IllegalStateException(); }
}
