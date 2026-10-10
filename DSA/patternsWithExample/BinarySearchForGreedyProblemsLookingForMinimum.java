package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #111 Koko Eating Bananas (875), #120 Capacity to Ship Packages (1011)

public class BinarySearchForGreedyProblemsLookingForMinimum {

    // Example: Koko Eating Bananas (LeetCode 875)
    // piles = [3, 6, 7, 11], h = 8 hours.
    // What is the MINIMUM eating speed x so all piles finish within h hours?
    // check(x): sum of ceil(pile / x) <= h
    // Expected: 4

    // Bounds of the answer space for this problem: speed 1 .. biggest pile
    private static final int MINIMUM_POSSIBLE_ANSWER = 1;
    private static final int MAXIMUM_POSSIBLE_ANSWER = 11;

    int[] piles;
    int h = 8;

    public static void main(String[] args) {
        int[] piles = {3, 6, 7, 11};
        System.out.println("Min eating speed = "
                + new BinarySearchForGreedyProblemsLookingForMinimum().fn(piles)); // 4
    }

    // Looking for a minimum
    public int fn(int[] arr) {
        piles = arr;
        int left = MINIMUM_POSSIBLE_ANSWER;
        int right = MAXIMUM_POSSIBLE_ANSWER;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            boolean ok = check(mid);
            System.out.println("  left=" + left + " right=" + right + " mid=" + mid
                    + (ok ? "  feasible -> try smaller" : "  not feasible -> try bigger"));
            if (ok) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }

        return left;
    }

    public boolean check(int x) {
        int hours = 0;
        for (int p : piles) {
            hours += (p + x - 1) / x; // ceil(p / x)
        }
        return hours <= h;
    }

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #111 Koko Eating Bananas (875) | source: DSA/java/leetcode/medium/KokoEatingBananas.java ---
    static class KokoEatingBananas {

      int minEatingSpeed(int[] piles, int h) {
        int minSpeed = 1;

        // Find max pile size
        int maxSpeed = 0;
        for (int pile : piles)
          maxSpeed = Math.max(maxSpeed, pile);

        // Binary search
        while (minSpeed < maxSpeed) {
          int mid = minSpeed + (maxSpeed - minSpeed) / 2;

          if (canEatInTime(piles, h, mid))
            maxSpeed = mid;
          else
            minSpeed = mid + 1;
        }

        return minSpeed;
      }

      private boolean canEatInTime(int[] piles, int h, int speed) {
        int hours = 0;
        for(int pile : piles)
          hours += (int) Math.ceil((double) pile / speed);

        return hours <= h;
      }

    }

    // --- #120 Capacity to Ship Packages (1011) | source: DSA/java/leetcode/medium/CapacityToShipPackagesWithinDDays.java ---
    static class CapacityToShipPackagesWithinDDays {

      int shipWithinDays(int[] weights, int D) {

        int minCap = 0;
        int maxCap = 0;
        for (int weight : weights) {

          minCap = Math.max(minCap, weight);
          maxCap += weight;
        }

        // Apply binary search
        while (minCap < maxCap) {
          int mid = minCap + (maxCap - minCap) / 2;

          // Try to ship with "mid" capacity
          int days = 1;
          int sum = 0;
          for (int weight : weights) {
            if (sum + weight > mid) {
              days++;
              sum = 0;
            }
            sum += weight;
          }

          // If more days are required, increase capacity
          if (days > D)
            minCap = mid + 1;
          else
            maxCap = mid;
        }

        return minCap;
      }

    }
    // ===== End of playlist solutions =====
}
