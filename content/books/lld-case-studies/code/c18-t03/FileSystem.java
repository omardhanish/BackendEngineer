import java.util.*;
import java.util.function.Predicate;

public class FileSystem {
  public static void main(String[] args) {
    FileSystem fs = new FileSystem();
    fs.mkdirs("/home/ada/docs");
    fs.createFile("/home/ada/docs/cv.pdf", 1200);
    fs.createFile("/home/ada/docs/notes.txt", 300);
    fs.mkdirs("/home/ada/logs");
    fs.createFile("/home/ada/logs/app.log", 4000);
    fs.createFile("/home/ada/todo.txt", 50);
    System.out.println("ls /home/ada   " + fs.list("/home/ada"));
    System.out.println("du /home/ada   " + fs.size("/home/ada"));
    System.out.println("find .txt      "
        + fs.find("/home/ada", n -> n.name().endsWith(".txt")));
    fs.move("/home/ada/todo.txt", "/home/ada/docs/plan.txt");
    System.out.println("du docs        " + fs.size("/home/ada/logs/../docs"));
    fs.delete("/home/ada/logs");
    System.out.println("ls /home/ada   " + fs.list("/home/ada"));
    attempt(() -> fs.createFile("/home/ada/docs/cv.pdf", 1));
    attempt(() -> fs.list("/home/ada/docs/cv.pdf"));
    attempt(() -> fs.size("/home/bob"));
    attempt(() -> fs.move("/home", "/home/ada/docs/home"));
    attempt(() -> fs.size("home/ada"));
  }

  static void attempt(Runnable r) {
    try { r.run(); } catch (FsException e) {
      System.out.println("error          " + e.getMessage());
    }
  }

  private final Directory root = Directory.root();

  public void mkdirs(String path) {               // like mkdir -p
    Directory dir = root;
    for (String name : parse(path)) {
      FileSystemNode next = dir.child(name);
      if (next == null) dir.add(next = new Directory(name));
      dir = asDirectory(next);
    }
  }

  public void createFile(String path, long sizeBytes) {
    List<String> parts = parse(path);
    parentOf(parts).add(new File(last(parts), sizeBytes));
  }

  public List<String> list(String path) {
    List<String> out = new ArrayList<>();
    for (FileSystemNode c : asDirectory(resolve(parse(path))).children())
      out.add(c.isDirectory() ? c.name() + "/" : c.name());
    return out;
  }

  public long size(String path) { return resolve(parse(path)).size(); }

  public List<String> find(String path, Predicate<FileSystemNode> test) {
    List<String> hits = new ArrayList<>();
    Deque<FileSystemNode> stack = new ArrayDeque<>();   // no recursion limit
    stack.push(resolve(parse(path)));
    while (!stack.isEmpty()) {
      FileSystemNode n = stack.pop();
      if (test.test(n)) hits.add(n.path());
      if (n instanceof Directory) {
        List<FileSystemNode> kids = ((Directory) n).children();
        for (int i = kids.size() - 1; i >= 0; i--) stack.push(kids.get(i));
      }
    }
    return hits;
  }

  public void move(String from, String to) {      // also a rename
    List<String> src = parse(from), dst = parse(to);
    if (src.isEmpty()) throw new FsException("ROOT_IS_FIXED", from);
    FileSystemNode node = resolve(src);
    Directory target = parentOf(dst);
    if (node instanceof Directory && target.isInside(node))
      throw new FsException("MOVE_INTO_ITSELF", to);
    FileSystemNode.checkName(last(dst));
    if (target.child(last(dst)) != null)
      throw new FsException("ALREADY_EXISTS", to);
    node.parent.remove(node.name());              // all checks passed
    node.rename(last(dst));
    target.add(node);
  }

  public void delete(String path) {               // recursive, like rm -r
    List<String> parts = parse(path);
    if (parts.isEmpty()) throw new FsException("ROOT_IS_FIXED", path);
    FileSystemNode node = resolve(parts);
    node.parent.remove(node.name());
  }

  static List<String> parse(String path) {        // normalise . and ..
    if (!path.startsWith("/")) throw new FsException("NOT_ABSOLUTE", path);
    List<String> parts = new ArrayList<>();
    if (path.equals("/")) return parts;
    for (String p : path.substring(1).split("/", -1)) {
      if (p.isEmpty()) throw new FsException("EMPTY_NAME", path);
      if (p.equals(".")) continue;
      if (!p.equals("..")) parts.add(p);
      else if (parts.isEmpty()) throw new FsException("ABOVE_ROOT", path);
      else parts.remove(parts.size() - 1);
    }
    return parts;
  }

  private FileSystemNode resolve(List<String> parts) {
    FileSystemNode node = root;
    for (String name : parts) {
      node = asDirectory(node).child(name);
      if (node == null) throw new FsException("NOT_FOUND", "/"
          + String.join("/", parts));
    }
    return node;
  }

  private Directory parentOf(List<String> parts) {
    if (parts.isEmpty()) throw new FsException("ROOT_IS_FIXED", "/");
    return asDirectory(resolve(parts.subList(0, parts.size() - 1)));
  }

  private static Directory asDirectory(FileSystemNode n) {
    if (!(n instanceof Directory))
      throw new FsException("NOT_A_DIRECTORY", n.path());
    return (Directory) n;
  }

  private static String last(List<String> parts) {
    return parts.get(parts.size() - 1);
  }
}

class FsException extends RuntimeException {
  FsException(String code, String path) { super(code + " " + path); }
}

abstract class FileSystemNode {
  private String name;
  Directory parent;                               // null only for the root

  FileSystemNode(String name, boolean isRoot) {
    if (!isRoot) checkName(name);
    this.name = name;
  }

  static void checkName(String n) {
    if (n.isEmpty() || n.contains("/") || n.equals(".") || n.equals(".."))
      throw new FsException("BAD_NAME", n);
  }

  String name() { return name; }
  void rename(String newName) { checkName(newName); name = newName; }
  abstract boolean isDirectory();
  abstract long size();

  String path() {
    if (parent == null) return "/";
    String up = parent.path();
    return (up.equals("/") ? "" : up) + "/" + name;
  }
}

final class File extends FileSystemNode {
  private final long sizeBytes;

  File(String name, long sizeBytes) {
    super(name, false);
    if (sizeBytes < 0) throw new FsException("NEGATIVE_SIZE", name);
    this.sizeBytes = sizeBytes;
  }

  boolean isDirectory() { return false; }
  long size() { return sizeBytes; }
}

final class Directory extends FileSystemNode {
  private final TreeMap<String, FileSystemNode> children = new TreeMap<>();

  Directory(String name) { super(name, false); }
  private Directory() { super("", true); }
  static Directory root() { return new Directory(); }

  boolean isDirectory() { return true; }

  long size() {                                   // recursive Composite sum
    long total = 0;
    for (FileSystemNode c : children.values()) total += c.size();
    return total;
  }

  FileSystemNode child(String name) { return children.get(name); }
  List<FileSystemNode> children() { return new ArrayList<>(children.values()); }

  void add(FileSystemNode node) {
    if (children.containsKey(node.name()))
      throw new FsException("ALREADY_EXISTS",
          (parent == null ? "" : path()) + "/" + node.name());
    children.put(node.name(), node);
    node.parent = this;
  }

  void remove(String name) { children.remove(name).parent = null; }

  boolean isInside(FileSystemNode node) {
    for (Directory d = this; d != null; d = d.parent)
      if (d == node) return true;
    return false;
  }
}
