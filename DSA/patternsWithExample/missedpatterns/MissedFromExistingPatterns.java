package patternsWithExample.missedpatterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.ArrayList;
import java.util.List;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #24 Range Sum of BST (938) → BinaryTreeDFSRecursive, #103 Count Complete Tree Nodes (222) → BinaryTreeDFSRecursive, #108 Reverse Only Letters (917) → TwopointersoneinputOppositeEnds, #110 Kth Missing Positive Number (1539) → BinarySearch, #87 Fibonacci Number (509) → DynamicProgrammingBottomUpTabulation, #90 Pascal's Triangle (118) → DynamicProgrammingBottomUpTabulation, #96 Maximum Length of Repeated Subarray (718) → DynamicProgrammingBottomUpTabulation, #166 Best Time To Buy & Sell Stock 3 (123, no code file here) → DynamicProgrammingBottomUpTabulation, #167 Best Time To Buy & Sell Stock 4 (188, no code file here) → DynamicProgrammingBottomUpTabulation

public class MissedFromExistingPatterns {

    // Pattern: These belong to pattern classes that already exist in patternsWithExample; the arrow shows which one.

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #24 Range Sum of BST (938) → BinaryTreeDFSRecursive | source: DSA/java/leetcode/easy/RangeSumOfBST.java ---
    static class RangeSumOfBST {

      public int rangeSumBST(TreeNode root, int low, int high) {
        if (root == null)
          return 0;

        int sum = 0;

        // Explore the left sub-tree
        if (root.val > low)
          sum += rangeSumBST(root.left, low, high);

        // If value is in range add it to sum
        if (root.val >= low && root.val <= high)
          sum += root.val;

        // Explore the right sub-tree only if required
        if (root.val < high)
          sum += rangeSumBST(root.right, low, high);

        return sum;
      }
    }

    // --- #103 Count Complete Tree Nodes (222) → BinaryTreeDFSRecursive | source: DSA/java/leetcode/easy/CountCompleteTreeNodes.java ---
    static class CountCompleteTreeNodes {

      public int countNodes(TreeNode root) {

        int leftDepth = leftDepth(root);
        int rightDepth = rightDepth(root);

        if (leftDepth == rightDepth)
          return (int) Math.pow(2, leftDepth) - 1;
        else
          return 1 + countNodes(root.left) + countNodes(root.right);
      }

      private int rightDepth(TreeNode root) {
        int dep = 0;
        while (root != null) {
          root = root.right;
          dep++;
        }
        return dep;
      }

      private int leftDepth(TreeNode root) {
        int dep = 0;
        while (root != null) {
          root = root.left;
          dep++;
        }
        return dep;
      }

    }

    // --- #108 Reverse Only Letters (917) → TwopointersoneinputOppositeEnds | source: DSA/java/leetcode/easy/ReverseOnlyLetters.java ---
    static class ReverseOnlyLetters {

      String reverseOnlyLetters(String s) {

        // Convert the string to a character array
        char[] arr = s.toCharArray();

        // Get the left and right pointers
        int left = 0;
        int right = arr.length - 1;

        // Start a loop and compare characters
        while (left < right) {

          // If left is not a letter, move right
          if (!Character.isLetter(arr[left])) left++;

          // If right is not a letter, move left
          else if (!Character.isLetter(arr[right])) right--;

          // If both are letters, swap them
          else {
            char temp = arr[left];
            arr[left++] = arr[right];
            arr[right--] = temp;
          }
        }

        // Convert the character array to a string
        return new String(arr);
      }

    }

    // --- #110 Kth Missing Positive Number (1539) → BinarySearch | source: DSA/java/leetcode/easy/KthMissingPositiveNumber.java ---
    static class KthMissingPositiveNumber {

      // Implementation using binary search with proper comments
      int findKthPositive(int[] arr, int k) {
        // Initialize the left and right pointers
        int left = 0;
        int right = arr.length;

        // Start a loop and keep moving till left is less than right
        while (left < right) {
          // Calculate the mid
          int mid = left + (right - left) / 2;

          // If the number of missing elements is less than k
          if (arr[mid] - mid - 1 < k) {
            // Move left to mid + 1
            left = mid + 1;
          } else {
            // Move right to mid
            right = mid;
          }
        }

        // Return the kth missing element
        return left + k;
      }

    }

    // --- #87 Fibonacci Number (509) → DynamicProgrammingBottomUpTabulation | source: DSA/java/leetcode/easy/FibonacciNumber.java ---
    static class FibonacciNumber {

      int fib(int n) {
        // easy base cases/edge cases
        if (n <= 1) {
          return n;
        }

        // initialize our memoization map
        // size N +1 so that we can accommodate from 0 to N
        int[] map = new int[n + 1];

        // put our base cases
        map[0] = 0;
        map[1] = 1;

        // iterate through remaining values (2...N)
        for (int i = 2; i <= n; i += 1) {
          map[i] = map[i - 1] + map[i - 2];
        }
        return map[n];
      }

    }

    // --- #90 Pascal's Triangle (118) → DynamicProgrammingBottomUpTabulation | source: DSA/java/leetcode/easy/PascalsTriangle.java ---
    /**
     * Created by nikoo28 on 10/16/19 2:51 AM
     */

    static class PascalsTriangle {

      List<List<Integer>> generate(int numRows) {

        List<List<Integer>> result = new ArrayList<>();

        if (numRows == 0) return result;

        List<Integer> firstRow = new ArrayList<>();
        firstRow.add(1);
        result.add(firstRow);

        if (numRows == 1) return result;

        for (int i = 1; i < numRows; i++) {
          List<Integer> prevRow = result.get(i - 1);

          // Start the next row
          ArrayList<Integer> row = new ArrayList<>();
          row.add(1);
          for (int j = 0; j < i - 1; j++) {
            row.add(prevRow.get(j) + prevRow.get(j + 1));
          }
          row.add(1);

          // Add this new row to final result
          result.add(row);
        }

        return result;
      }

    }

    // --- #96 Maximum Length of Repeated Subarray (718) → DynamicProgrammingBottomUpTabulation | source: DSA/java/leetcode/medium/MaximumLengthOfRepeatedSubarray.java ---
    static class MaximumLengthOfRepeatedSubarray {

      int findLength(int[] nums1, int[] nums2) {

        int[][] dp = new int[nums1.length + 1][nums2.length + 1];

        int max = 0;

        // Iterate over each position in the matrix
        for (int i = 1; i <= nums1.length; i++)
          for (int j = 1; j <= nums2.length; j++)

            // If numbers are equal
            if (nums1[i - 1] == nums2[j - 1]) {
              // Get the number from diagonally opposite
              // and add 1
              dp[i][j] = dp[i - 1][j - 1] + 1;

              max = Math.max(dp[i][j], max);
            }

        return max;
      }

    }
    // ===== End of playlist solutions =====

}
