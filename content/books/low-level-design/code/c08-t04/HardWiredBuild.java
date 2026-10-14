public class HardWiredBuild {
    public static void main(String[] args) {
        BuildServer server = new BuildServer(
            new ChatRoom(), new Pager(), new Dashboard());
        server.finish(41, true);
        try {
            server.finish(42, false);
        } catch (IllegalStateException e) {
            System.out.println("build server crashed: " + e.getMessage());
        }
    }
}

// The subject knows every concrete class that cares about a build.
final class BuildServer {
    private final ChatRoom chat;
    private final Pager pager;
    private final Dashboard dashboard;
    BuildServer(ChatRoom chat, Pager pager, Dashboard dashboard) {
        this.chat = chat; this.pager = pager; this.dashboard = dashboard;
    }
    void finish(int build, boolean passed) {
        chat.post("build " + build + (passed ? " passed" : " failed"));
        if (!passed) pager.page(build);    // throws: the next line never runs
        dashboard.update(build, passed);
        // A fourth party (metrics, audit) means editing this class again.
    }
}
final class ChatRoom {
    void post(String text) { System.out.println("chat: " + text); }
}
final class Pager {
    void page(int build) {
        throw new IllegalStateException("pager service down");
    }
}
final class Dashboard {
    void update(int build, boolean passed) {
        System.out.println("dashboard: #" + build + " " + passed);
    }
}
