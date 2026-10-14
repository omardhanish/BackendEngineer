public class InvoiceBefore {
    public static void main(String[] args) {
        InvoicePrinter p = new InvoicePrinter();
        // Characterization tests: they pin what the code does today.
        check("plain invoice", p.print("Ada", new String[] {"Pen", "Pad"},
            new int[] {2, 1}, new int[] {150, 420}, false)
            .equals("Invoice: Ada\nPen x2 = 300\nPad x1 = 420\nTotal: 720"));
        check("vip over 1000 gets 10% off", p.print("Bo",
            new String[] {"Lamp"}, new int[] {1}, new int[] {1200}, true)
            .equals("Invoice: Bo\nLamp x1 = 1200\nTotal: 1080"));
        check("vip at exactly 1000 pays full", p.print("Cy",
            new String[] {"Desk"}, new int[] {1}, new int[] {1000}, true)
            .equals("Invoice: Cy\nDesk x1 = 1000\nTotal: 1000"));
    }

    static void check(String name, boolean ok) {
        System.out.println((ok ? "PASS " : "FAIL ") + name);
    }
}

// Legacy code: parallel arrays, cryptic names, logic and text mixed.
class InvoicePrinter {
    String print(String c, String[] items, int[] q, int[] cents,
                 boolean vip) {
        String s = "Invoice: " + c + "\n";
        int t = 0;
        for (int i = 0; i < items.length; i++) {
            int x = q[i] * cents[i];
            s += items[i] + " x" + q[i] + " = " + x + "\n";
            t += x;
        }
        if (vip && t > 1000) t = t - t / 10;
        s += "Total: " + t;
        return s;
    }
}
