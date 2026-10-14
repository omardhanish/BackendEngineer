import java.util.ArrayList;
import java.util.List;

public class LeakyAlbum {
    public static void main(String[] args) {
        List<Track> list = new ArrayList<>();
        list.add(new Track("Intro"));
        list.add(new Track("Night Drive"));
        Album album = new Album("Neon", list);   // the diagram says: composed
        Playlist mix = new Playlist();
        mix.add(album.tracks().get(1));          // a playlist shares the part
        System.out.println("Start:        " + album.describe());
        mix.renameFirst("Night Drive (edit)");   // playlist edits shared part
        System.out.println("After rename: " + album.describe());
        list.clear();                            // caller reuses its list
        System.out.println("After clear:  " + album.describe());
    }
}

// Mutable part: anyone holding a reference can change it.
class Track {
    private String title;
    Track(String title) { this.title = title; }
    String title() { return title; }
    void rename(String title) { this.title = title; }
}

// Claims to own its tracks, but stores and returns the caller's list.
class Album {
    private final String name;
    private final List<Track> tracks;
    Album(String name, List<Track> tracks) {
        this.name = name;
        this.tracks = tracks;                   // no copy: aliasing
    }
    List<Track> tracks() { return tracks; }     // no copy: leak
    String describe() {
        StringBuilder sb = new StringBuilder(name + " " + tracks.size());
        for (Track t : tracks) sb.append(" | ").append(t.title());
        return sb.toString();
    }
}

class Playlist {
    private final List<Track> tracks = new ArrayList<>();
    void add(Track t) { tracks.add(t); }
    void renameFirst(String title) { tracks.get(0).rename(title); }
}
