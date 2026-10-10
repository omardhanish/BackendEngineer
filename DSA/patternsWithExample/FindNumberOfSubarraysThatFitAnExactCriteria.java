package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.HashMap;
import java.util.Map;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #150 Subarray Sum Equals K (560), #147 Contiguous Array (525)

public class FindNumberOfSubarraysThatFitAnExactCriteria {

    // Example: Subarray Sum Equals K (LeetCode 560)
    // arr = [1, 2, 1, 2, 1], k = 3
    // curr = running prefix sum. A subarray ending here sums to k when an earlier prefix == curr - k.
    // Expected: 4  ([1,2], [2,1], [1,2], [2,1])

    public static void main(String[] args) {
        int[] arr = {1, 2, 1, 2, 1};
        System.out.println("Count = " + new FindNumberOfSubarraysThatFitAnExactCriteria().fn(arr, 3)); // 4
    }

    public int fn(int[] arr, int k) {
        Map<Integer, Integer> counts = new HashMap<>();
        counts.put(0, 1);
        int ans = 0, curr = 0;

        for (int num: arr) {
            // do logic to change curr
            curr += num;
            int found = counts.getOrDefault(curr - k, 0);
            ans += counts.getOrDefault(curr - k, 0);
            counts.put(curr, counts.getOrDefault(curr, 0) + 1);
            System.out.println("  num=" + num + " curr=" + curr + " need prefix " + (curr - k)
                    + " seen " + found + "x -> ans=" + ans + "  counts " + counts);
        }

        return ans;
    }

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #150 Subarray Sum Equals K (560) | source: DSA/java/leetcode/medium/SubArraySumEqualsK.java ---
    /**
     * Created by nikoo28 on 2019-09-08 20:33
     */

    static class SubArraySumEqualsK {

      int subarraySum(int[] nums, int k) {

        Map<Integer, Integer> sumCountMap = new HashMap<>();
        sumCountMap.put(0, 1);

        int result = 0;
        int prefixSum = 0;

        for (int num : nums) {
          prefixSum += num;
          if (sumCountMap.containsKey(prefixSum - k)) {
            result += sumCountMap.get(prefixSum - k);
          }

          sumCountMap.put(prefixSum,
              sumCountMap.getOrDefault(prefixSum, 0) + 1);
        }

        return result;
      }

    }

    // --- #147 Contiguous Array (525) | source: DSA/java/leetcode/medium/ContiguousArray.java ---
    static class ContiguousArray {

      int findMaxLength(int[] nums) {

        if (nums == null || nums.length == 0) { // Base Case
          return 0;
        }

        // Converting all 0 to -1
        for (int i = 0; i < nums.length; i++)
          if (nums[i] == 0) nums[i] = -1;

        int sum = 0; // current
        int maxLength = 0; // final-ans

        Map<Integer, Integer> map = new HashMap<>();
        map.put(0, -1); // put sentinel value

        for (int i = 0; i < nums.length; i++) {
          sum += nums[i];

          if (map.containsKey(sum)) {
            // if present, update length
            int last = map.get(sum);
            maxLength = Math.max(maxLength, i - last);
          } else
            map.put(sum, i);

        }

        return maxLength;
      }

    }
    // ===== End of playlist solutions =====
}
