package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.Arrays;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #128 Find Pivot Index (724), #151 Range Sum Query 2D (304), #42 Product of Array Except Self (238), #131 Left and Right Sum Differences (2574), #154 Trapping Rain Water (42)

public class BuildAprefixSum {

    // Example: [1, 6, 3, 2, 7, 2] -> [1, 7, 10, 12, 19, 21]
    // prefix[i] = sum of arr[0..i], so sum(i..j) = prefix[j] - prefix[i - 1]

    public static void main(String[] args) {
        int[] arr = {1, 6, 3, 2, 7, 2};
        System.out.println("arr    = " + Arrays.toString(arr));
        int[] prefix = new BuildAprefixSum().fn(arr);
        System.out.println("prefix = " + Arrays.toString(prefix));
        System.out.println("sum(1..3) = prefix[3] - prefix[0] = " + (prefix[3] - prefix[0])); // 11
    }

    public int[] fn(int[] arr) {
        int[] prefix = new int[arr.length];
        prefix[0] = arr[0];
        System.out.println("  prefix[0] = " + prefix[0]);

        for (int i = 1; i < arr.length; i++) {
            prefix[i] = prefix[i - 1] + arr[i];
            System.out.println("  prefix[" + i + "] = " + prefix[i - 1] + " + " + arr[i] + " = " + prefix[i]);
        }

        return prefix;
    }

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #128 Find Pivot Index (724) | source: DSA/java/leetcode/easy/FindPivotIndex.java ---
    static class FindPivotIndex {

      int pivotIndex(int[] nums) {

        // Calculate the sum of the array
        int rightSum = 0;
        for (int num : nums) {
          rightSum += num;
        }

        int leftSum = 0;

        // Iterate through the array
        for (int i = 0; i < nums.length; i++) {

          // Update the right sum
          rightSum -= nums[i];

          // Check if the left sum is equal to the right sum
          if (leftSum == rightSum) {
            return i;
          }

          // Update the left sum
          leftSum += nums[i];
        }

        // Return -1 if no pivot index is found
        return -1;
      }

    }

    // --- #151 Range Sum Query 2D (304) | source: DSA/java/leetcode/medium/RangeSumQuery2D.java ---
    static class RangeSumQuery2D {

      private int[][] prefix;

      public RangeSumQuery2D(int[][] matrix) {
        if (matrix == null || matrix.length == 0 || matrix[0].length == 0) {
          return;
        }

        int m = matrix.length;
        int n = matrix[0].length;

        prefix = new int[m][n];

        for (int i = 0; i < m; i++) {
          for (int j = 0; j < n; j++) {
            int top = (i > 0) ? prefix[i - 1][j] : 0;
            int left = (j > 0) ? prefix[i][j - 1] : 0;
            int topLeft = (i > 0 && j > 0) ? prefix[i - 1][j - 1] : 0;

            prefix[i][j] = matrix[i][j] + top + left - topLeft;
          }
        }
      }

      public int sumRegion(int row1, int col1, int row2, int col2) {
        int total = prefix[row2][col2];
        int top = (row1 > 0) ? prefix[row1 - 1][col2] : 0;
        int left = (col1 > 0) ? prefix[row2][col1 - 1] : 0;
        int topLeft = (row1 > 0 && col1 > 0) ? prefix[row1 - 1][col1 - 1] : 0;

        return total - top - left + topLeft;
      }

    }

    // --- #42 Product of Array Except Self (238) | source: DSA/java/leetcode/medium/ProductOfArrayExceptSelf.java ---
    /**
     * Created by nikoo28 on 7/12/19 1:23 AM
     */

    static class ProductOfArrayExceptSelf {

      public int[] productExceptSelf(int[] nums) {

        // Array to store all left multiplication
        int[] left = new int[nums.length];

        // Array to store all right multiplication
        int[] right = new int[nums.length];

        left[0] = 1;
        for (int i = 1; i < nums.length; i++) {
          left[i] = left[i - 1] * nums[i - 1];
        }

        right[nums.length - 1] = 1;
        for (int i = nums.length - 2; i > -1; i--) {
          right[i] = right[i + 1] * nums[i + 1];
        }

        int[] ans = new int[nums.length];
        for (int i = 0; i < nums.length; i++) {
          ans[i] = left[i] * right[i];
        }

        return ans;
      }

    }

    // --- #131 Left and Right Sum Differences (2574) | source: DSA/java/leetcode/easy/LeftAndRightSumDifferences.java ---
    static class LeftAndRightSumDifferences {

      int[] leftRightDifference(int[] nums) {

        int rightSum = 0;
        int leftSum = 0;

        // Calculate the total right sum
        for (int num : nums) {
          rightSum += num;
        }

        // Iterate through the array
        for (int i = 0; i < nums.length; i++) {
          // Get the value at index i
          int val = nums[i];

          // Update the right sum
          rightSum -= val;

          // Find the difference
          nums[i] = Math.abs(leftSum - rightSum);

          // Update the left sum
          leftSum += val;
        }

        return nums;
      }

    }

    // --- #154 Trapping Rain Water (42) | source: DSA/java/leetcode/hard/TrappingRainWater.java ---
    /**
     * Created by nikoo28 on 7/8/19 12:56 AM
     */

    static class TrappingRainWater {

      public int trap(int[] height) {

        int n = height.length;
        if (n == 0) return 0;

        int[] leftMax = new int[n];
        int[] rightMax = new int[n];
        leftMax[0] = height[0];
        rightMax[n - 1] = height[n - 1];

        for (int i = 1; i < n; i++)
          leftMax[i] = Math.max(leftMax[i - 1], height[i]);
        for (int i = n - 2; i >= 0; i--)
          rightMax[i] = Math.max(rightMax[i + 1], height[i]);

        int totalWater = 0;
        for (int i = 0; i < n; i++)
          totalWater += Math.min(leftMax[i], rightMax[i]) - height[i];

        return totalWater;
      }
    }
    // ===== End of playlist solutions =====
}
