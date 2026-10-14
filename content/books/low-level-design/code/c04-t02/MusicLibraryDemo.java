import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class MusicLibraryDemo {
    public static void main(String[] args) {
        var artist = new Artist("Kite Lane");
        var album = new Album("Neon", artist);
        album.addTrack("Intro", 62);
        album.addTrack("Night Drive", 241);
        var mix = new Playlist();
        mix.add(album.tracks().get(1));
        System.out.println(new Player().play(mix.tracks().get(0)));
        mix.clear();
        System.out.println(album.name() + " by " + album.artist().name()
                + " still has " + album.tracks().size() + " tracks");
        try {
            album.tracks().clear();
        } catch (UnsupportedOperationException e) {
            System.out.println("Outside code cannot remove album tracks");
        }
    }
}
// Value object: immutable, so sharing a reference is safe.
record Track(String title, int seconds) {
    Track {
        Objects.requireNonNull(title, "title");
        if (seconds <= 0) throw new IllegalArgumentException("seconds <= 0");
    }
}
record Artist(String name) {}

final class Album {
    private final String name;
    private final Artist artist;                    // association
    private final List<Track> tracks = new ArrayList<>(); // composition
    Album(String name, Artist artist) {
        this.name = Objects.requireNonNull(name, "name");
        this.artist = Objects.requireNonNull(artist, "artist");
    }
    void addTrack(String title, int seconds) {   // the whole creates its parts
        tracks.add(new Track(title, seconds));
    }
    List<Track> tracks() { return List.copyOf(tracks); }
    String name() { return name; }
    Artist artist() { return artist; }
}

final class Playlist {
    private final List<Track> tracks = new ArrayList<>(); // aggregation
    void add(Track t) { tracks.add(Objects.requireNonNull(t, "track")); }
    void clear() { tracks.clear(); }               // parts live on elsewhere
    List<Track> tracks() { return List.copyOf(tracks); }
}

final class Player {                               // dependency: no field
    String play(Track t) {
        return "Playing " + t.title() + " (" + t.seconds() + "s)";
    }
}
