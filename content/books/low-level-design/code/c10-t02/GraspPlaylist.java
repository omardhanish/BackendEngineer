import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class GraspPlaylist {
    public static void main(String[] args) {
        var controller = new PlaylistController(new Playlist());
        controller.addTrack("Intro", 185);
        controller.addTrack("Theme", 240);
        System.out.println("Web shows:    " + controller.length());
        System.out.println("Mobile shows: " + controller.length());
        try {
            controller.addTrack("Glitch", 0);
        } catch (IllegalArgumentException e) {
            System.out.println("Rejected: " + e.getMessage());
        }
    }
}

record Track(String title, int seconds) {
    Track {
        Objects.requireNonNull(title, "title");
        if (seconds <= 0) throw new IllegalArgumentException("seconds <= 0");
    }
}

// Information Expert and Creator: it holds the tracks, so it
// computes their total and it makes new ones.
final class Playlist {
    private final List<Track> tracks = new ArrayList<>();

    Track add(String title, int seconds) {
        Track t = new Track(title, seconds);
        tracks.add(t);
        return t;
    }

    int totalSeconds() {
        return tracks.stream().mapToInt(Track::seconds).sum();
    }
}

// Controller: first object behind the UI for each system operation.
final class PlaylistController {
    private final Playlist playlist;

    PlaylistController(Playlist playlist) {
        this.playlist = Objects.requireNonNull(playlist, "playlist");
    }

    void addTrack(String title, int seconds) { playlist.add(title, seconds); }

    String length() {
        int s = playlist.totalSeconds();
        return String.format("%d:%02d", s / 60, s % 60);
    }
}
