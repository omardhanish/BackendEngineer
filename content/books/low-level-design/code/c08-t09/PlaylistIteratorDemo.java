import java.util.*;

public class PlaylistIteratorDemo {
    public static void main(String[] args) {
        Playlist list = new Playlist();
        list.add("Intro"); list.add("Rain"); list.add("Outro");

        for (String song : list) System.out.println("play " + song);

        Iterator<String> a = list.iterator(), b = list.iterator();
        a.next(); a.next();
        System.out.println("a at " + a.next() + ", b at " + b.next());

        try { a.next(); }
        catch (NoSuchElementException e) { System.out.println(e.getMessage()); }

        try {
            for (String song : list) if (song.equals("Rain")) list.add("Bonus");
        } catch (ConcurrentModificationException e) {
            System.out.println("fail-fast: " + e.getClass().getSimpleName());
        }
    }
}

final class Playlist implements Iterable<String> {
    private String[] songs = new String[2];
    private int size;
    private int modCount; // bumps on every structural change

    void add(String title) {
        Objects.requireNonNull(title, "title");
        if (size == songs.length) songs = Arrays.copyOf(songs, size * 2);
        songs[size++] = title;
        modCount++;
    }

    @Override public Iterator<String> iterator() { return new Cursor(); }

    private final class Cursor implements Iterator<String> {
        private int next;                       // each iterator owns its cursor
        private final int expected = modCount;  // snapshot of the version

        @Override public boolean hasNext() { return next < size; }

        @Override public String next() {
            if (modCount != expected)
                throw new ConcurrentModificationException();
            if (!hasNext()) throw new NoSuchElementException("end of playlist");
            return songs[next++];
        }
    }
}
