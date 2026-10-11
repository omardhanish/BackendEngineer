package patternsWithExample.missedpatterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #4 Single non-repeating element in an array (136), #59 Missing Number (268), #153 Divide Two Integers (29, no code file here)

public class BitManipulation {

    // Pattern: XOR tricks: a ^ a = 0 and a ^ 0 = a, so pairs cancel out.

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #4 Single non-repeating element in an array (136) | source: DSA/java/leetcode/easy/SingleNumber.java ---
    /**
     * @author nikoo28 on 9/16/17
     */
    static class SingleNumber {

      public int singleNumber(int[] nums) {
        int sing = nums[0];
        for (int i = 1; i < nums.length; i++) {
          sing = sing ^ nums[i];
        }
        return sing;

      }

    }

    // --- #59 Missing Number (268) | source: DSA/java/leetcode/MissingNumber.java ---
    /**
     * Created by nikoo28 on 9/23/18 1:15 PM
     */

    static class MissingNumber {

      int missingNumber(int[] nums) {

        int allXOR = 0;

        // XOR all numbers in range [0, n]
        for (int i = 0; i <= nums.length; i++) {
          allXOR = allXOR ^ i;
        }

        // XOR all numbers in the given array
        for (int num : nums) {
          allXOR = allXOR ^ num;
        }

        // The missing number
        return allXOR;
      }

    }
    // ===== End of playlist solutions =====

}
