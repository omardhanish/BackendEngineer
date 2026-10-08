package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.Arrays;

public class DynamicProgrammingBottomUpTabulation {

    // Example: Min Cost Climbing Stairs (LeetCode 746) - same problem as the top-down class
    // cost[i] = price to step on stair i. Start on stair 0 or 1, climb 1 or 2 at a time.
    // Find the min cost to reach the top (index n, past the last stair).
    //
    // STATE      : i = the stair we want to reach
    // dp[i]      : min cost to reach stair i
    // BASE CASE  : dp[0] = dp[1] = 0 (we may start there for free)
    // RECURRENCE : dp[i] = min(dp[i-1] + cost[i-1], dp[i-2] + cost[i-2])

    public static void main(String[] args) {
        int[] cost = {10, 15, 20};
        System.out.println("cost = " + Arrays.toString(cost));
        System.out.println("Answer = " + new DynamicProgrammingBottomUpTabulation().minCostClimbingStairs(cost)); // 15

        System.out.println();
        int[] cost2 = {1, 100, 1, 1, 1, 100, 1, 1, 100, 1};
        System.out.println("cost = " + Arrays.toString(cost2));
        System.out.println("Answer = " + new DynamicProgrammingBottomUpTabulation().minCostClimbingStairs(cost2)); // 6
    }

    public int minCostClimbingStairs(int[] cost) {
        int n = cost.length;
        int[] dp = new int[n + 1];                 // table instead of a memo map
        dp[0] = 0;                                 // base cases (already 0, written for clarity)
        dp[1] = 0;

        for (int i = 2; i <= n; i++) {             // start from the SMALLEST problem and build up
            dp[i] = Math.min(dp[i - 1] + cost[i - 1],
                             dp[i - 2] + cost[i - 2]);   // dp[i-1], dp[i-2] are already filled
            System.out.println("  dp[" + i + "] = min(" + dp[i - 1] + " + " + cost[i - 1] + ", "
                    + dp[i - 2] + " + " + cost[i - 2] + ") = " + dp[i] + "   table " + Arrays.toString(dp));
        }

        return dp[n];                              // answer for the whole input
    }

}
