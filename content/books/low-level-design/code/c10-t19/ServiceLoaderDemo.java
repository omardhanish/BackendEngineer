import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import java.util.ServiceLoader;

public class ServiceLoaderDemo {
    public static void main(String[] args) throws Exception {
        try (var empty = loaderWith(List.of())) {
            System.out.println("found " + discover(empty));
        }
        // A plugin jar would ship this file; we write it to a temp folder.
        var plugins = List.of("ServiceLoaderDemo$UpperCodec",
                              "ServiceLoaderDemo$ReverseCodec");
        try (var loader = loaderWith(plugins)) {    // closes the jar handles
            System.out.println("found " + discover(loader));
        }
    }

    static List<String> discover(ClassLoader loader) {
        return ServiceLoader.load(Codec.class, loader).stream()
            .map(ServiceLoader.Provider::get)      // calls no-arg constructor
            .sorted(Comparator.comparing(Codec::name))
            .map(c -> c.name() + ":" + c.encode("aaab"))
            .toList();
    }

    static URLClassLoader loaderWith(List<String> providers) throws Exception {
        Path dir = Files.createTempDirectory("plugins");
        Path services =
            dir.resolve("META-INF/services/" + Codec.class.getName());
        Files.createDirectories(services.getParent());
        Files.write(services, providers);         // one class name per line
        for (Path p : List.of(dir, dir.resolve("META-INF"),
                services.getParent(), services)) p.toFile().deleteOnExit();
        URL[] path = { dir.toUri().toURL() };
        ClassLoader host = ServiceLoaderDemo.class.getClassLoader();
        return new URLClassLoader(path, host);
    }

    public static class ReverseCodec implements Codec {  // public, no-arg
        public String name() { return "reverse"; }
        public String encode(String s) {
            return new StringBuilder(s).reverse().toString();
        }
    }

    public static class UpperCodec implements Codec {
        public String name() { return "upper"; }
        public String encode(String s) { return s.toUpperCase(); }
    }
}

interface Codec {                                 // the service interface
    String name();
    String encode(String input);
}
