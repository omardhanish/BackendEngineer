package patterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

public class BinarySearchForGreedyProblemsLookingForMinimum {

    // Replace with the real bounds of the answer space for your problem
    private static final int MINIMUM_POSSIBLE_ANSWER = 0;
    private static final int MAXIMUM_POSSIBLE_ANSWER = Integer.MAX_VALUE - 1; // stay below MAX_VALUE so mid + 1 can't overflow

    public static void main(String[] args) {

    }

    // Looking for a minimum
    public int fn(int[] arr) {
        int left = MINIMUM_POSSIBLE_ANSWER;
        int right = MAXIMUM_POSSIBLE_ANSWER;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (check(mid)) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }

        return left;
    }
    

    public boolean check(int x) {
        // Replace with the problem's feasibility condition for x
        return true;
    }

}
