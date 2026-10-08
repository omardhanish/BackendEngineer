package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

public class DynamicProgrammingTopDownMemoization {

/*
    Map<STATE, Integer> memo = new HashMap<>();

    public int fn(int[] arr) {
        return dp(STATE_FOR_WHOLE_INPUT, arr);
    }

    public int dp(STATE, int[] arr) {
        if (BASE_CASE) {
            return 0;
        }

        if (memo.contains(STATE)) {
            return memo.get(STATE);
        }

        int ans = RECURRENCE_RELATION(STATE);
        memo.put(STATE, ans);
        return ans;
    }
*/

    // Example: Min Cost Climbing Stairs (LeetCode 746)
    // cost[i] = price to step on stair i. Start on stair 0 or 1, climb 1 or 2 at a time.
    // Find the min cost to reach the top (index n, past the last stair).
    //
    // STATE      : i = the stair we want to reach
    // dp(i)      : min cost to reach stair i
    // BASE CASE  : dp(0) = dp(1) = 0 (we may start there for free)
    // RECURRENCE : dp(i) = min(dp(i-1) + cost[i-1], dp(i-2) + cost[i-2])

    Map<Integer, Integer> memo = new HashMap<>();

    public static void main(String[] args) {
        int[] cost = {10, 15, 20};
        System.out.println("cost = " + Arrays.toString(cost));
        System.out.println("Answer = " + new DynamicProgrammingTopDownMemoization().minCostClimbingStairs(cost)); // 15

        System.out.println();
        int[] cost2 = {1, 100, 1, 1, 1, 100, 1, 1, 100, 1};
        System.out.println("cost = " + Arrays.toString(cost2));
        System.out.println("Answer = " + new DynamicProgrammingTopDownMemoization().minCostClimbingStairs(cost2)); // 6
    }

    public int minCostClimbingStairs(int[] cost) {
        return dp(cost.length, cost);              // start from the BIGGEST problem (the top)
    }

    private int dp(int i, int[] cost) {
        if (i <= 1) {                              // base case
            System.out.println("  dp(" + i + ") base case = 0");
            return 0;
        }

        if (memo.containsKey(i)) {                 // already solved -> reuse
            System.out.println("  dp(" + i + ") memo hit = " + memo.get(i));
            return memo.get(i);
        }

        System.out.println("  dp(" + i + ") solving...");
        int ans = Math.min(dp(i - 1, cost) + cost[i - 1],   // recursion breaks it into smaller states
                           dp(i - 2, cost) + cost[i - 2]);
        memo.put(i, ans);                          // remember before returning
        System.out.println("  dp(" + i + ") = " + ans + "  memo " + memo);
        return ans;
    }

}
