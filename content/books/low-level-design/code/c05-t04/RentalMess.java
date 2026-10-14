public class RentalMess {
    public static void main(String[] args) {
        // The caller reads t as hours; calc means minutes.
        System.out.println("2 h weekday: " + calc(2, false));
        System.out.println("2 h weekend: " + calc(2, true));
        System.out.println("0 h weekday: " + calc(0, false));
        System.out.println("Expected 2 h weekday: 350");
    }

    // What is t? What does true mean? What are 60, 200 and 150?
    static int calc(int t, boolean f) {
        int r = 0;
        if (t > 0) {
            if (t <= 60) {
                r = 200;
            } else {
                r = 200 + ((t - 60 + 59) / 60) * 150;
            }
            if (f) {
                r = r + r / 2;
            }
        } else {
            r = -1;
        }
        return r;
    }
}
