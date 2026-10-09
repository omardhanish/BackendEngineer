public class MessyDemo {
    public static void main(String[] args) {
        System.out.println(calc(2, 1200, "P"));
        System.out.println(calc(5, 300, "S"));
        System.out.println(calc(0, 900, "S"));
    }

    static int calc(int n, int t, String c) {   // what are n, t and c?
        int r = 0;
        if (n > 0) {
            if (c.equals("P")) {
                r = 0;
            } else {
                if (t >= 1000) r = 0;           // why 1000?
                else r = 250 + n * 40;          // why 250 and 40?
            }
        } else {
            r = -1;                             // -1 means "error"?
        }
        return r;
    }
}
