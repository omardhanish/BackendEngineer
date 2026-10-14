public class LeakyPlaylist {
    public static void main(String[] args) {
        Playlist list = new Playlist();
        list.add("Intro");
        list.add("Rain");
        list.add("Outro");

        // Client 1 must know the storage: an array plus a count.
        String[] raw = list.songs();
        for (int i = 0; i < raw.length; i++) {
            System.out.println("play " + raw[i]);
        }

        // Client 2 edits the playlist behind its back.
        raw[0] = "Ad break";
        System.out.println("first now: " + list.songs()[0]);
        System.out.println("count still: " + list.count());
    }
}

final class Playlist {
    private final String[] songs = new String[4]; // grows later? clients break
    private int count;

    void add(String title) { songs[count++] = title; }
    String[] songs() { return songs; } // leaks the internal array
    int count() { return count; }
}
