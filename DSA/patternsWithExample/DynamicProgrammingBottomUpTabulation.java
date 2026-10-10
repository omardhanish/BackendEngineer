package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.Arrays;
import java.util.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #122 Min Cost Climbing Stairs (746), #20 Climbing Stairs (70), #45 House Robber (198), #46 House Robber II (213), #54 Coin Change (322), #78 Longest Common Subsequence (1143), #83 Edit Distance (72), #38 Triangle (120), #100 Longest Increasing Subsequence (300), #107 Decode Ways (91), #132 Unique Paths (62), #136 Word Break (139), #146 Maximal Square (221), #125 Target Sum (494)

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

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #122 Min Cost Climbing Stairs (746) | source: DSA/java/leetcode/easy/MinCostClimbingStairs.java ---
    /**
     * Created by nikoo28 on 2019-07-21 15:22
     */

    static class MinCostClimbingStairs {

      int minCostClimbingStairs(int[] cost) {

        int n = cost.length;
        int[] minCost = new int[n + 1];

        for (int i = 2; i <= n; i++) {
          minCost[i] =
              Math.min(
                  (cost[i - 1] + minCost[i - 1]),
                  (cost[i - 2] + minCost[i - 2])
              );
        }

        return minCost[n];
      }

    }

    // --- #20 Climbing Stairs (70) | source: DSA/java/leetcode/easy/ClimbingStairs.java ---
    /**
     * Created by nikoo28 on 10/19/19 3:24 PM
     */

    static class ClimbingStairs {

      public int climbStairs(int n) {

        if (n == 1) return 1;

        int[] dp = new int[n + 1];
        dp[1] = 1;
        dp[2] = 2;

        for (int i = 3; i <= n; i++) {
          dp[i] = dp[i - 1] + dp[i - 2];
        }

        return dp[n];
      }

    }

    // --- #45 House Robber (198) | source: DSA/java/leetcode/medium/HouseRobber.java ---
    static class HouseRobber {

      int rob(int[] nums) {

        // If only 1 element, just return it
        if (nums.length < 2)
          return nums[0];

        // Create array to store the maximum loot at each index
        int[] dp = new int[nums.length];

        // Memoize maximum loots at first 2 indexes
        dp[0] = nums[0];
        dp[1] = Math.max(nums[0], nums[1]);

        // Use them to fill complete array
        for (int i = 2; i < nums.length; i++) {

          // Core logic
          dp[i] = Math.max(dp[i - 2] + nums[i], dp[i - 1]);
        }

        return dp[nums.length - 1];
      }

    }

    // --- #46 House Robber II (213) | source: DSA/java/leetcode/medium/HouseRobberII.java ---
    static class HouseRobberII {

      int rob(int[] nums) {

        if (nums.length < 2)
          return nums[0];

        // Create 2 new arrays
        int[] skipLastHouse = new int[nums.length - 1];
        int[] skipFirstHouse = new int[nums.length - 1];

        for (int i = 0; i < nums.length - 1; i++) {
          skipLastHouse[i] = nums[i];
          skipFirstHouse[i] = nums[i + 1];
        }

        // Get the loot from both the possibilities
        int lootSkippingLast = robHelper(skipLastHouse);
        int lootSkippingFirst = robHelper(skipFirstHouse);

        // Return the maximum of 2 loots
        return Math.max(lootSkippingLast, lootSkippingFirst);
      }

      private int robHelper(int[] nums) {

        if (nums.length < 2)
          return nums[0];

        int[] dp = new int[nums.length];

        dp[0] = nums[0];
        dp[1] = Math.max(nums[0], nums[1]);

        for (int i = 2; i < nums.length; i++) {
          dp[i] = Math.max(dp[i - 2] + nums[i], dp[i - 1]);
        }

        return dp[nums.length - 1];
      }

    }

    // --- #54 Coin Change (322) | source: DSA/java/leetcode/medium/CoinChange.java ---
    static class CoinChange {

      int coinChange(int[] coins, int amount) {

        // Check edge case
        if (amount < 1) return 0;

        // Create DP array
        int[] minCoinsDP = new int[amount + 1];

        for (int i = 1; i <= amount; i++) {

          minCoinsDP[i] = Integer.MAX_VALUE;

          // Try each coin
          for (int coin : coins) {
            if (coin <= i && minCoinsDP[i - coin] != Integer.MAX_VALUE)
              minCoinsDP[i] = Math.min(minCoinsDP[i], 1 + minCoinsDP[i - coin]);
          }
        }

        return minCoinsDP[amount] == Integer.MAX_VALUE ? -1 : minCoinsDP[amount];
      }

    }

    // --- #78 Longest Common Subsequence (1143) | source: DSA/java/leetcode/medium/LongestCommonSubsequence.java ---
    static class LongestCommonSubsequence {

      int longestCommonSubsequence(String text1, String text2) {
        // Construct dp matrix
        int[][] dp = new int[text1.length() + 1][text2.length() + 1];

        // Iterate over each cell and update values
        for (int i = 1; i <= text1.length(); i++)

          for (int j = 1; j <= text2.length(); j++)

            if (text1.charAt(i - 1) == text2.charAt(j - 1))
              dp[i][j] = 1 + dp[i - 1][j - 1];
            else
              dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);

        // Return the value in last cell
        return dp[text1.length()][text2.length()];
      }

    }

    // --- #83 Edit Distance (72) | source: DSA/java/leetcode/medium/EditDistance.java ---
    static class EditDistance {

      int minDistance(String word1, String word2) {

        int m = word1.length();
        int n = word2.length();

        // dp[i][j] := min operations to convert word1 to word2
        int[][] costDP = new int[m + 1][n + 1];

        // Initialize DP matrix
        for (int i = 1; i <= m; ++i) costDP[i][0] = i;
        for (int j = 1; j <= n; ++j) costDP[0][j] = j;

        for (int i = 1; i <= m; ++i)
          for (int j = 1; j <= n; ++j)

            //same characters
            if (word1.charAt(i - 1) == word2.charAt(j - 1))
              // Copy from top left
              costDP[i][j] = costDP[i - 1][j - 1];
            else {
              // Get minimum of all 3 neighbors
              int topLeft = costDP[i - 1][j - 1];
              int top = costDP[i - 1][j];
              int left = costDP[i][j - 1];
              costDP[i][j] = Math.min(topLeft, Math.min(top, left)) + 1;
            }

        return costDP[m][n];
      }

    }

    // --- #38 Triangle (120) | source: DSA/java/leetcode/medium/Triangle.java ---
    static class Triangle {

      int minimumTotal(List<List<Integer>> triangle) {

        int height = triangle.size();
        int[][] dp = new int[height + 1][height + 1];

        for (int level = height - 1; level >= 0; level--) {

          for (int i = 0; i <= level; i++) {

            // Add the minimum amongst 2 adjacent elements
            // from bottom level
            dp[level][i] = triangle.get(level).get(i)
                + Math.min(
                    dp[level + 1][i], dp[level + 1][i + 1]);
          }

        }

        return dp[0][0];
      }

    }

    // --- #100 Longest Increasing Subsequence (300) | source: DSA/java/leetcode/medium/LongestIncreasingSubsequence.java ---
    static class LongestIncreasingSubsequence {

      int lengthOfLIS(int[] nums) {

        int[] T = new int[nums.length];

        // Start main pointer
        for (int i = 1; i < nums.length; i++)

          // Start second pointer
          for (int j = 0; j < i; j++)
            if (nums[i] > nums[j])
              if (T[j] + 1 > T[i])
                T[i] = T[j] + 1;

        // find the max value
        int maxIndex = 0;
        for (int i = 0; i < T.length; i++)
          if (T[i] > T[maxIndex])
            maxIndex = i;

        return T[maxIndex] + 1;
      }
    }

    // --- #107 Decode Ways (91) | source: DSA/java/leetcode/medium/DecodeWays.java ---
    static class DecodeWays {

      int numDecodings(String s) {
        int n = s.length();
        int[] dp = new int[n + 1];
        dp[0] = 1;
        dp[1] = s.charAt(0) == '0' ? 0 : 1;

        for (int i = 2; i <= n; i++) {
          int oneDigit = Integer.valueOf(s.substring(i - 1, i));
          int twoDigits = Integer.valueOf(s.substring(i - 2, i));

          if (oneDigit >= 1)
            dp[i] += dp[i - 1];

          if (twoDigits >= 10 && twoDigits <= 26)
            dp[i] += dp[i - 2];
        }

        return dp[n];
      }

    }

    // --- #132 Unique Paths (62) | source: DSA/java/leetcode/medium/UniquePaths.java ---
    static class UniquePaths {

      int uniquePaths(int m, int n) {
        int[][] grid = new int[m][n];

        // Iterate over the grid
        for (int i = 0; i < m; i++)

          for (int j = 0; j < n; j++) {

            // If we are at the first row or first column,
            // there is only one way to reach that cell
            if (i == 0 || j == 0)
              grid[i][j] = 1;
            else
              // Memoize the number of ways to reach that cell
              grid[i][j] = grid[i][j - 1] + grid[i - 1][j];
          }

        // Return the number of ways to reach the last cell
        return grid[m - 1][n - 1];
      }

    }

    // --- #136 Word Break (139) | source: DSA/java/leetcode/medium/WordBreak.java ---
    static class WordBreak {

      boolean wordBreak(String s, List<String> wordDict) {

        // Convert the dictionary to a set for O(1) lookups
        Set<String> wordSet = new HashSet<>(wordDict);

        // Find the maximum word length in the dictionary
        int maxLen = 0;
        for (String word : wordDict) {
          maxLen = Math.max(maxLen, word.length());
        }

        int n = s.length();
        // dp[i] states if the substring s[0..i] can be segmented
        boolean[] dp = new boolean[n + 1];

        // Base case: empty string is valid
        dp[0] = true;

        for (int i = 1; i <= n; i++)

          // Check prefixes of length up to maxLen
          for (int j = i - 1; j >= Math.max(0, i - maxLen); j--)
            if (dp[j] && wordSet.contains(s.substring(j, i))) {
              dp[i] = true;
              break; // No need to check further prefixes
            }

        return dp[n];
      }

    }

    // --- #146 Maximal Square (221) | source: DSA/java/leetcode/medium/MaximalSquare.java ---
    static class MaximalSquare {

      int maximalSquare(char[][] matrix) {

        int rows = matrix.length;
        int cols = matrix[0].length;
        int[][] dp = new int[rows][cols];
        int maxSide = 0;

        // Fill the dp table
        for (int i = 0; i < rows; i++) {
          for (int j = 0; j < cols; j++) {
            if (matrix[i][j] == '1') {

              // Special handling for the first row and first column
              if (i == 0 || j == 0)
                dp[i][j] = 1;
              else
                // For others, dp[i][j] is the minimum of the three neighbors
                dp[i][j] = 1 +
                    Math.min(Math.min(dp[i-1][j], dp[i][j-1]), dp[i-1][j-1]);

              maxSide = Math.max(maxSide, dp[i][j]);
            }
          }
        }

        // Return the area of the largest square
        return maxSide * maxSide;
      }

    }

    // --- #125 Target Sum (494) | source: DSA/java/leetcode/medium/TargetSum.java ---
    static class TargetSum {

      int findTargetSumWays(int[] nums, int target) {

        // Base case: we start with the sum 0 and one way to achieve it.
        Map<Integer, Integer> dp = new HashMap<>();
        dp.put(0, 1);

        for (int num : nums) {
          // Temporary map to store new dp states for the current iteration
          Map<Integer, Integer> nextDp = new HashMap<>();

          // For every possible sum in dp, add and subtract the current number
          for (int sum : dp.keySet()) {
            int count = dp.get(sum);

            // Add current number to sum
            nextDp.put(sum + num,
                nextDp.getOrDefault(sum + num, 0) + count);

            // Subtract current number from sum
            nextDp.put(sum - num,
                nextDp.getOrDefault(sum - num, 0) + count);
          }

          // Move to the next iteration by updating dp with the new states
          dp = nextDp;
        }

        return dp.getOrDefault(target, 0);
      }

    }
    // ===== End of playlist solutions =====
}
