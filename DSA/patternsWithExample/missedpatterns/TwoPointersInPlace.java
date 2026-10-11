package patternsWithExample.missedpatterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #21 Move Zeroes (283), #65 Sort Colors (75, Dutch National Flag)

public class TwoPointersInPlace {

    // Pattern: Two or three pointers moving the same direction to rearrange an array in place.

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #21 Move Zeroes (283) | source: DSA/java/leetcode/easy/MoveZeroes.java ---
    /**
     * @author nikoo28 on 9/17/17
     */
    static class MoveZeroes {

      public void moveZeroes(int[] nums) {

        // Start with the first position
        int insertPosition = 0;

        for (int i = 0; i < nums.length; i++) {
          // FIll all non-zero numbers
          if (nums[i] != 0) {
            nums[insertPosition] = nums[i];
            insertPosition++;
          }
        }

        while (insertPosition < nums.length) {
          nums[insertPosition++] = 0;
        }
      }

    }

    // --- #65 Sort Colors (75, Dutch National Flag) | source: DSA/java/leetcode/medium/SortColors.java ---
    /**
     * Created by nikoo28 on 12/19/17 1:12 AM
     */

    static class SortColors {

      void sortColors(int[] nums) {

        int start = 0;
        int mid = 0;
        int end = nums.length - 1;

        while (mid <= end) {

          switch (nums[mid]) {
            case 0:
              // Swap with start index
              swap(nums, start, mid);
              mid++;
              start++;
              break;

            case 1:
              mid++;
              break;

            case 2:
              // Swap with end index
              swap(nums, mid, end);
              end--;
              break;
          }
        }

      }

      private void swap(int[] arr, int pos1, int pos2) {
        int temp = arr[pos1];
        arr[pos1] = arr[pos2];
        arr[pos2] = temp;
      }

    }
    // ===== End of playlist solutions =====

}
