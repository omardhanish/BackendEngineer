package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.Arrays;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #19 Search Insert Position (35), #7 Search in Rotated Sorted Array (33), #72 Search a 2D Matrix (74), #124 Find Min in Rotated Sorted Array (153), #143 Valid Perfect Square (367), #155 Median of Two Sorted Arrays (4)

public class BinarySearch {

    // Example: find 7 in [1, 3, 5, 7, 9, 11] -> index 3
    //          find 6 (missing)              -> insertion point 3

    public static void main(String[] args) {
        int[] arr = {1, 3, 5, 7, 9, 11};
        System.out.println("arr = " + Arrays.toString(arr));
        System.out.println("Result for 7 = " + new BinarySearch().fn(arr, 7)); // 3
        System.out.println();
        System.out.println("Result for 6 = " + new BinarySearch().fn(arr, 6)); // 3
    }

    public int fn(int[] arr, int target) {
        int left = 0;
        int right = arr.length - 1;
        System.out.println("target = " + target);
        while (left <= right) {
            int mid = left + (right - left) / 2;
            System.out.println("  left=" + left + " right=" + right + " mid=" + mid + " arr[mid]=" + arr[mid]);
            if (arr[mid] == target) {
                // do something
                System.out.println("  found at " + mid);
                return mid;
            }
            if (arr[mid] > target) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }

        // left is the insertion point
        System.out.println("  not found, insertion point = " + left);
        return left;
    }

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #19 Search Insert Position (35) | source: DSA/java/leetcode/easy/SearchInsertPosition.java ---
    static class SearchInsertPosition {

      public int searchInsert(int[] nums, int target) {

        int low = 0;
        int high = nums.length - 1;

        while (low <= high) {
          int mid = low + (high - low) / 2;

          if (nums[mid] == target) {
            return mid;
          } else if (nums[mid] > target) {
            high = mid - 1;
          } else {
            low = mid + 1;
          }
        }

        return low;
      }

    }

    // --- #7 Search in Rotated Sorted Array (33) | source: DSA/java/leetcode/medium/SearchInRotatedSortedArray.java ---
    /**
     * Created by nikoo28 on 2019-09-14 17:38
     */

    static class SearchInRotatedSortedArray {

      private int findRotationIndex(int[] nums) {

        int left = 0;
        int right = nums.length - 1;
        while (left <= right) {

          int mid = (left + right) / 2;
          if (mid == right) {
            return mid;
          }
          if (nums[mid + 1] < nums[mid])
            return mid;

          if (nums[left] <= nums[mid]) {
            left = mid + 1;
          } else
            right = mid - 1;
        }

        return -1;
      }

      private int binarySearch(int[] arr, int left, int right, int target) {

        while (left <= right) {
          int mid = (left + right) / 2;
          if (arr[mid] == target)
            return mid;

          if (arr[mid] < target) {
            left = mid + 1;
          } else
            right = mid - 1;
        }

        return -1;
      }

      private int modifiedBinarySearch(int[] arr, int target, int left, int right) {

        // Not found
        if (left > right)
          return -1;

        // Avoid overflow, same as (left + right)/2
        int mid = left + ((right - left) / 2);
        if (arr[mid] == target)
          return mid; // Found

        // If left half is sorted
        if (arr[mid] >= arr[left]) {

          // If key is in left half
          if (arr[left] <= target && target <= arr[mid])
            return modifiedBinarySearch(arr, target, left, mid - 1);
          else
            return modifiedBinarySearch(arr, target, mid + 1, right);

        } else {
          // If right half is sorted

          // If key is in right half
          if (arr[mid] <= target && target <= arr[right])
            return modifiedBinarySearch(arr, target, mid + 1, right);
          else
            return modifiedBinarySearch(arr, target, left, mid - 1);
        }
      }

      /**
       * Search by first finding the rotation index. The index about which the array has been rotated.
       * Then compare the target value to do a simple binary search in the left sub-array or right sub-array.
       */
      public int search(int[] nums, int target) {

        int rotationIndex = findRotationIndex(nums);

        if (rotationIndex == -1 || rotationIndex == nums.length - 1)
          return binarySearch(nums, 0, nums.length - 1, target);

        if (nums[0] <= target) {
          return binarySearch(nums, 0, rotationIndex, target);
        } else
          return binarySearch(nums, rotationIndex + 1, nums.length - 1, target);
      }

      /**
       * Modified version of binary search. One sub-array will always be sorted. Based on that we can always discard one
       * half of the array
       */
      public int alternateSearch(int[] nums, int target) {
        return modifiedBinarySearch(nums, target, 0, nums.length - 1);
      }
    }

    // --- #72 Search a 2D Matrix (74) | source: DSA/java/leetcode/medium/SearchA2DMatrix.java ---
    static class SearchA2DMatrix {

      boolean searchMatrix(int[][] matrix, int target) {

        int rowIdx = searchPotentialRow(matrix, target);
        if (rowIdx != -1)
          return binarySearchOverRow(rowIdx, matrix, target);
        return false;
      }

      private int searchPotentialRow(int[][] matrix, int target) {
        int low = 0;
        int high = matrix.length - 1;
        int idx = matrix[0].length - 1;
        while (low <= high) {
          int mid = low + (high - low)/2;

          if (matrix[mid][0] <= target && target <= matrix[mid][idx]) {
            return mid;
          }
          else if (matrix[mid][0] < target) low = mid + 1;
          else if (matrix[mid][0] > target) high = mid - 1;
        }
        return -1;
      }

      private boolean binarySearchOverRow(int rowIdx, int[][] matrix, int target) {
        int low = 0;
        int high = matrix[rowIdx].length - 1;
        while (low <= high) {
          int mid = low + (high - low)/2;

          if (matrix[rowIdx][mid] == target) {
            return true;
          }
          else if (matrix[rowIdx][mid] > target) high = mid - 1;
          else low = mid + 1;
        }
        return false;
      }

    }

    // --- #124 Find Min in Rotated Sorted Array (153) | source: DSA/java/leetcode/medium/FindMinimumInRotatedSortedArray.java ---
    static class FindMinimumInRotatedSortedArray {

      int findMin(int[] nums) {

        int left = 0;
        int right = nums.length - 1;

        while (left < right) {

          int mid = left + (right - left) / 2;

          // Check if the middle element is greater
          // than the right element
          if (nums[mid] > nums[right]) {
            left = mid + 1;
          } else {
            right = mid;
          }
        }

        return nums[left];
      }

    }

    // --- #143 Valid Perfect Square (367) | source: DSA/java/leetcode/easy/ValidPerfectSquare.java ---
    static class ValidPerfectSquare {

      boolean isPerfectSquareBinary(int num) {
        if (num < 0) return false; // Negative numbers cannot be perfect squares
        if (num == 0 || num == 1) return true; // 0 and 1 are perfect squares

        long left = 1, right = num;

        while (left <= right) {
          long mid = left + (right - left) / 2;
          long square = mid * mid;

          if (square == num) {
            return true; // Found the perfect square
          } else if (square < num) {
            left = mid + 1; // Search in the right half
          } else {
            right = mid - 1; // Search in the left half
          }
        }

        return false; // No perfect square found
      }

      boolean isPerfectSquareMaths(int num) {
        int oddNumber = 1;
        int sum = 1;
        while (sum <= num) {
          // Found the perfect square
          if (sum == num) {
            return true;
          }

          oddNumber += 2; // Next odd number
          sum += oddNumber;
        }

        return false;
      }

    }

    // --- #155 Median of Two Sorted Arrays (4) | source: DSA/java/leetcode/hard/MedianOfTwoSortedArrays.java ---
    /**
     * Created by nikoo28 on 2019-08-18 23:25
     */

    static class MedianOfTwoSortedArrays {

      public double findMedianSortedArrays(int[] nums1, int[] nums2) {

        int[] smaller = nums1.length > nums2.length ? nums2 : nums1;
        int[] larger = nums1.length > nums2.length ? nums1 : nums2;
        int totalLength = nums1.length + nums2.length;

        int low = 0, high = smaller.length;

        while (low <= high) {
          int partitionX = (low + high) / 2;
          int partitionY = (totalLength + 1) / 2 - partitionX;

          int l1 = partitionX == 0 ? Integer.MIN_VALUE : smaller[partitionX - 1];
          int r1 = partitionX == smaller.length ? Integer.MAX_VALUE : smaller[partitionX];

          int l2 = partitionY == 0 ? Integer.MIN_VALUE : larger[partitionY - 1];
          int r2 = partitionY == larger.length ? Integer.MAX_VALUE : larger[partitionY];

          if (l1 <= r2 && l2 <= r1)
            // means this is a valid partition
            if ((totalLength) % 2 == 0)
              return (Math.max(l1, l2) + Math.min(r1, r2)) / 2.0;
            else
              return Math.max(l1, l2);

          if (l1 > r2) high = partitionX - 1;
          else low = partitionX + 1;
        }

        return 0;
      }
    }
    // ===== End of playlist solutions =====
}
