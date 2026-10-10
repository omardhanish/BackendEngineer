package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.*;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// ⚠️ The videos for #132 Unique Paths (62), #136 Word Break (139) and #146 Maximal Square (221) explain memoization, but their code files are bottom-up

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

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

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
    // ===== End of playlist solutions =====
}
