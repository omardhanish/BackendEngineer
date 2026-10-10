package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.Arrays;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #13 First and Last Position (34), the `findLeftBound` part

public class BinarySearchDuplicateElementsLeftMostInsertionPoint {

    // Example: [1, 2, 2, 2, 3], target 2 -> left-most index of 2 = 1

    public static void main(String[] args) {
        int[] arr = {1, 2, 2, 2, 3};
        System.out.println("arr = " + Arrays.toString(arr) + ", target = 2");
        System.out.println("Left-most insertion point = "
                + new BinarySearchDuplicateElementsLeftMostInsertionPoint().fn(arr, 2)); // 1
    }

    public int fn(int[] arr, int target) {
        int left = 0;
        int right = arr.length;
        while (left < right) {
            int mid = left + (right - left) / 2;
            System.out.println("  left=" + left + " right=" + right + " mid=" + mid + " arr[mid]=" + arr[mid]
                    + (arr[mid] >= target ? "  >= target -> right = mid" : "  < target -> left = mid + 1"));
            if (arr[mid] >= target) {
                right = mid;
            } else {
                left = mid + 1;
            }
        }

        return left;
    }

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #13 First and Last Position (34), the `findLeftBound` part | source: DSA/java/leetcode/medium/FirstAndLastPositionOfElementInSortedArray.java ---
    static class FirstAndLastPositionOfElementInSortedArray {

      public int[] searchRange(int[] nums, int target) {

        int left = findLeftBound(nums, target);
        int right = findRightBound(nums, target);

        return new int[]{left, right};
      }

      private int findLeftBound(int[] nums, int target) {
        int index = -1, low = 0, high = nums.length - 1;

        // Standard binary search
        while (low <= high) {
          int mid = low + (high - low) / 2;

          if (nums[mid] == target) {
            index = mid;
            high = mid - 1; // Look in the left sub-array
          }
          else if (nums[mid] < target)
            low = mid + 1;
          else
            high = mid - 1;
        }

        return index;
      }

      private int findRightBound(int[] nums, int target) {
        int index = -1, low = 0, high = nums.length - 1;

        // Standard binary search
        while (low <= high) {
          int mid = low + (high - low) / 2;

          if (nums[mid] == target) {
            index = mid;
            low = mid + 1; // Look in the right sub-array
          }
          else if (nums[mid] < target)
            low = mid + 1;
          else
            high = mid - 1;
        }

        return index;
      }

    }
    // ===== End of playlist solutions =====
}
