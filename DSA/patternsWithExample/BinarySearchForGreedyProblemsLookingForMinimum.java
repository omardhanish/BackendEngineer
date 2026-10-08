package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

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

}
