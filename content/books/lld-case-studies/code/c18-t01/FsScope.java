public class FsScope {
  public static void main(String[] args) {
    for (UseCase u : UseCase.values())
      System.out.printf("%-4s %-8s %s%n", u.scope, u.actor, u);
    String[] paths = { "/docs/cv.pdf", "docs/cv.pdf", "/docs//cv.pdf",
        "/docs/../tmp", "/../tmp", "/" };
    for (String p : paths)
      System.out.printf("%-14s -> %s%n", p, PathRule.check(p));
  }
}

enum Actor { USER, OPERATOR }

enum Scope { IN, OUT }

enum UseCase {
  MAKE_DIRECTORY(Actor.USER, Scope.IN),
  CREATE_FILE(Actor.USER, Scope.IN),
  LIST_DIRECTORY(Actor.USER, Scope.IN),
  MOVE_OR_RENAME(Actor.USER, Scope.IN),
  DELETE_RECURSIVE(Actor.USER, Scope.IN),
  TOTAL_SIZE(Actor.USER, Scope.IN),
  FIND_BY_NAME(Actor.USER, Scope.IN),
  PERMISSIONS(Actor.OPERATOR, Scope.OUT),
  SYMBOLIC_LINKS(Actor.USER, Scope.OUT),
  DISK_PERSISTENCE(Actor.OPERATOR, Scope.OUT);

  final Actor actor;
  final Scope scope;

  UseCase(Actor actor, Scope scope) {
    this.actor = actor;
    this.scope = scope;
  }
}

final class PathRule {
  static final int MAX_NAME = 64;              // a v1 assumption, not a law

  static String check(String path) {
    if (!path.startsWith("/")) return "REJECT not absolute";
    if (path.equals("/")) return "OK depth 0";
    int depth = 0;
    for (String part : path.substring(1).split("/", -1)) {
      if (part.isEmpty()) return "REJECT empty name";
      if (part.equals(".")) continue;
      if (part.equals("..")) {
        if (depth == 0) return "REJECT above root";
        depth--;
        continue;
      }
      if (part.length() > MAX_NAME) return "REJECT name too long";
      depth++;
    }
    return "OK depth " + depth;
  }
}
