import java.util.List;

public class AnemicClinic {
    public static void main(String[] args) {
        Clinician ada = new Clinician();
        ada.name = "Dr Ada";
        ada.setHours(11, 17);
        Clinician lee = new Clinician();      // half-built: name never set
        lee.setHours(9, 17);
        List<Clinician> staff = List.of(ada, lee);
        System.out.println("from 10: " + ClinicUtils.earliest(staff, 10));
        ada.end = 8;                          // nothing checks start < end
        System.out.println("Ada works " + ada.start + "-" + ada.end);
    }
}

// A bag of public fields, filled in by whoever remembers to.
class Clinician {
    public String name;
    public int start;
    public int end;

    void setHours(int start, int end) {
        this.start = start;
        this.end = end;
    }
}

// The rules live far from the data they read.
class ClinicUtils {
    static String earliest(List<Clinician> staff, int fromHour) {
        String best = "no slot";
        int bestHour = 24;
        for (Clinician c : staff) {
            int hour = Math.max(fromHour, c.start);
            if (hour < c.end && hour < bestHour) {
                bestHour = hour;
                best = c.name + " at " + hour;
            }
        }
        return best;
    }
}
