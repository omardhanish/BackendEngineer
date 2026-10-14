import java.util.ArrayList;
import java.util.List;

public class ScatteredPlaylist {
    public static void main(String[] args) {
        Playlist list = new Playlist();
        new WebScreen().onAdd(list, "Intro", 185);
        new MobileScreen().onAdd(list, "Theme", 240);
        System.out.println("Web shows:    " + new WebScreen().length(list));
        System.out.println("Mobile shows: " + new MobileScreen().length(list));
    }
}

record Track(String title, int seconds) {}

// A bare data holder: it knows its tracks but answers no questions.
class Playlist {
    final List<Track> tracks = new ArrayList<>();
}

// Each screen creates tracks and computes the length its own way.
class WebScreen {
    void onAdd(Playlist p, String title, int seconds) {
        p.tracks.add(new Track(title, seconds));
    }
    String length(Playlist p) {
        int total = 0;
        for (Track t : p.tracks) total += t.seconds();
        return String.format("%d:%02d", total / 60, total % 60);
    }
}

class MobileScreen {
    void onAdd(Playlist p, String title, int seconds) {
        p.tracks.add(new Track(title, seconds));
    }
    String length(Playlist p) {
        int minutes = 0;
        for (Track t : p.tracks) minutes += t.seconds() / 60;
        return minutes + " min";
    }
}
