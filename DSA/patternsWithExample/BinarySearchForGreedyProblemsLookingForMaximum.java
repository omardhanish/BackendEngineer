package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

public class BinarySearchForGreedyProblemsLookingForMaximum {

    // Example: Cut Ribbons
    // ribbons = [9, 7, 5], need k = 4 pieces of the SAME length.
    // What is the MAXIMUM length x such that we can cut at least k pieces?
    // check(x): 9/x + 7/x + 5/x >= k
    // Expected: 4  (9->2, 7->1, 5->1 = 4 pieces; length 5 gives only 3)

    // Bounds of the answer space for this problem: length 1 .. longest ribbon
    private static final int MINIMUM_POSSIBLE_ANSWER = 1;
    private static final int MAXIMUM_POSSIBLE_ANSWER = 9;

    int[] ribbons;
    int k = 4;

    public static void main(String[] args) {
        int[] ribbons = {9, 7, 5};
        System.out.println("Max piece length = "
                + new BinarySearchForGreedyProblemsLookingForMaximum().fn(ribbons)); // 4
    }

    public int fn(int[] arr) {
        ribbons = arr;
        int left = MINIMUM_POSSIBLE_ANSWER;
        int right = MAXIMUM_POSSIBLE_ANSWER;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            boolean ok = check(mid);
            System.out.println("  left=" + left + " right=" + right + " mid=" + mid
                    + (ok ? "  feasible -> try bigger" : "  not feasible -> try smaller"));
            if (ok) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        return right;
    }

    public boolean check(int x) {
        int pieces = 0;
        for (int r : ribbons) {
            pieces += r / x;
        }
        return pieces >= k;
    }

}
