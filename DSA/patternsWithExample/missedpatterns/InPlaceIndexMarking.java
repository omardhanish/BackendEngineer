package patternsWithExample.missedpatterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #9 Find all Duplicates in an Array (442), #22 Find the Disappearing Numbers (448), #162 First Missing Positive (41)

public class InPlaceIndexMarking {

    // Pattern: Values are in 1..n, so use the array itself as a hash: mark index (value - 1) by negating it.

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #9 Find all Duplicates in an Array (442) | source: DSA/java/leetcode/medium/FindAllDuplicatesInAnArray.java ---
    /**
     * Created by nikoo28 on 2/6/21 6:50 PM
     */

    static class FindAllDuplicatesInAnArray {

      public List<Integer> findDuplicatesConstantSpace(int[] nums) {

        List<Integer> resultSet = new ArrayList<>();

        for (int i = 0; i < nums.length; i++) {
          // Get the index, the element corresponds to
          int index = Math.abs(nums[i]) - 1;

          // If the number is already negative, it means we are 
          // encountering it twice
          if (nums[index] < 0)
            resultSet.add(index + 1);

          // Flip the number at the index to negative
          nums[index] = nums[index] * -1;
        }

        return resultSet;
      }

      public List<Integer> findDuplicatesLinearSpace(int[] nums) {

        List<Integer> resultSet = new ArrayList<>();

        // Set to store unique numbers
        Set<Integer> uniqueSet = new HashSet<>();
        for (int num : nums) {

          // If already present, then it is a duplicate
          if (uniqueSet.contains(num))
            resultSet.add(num);

          // Add the number to the set
          uniqueSet.add(num);
        }

        return resultSet;
      }

    }

    // --- #22 Find the Disappearing Numbers (448) | source: DSA/java/leetcode/easy/FindAllNumbersDisappearedInAnArray.java ---
    static class FindAllNumbersDisappearedInAnArray {

      public List<Integer> findDisappearedNumbers(int[] nums) {

        List<Integer> result = new ArrayList<>();

        for (int i = 0; i < nums.length; i++) {
          int idx = Math.abs(nums[i]) - 1;
          if (nums[idx] < 0)
            continue;

          nums[idx] *= -1;
        }

        for (int i = 0; i < nums.length; i++) {
          if (nums[i] > 0)
            result.add(i + 1);
        }

        return result;
      }

    }

    // --- #162 First Missing Positive (41) | source: DSA/java/leetcode/hard/FirstMissingPositive.java ---
    static class FirstMissingPositive {

      int firstMissingPositive(int[] nums) {

        // Loop 1: clean the array
        for (int i = 0; i < nums.length; i++) {
          if (nums[i] <= 0 || nums[i] > nums.length) {
            nums[i] = nums.length + 1;
          }
        }

        // Loop 2: Mark the presence
        for (int i = 0; i < nums.length; i++) {
          int num = Math.abs(nums[i]);
          if (num > nums.length) continue;

          if (nums[num - 1] > 0) {
            nums[num - 1] = -nums[num - 1];
          }
        }

        // Loop 3: Find the first missing positive
        for (int i = 0; i < nums.length; i++) {
          if (nums[i] > 0) {
            return i + 1;
          }
        }

        return nums.length + 1;
      }

    }
    // ===== End of playlist solutions =====

}
