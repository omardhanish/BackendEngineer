import java.io.IOException;
import java.io.StringReader;
import java.io.UncheckedIOException;
import java.util.*;
import java.util.function.Function;

public class Extensions {
  public static void main(String[] args) {
    Volume vol = Volume.fromConfig(props("rules=maxName,blockExt,quota\n"
        + "maxName=16\nblockExt=.exe\nquota=6000"));
    vol.create("docs", "cv.pdf", 1200);
    vol.create("docs", "notes.txt", 300);
    vol.create("logs", "app.log", 4000);
    vol.create("logs", "old.log", 200);
    attempt(() -> vol.create("tmp", "setup.exe", 10));
    attempt(() -> vol.create("tmp", "quarterly-report.txt", 10));
    attempt(() -> vol.create("logs", "big.log", 900));
    Criteria logs = Criteria.extension(".log");
    System.out.println("logs       " + vol.find(logs));
    System.out.println("big logs   "
        + vol.find(logs.and(Criteria.largerThan(1000))));
    Criteria notLogs = Criteria.file().and(logs.negate());
    System.out.println("not logs   " + vol.find(notLogs));
    System.out.println("by ext     "
        + vol.root.accept(new BytesByExtension()));
    attempt(() -> Volume.fromConfig(props("rules=virusScan")));
  }

  static Properties props(String text) {
    Properties p = new Properties();
    try { p.load(new StringReader(text)); }
    catch (IOException e) { throw new UncheckedIOException(e); }
    return p;
  }

  static void attempt(Runnable r) {
    try { r.run(); } catch (RuntimeException e) {
      System.out.println("refused    " + e.getMessage());
    }
  }
}

interface Criteria {                         // Specification / Strategy
  boolean test(FileSystemNode n);
  default Criteria and(Criteria o) { return n -> test(n) && o.test(n); }
  default Criteria negate() { return n -> !test(n); }
  static Criteria file() { return n -> !n.isDirectory(); }
  static Criteria extension(String ext) {
    return n -> !n.isDirectory() && n.name().endsWith(ext);
  }
  static Criteria largerThan(long bytes) {
    return n -> !n.isDirectory() && n.size() > bytes;
  }
}

interface NodeVisitor<R> {                   // new operations, no node edits
  R visitFile(File f);
  R visitDirectory(Directory d);
}

class BytesByExtension implements NodeVisitor<Map<String, Long>> {
  private final Map<String, Long> totals = new TreeMap<>();

  public Map<String, Long> visitFile(File f) {
    int dot = f.name().lastIndexOf('.');
    String ext = dot < 0 ? "(none)" : f.name().substring(dot);
    totals.merge(ext, f.size(), Long::sum);
    return totals;
  }

  public Map<String, Long> visitDirectory(Directory d) {
    for (FileSystemNode c : d.children()) c.accept(this);
    return totals;
  }
}

interface WriteRule { void check(Volume v, String name, long size); }

class MaxNameLength implements WriteRule {
  private final int max;
  MaxNameLength(int max) { this.max = max; }
  public void check(Volume v, String name, long size) {
    if (name.length() > max) throw new IllegalStateException("NAME_TOO_LONG");
  }
}

class BlockedExtension implements WriteRule {
  private final String ext;
  BlockedExtension(String ext) { this.ext = ext; }
  public void check(Volume v, String name, long size) {
    if (name.endsWith(ext)) throw new IllegalStateException("BLOCKED " + ext);
  }
}

class Quota implements WriteRule {
  private final long limit;
  Quota(long limit) { this.limit = limit; }
  public void check(Volume v, String name, long size) {
    if (v.root.size() + size > limit)
      throw new IllegalStateException("QUOTA_EXCEEDED");
  }
}

class Volume {
  static final Map<String, Function<String, WriteRule>> REGISTRY = Map.of(
      "maxName", s -> new MaxNameLength(Integer.parseInt(s)),
      "blockExt", BlockedExtension::new,
      "quota", s -> new Quota(Long.parseLong(s)));
  final Directory root = new Directory("");
  private final List<WriteRule> rules;

  Volume(List<WriteRule> rules) { this.rules = rules; }

  static Volume fromConfig(Properties p) {   // fail fast at startup
    List<WriteRule> rules = new ArrayList<>();
    for (String name : p.getProperty("rules", "").split(",")) {
      name = name.trim();
      if (name.isEmpty()) continue;            // no rules is valid
      Function<String, WriteRule> make = REGISTRY.get(name);
      if (make == null) throw new IllegalArgumentException("UNKNOWN_RULE "
          + name);
      String v = p.getProperty(name);
      if (v == null) throw new IllegalArgumentException("MISSING_SETTING "
          + name);
      rules.add(make.apply(v));
    }
    return new Volume(rules);
  }

  void create(String dir, String name, long size) {
    for (WriteRule r : rules) r.check(this, name, size);   // chain
    root.dir(dir).add(new File(name, size));
  }

  List<String> find(Criteria c) {
    List<String> hits = new ArrayList<>();
    Deque<FileSystemNode> stack = new ArrayDeque<>(List.of(root));
    while (!stack.isEmpty()) {
      FileSystemNode n = stack.pop();
      if (c.test(n)) hits.add(n.path());
      if (n instanceof Directory) {
        List<FileSystemNode> kids = ((Directory) n).children();
        for (int i = kids.size() - 1; i >= 0; i--) stack.push(kids.get(i));
      }
    }
    return hits;
  }
}

abstract class FileSystemNode {
  final String name;
  Directory parent;
  FileSystemNode(String name) { this.name = name; }
  String name() { return name; }
  String path() { return parent == null ? "" : parent.path() + "/" + name; }
  abstract boolean isDirectory();
  abstract long size();
  abstract <R> R accept(NodeVisitor<R> v);   // the one hook, added once
}

final class File extends FileSystemNode {
  private final long size;
  File(String name, long size) { super(name); this.size = size; }
  boolean isDirectory() { return false; }
  long size() { return size; }
  <R> R accept(NodeVisitor<R> v) { return v.visitFile(this); }
}

final class Directory extends FileSystemNode {
  private final TreeMap<String, FileSystemNode> kids = new TreeMap<>();
  Directory(String name) { super(name); }
  boolean isDirectory() { return true; }
  long size() { return kids.values().stream().mapToLong(c -> c.size()).sum(); }
  <R> R accept(NodeVisitor<R> v) { return v.visitDirectory(this); }
  List<FileSystemNode> children() { return new ArrayList<>(kids.values()); }

  void add(FileSystemNode n) {
    if (kids.putIfAbsent(n.name(), n) != null)
      throw new IllegalStateException("ALREADY_EXISTS " + n.name());
    n.parent = this;
  }

  Directory dir(String name) {
    if (!kids.containsKey(name)) add(new Directory(name));
    return (Directory) kids.get(name);
  }
}
