import java.util.ArrayList;
import java.util.List;
import java.util.TreeMap;

public class FsModel {
  public static void main(String[] args) {
    Directory root = Directory.root();
    Directory docs = new Directory("docs");
    root.add(docs);
    docs.add(new File("cv.pdf", 1200));
    docs.add(new File("notes.txt", 300));
    root.add(new File("todo.md", 50));
    print(root, "");
    System.out.println("size of / = " + root.size());
    System.out.println("path of notes = " + docs.child("notes.txt").path());
    tryIt(() -> docs.add(new File("cv.pdf", 9)));
    tryIt(() -> new File("a/b", 1));
    tryIt(() -> docs.add(root));
    tryIt(() -> new File("big.iso", -1));
  }

  static void print(FileSystemNode node, String indent) {
    String tag = node.isDirectory() ? "[d] " : "[f] ";
    String name = node.parent == null ? "/" : node.name();
    System.out.println(indent + tag + name + " " + node.size());
    if (node instanceof Directory d)
      for (FileSystemNode c : d.children()) print(c, indent + "  ");
  }

  static void tryIt(Runnable r) {
    try { r.run(); } catch (RuntimeException e) {
      System.out.println("refused: " + e.getMessage());
    }
  }
}

abstract class FileSystemNode {
  private final String name;
  Directory parent;                        // null only for the root

  FileSystemNode(String name, boolean isRoot) {
    if (!isRoot && (name.isEmpty() || name.contains("/")
        || name.equals(".") || name.equals("..")))
      throw new IllegalArgumentException("bad name '" + name + "'");
    this.name = name;
  }

  String name() { return name; }
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
    if (sizeBytes < 0) throw new IllegalArgumentException("negative size");
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

  long size() {                            // Composite: ask every child
    long total = 0;
    for (FileSystemNode c : children.values()) total += c.size();
    return total;
  }

  FileSystemNode child(String name) { return children.get(name); }

  List<FileSystemNode> children() { return new ArrayList<>(children.values()); }

  void add(FileSystemNode node) {
    if (node.parent != null || node instanceof Directory && isInside(node))
      throw new IllegalStateException("would create a cycle or two parents");
    if (children.containsKey(node.name()))
      throw new IllegalStateException(node.name() + " already exists");
    children.put(node.name(), node);
    node.parent = this;
  }

  private boolean isInside(FileSystemNode node) {
    for (Directory d = this; d != null; d = d.parent)
      if (d == node) return true;
    return false;
  }
}
