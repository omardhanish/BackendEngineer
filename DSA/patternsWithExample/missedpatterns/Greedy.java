package patternsWithExample.missedpatterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.PriorityQueue;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #88 Jump Game (55), #93 Jump Game 2 (45), #145 Gas Station (134), #163 Candy (135), #25 Partition Labels (763), #130 Minimum Increment to Make Array Unique (945), #117 Maximum Product After K Increments (2233, greedy with a min-heap)

public class Greedy {

    // Pattern: Make the locally best choice at each step; prove it never hurts the final answer.

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #88 Jump Game (55) | source: DSA/java/leetcode/medium/JumpGame.java ---
    static class JumpGame {

      boolean canJump(int[] nums) {

        // Initially the final position is the last index
        int finalPosition = nums.length - 1;

        // Start with the second last index
        for (int idx = nums.length - 2; idx >= 0; idx--) {

          // If you can reach the final position from this index
          // update the final position flag
          if (idx + nums[idx] >= finalPosition) {
            finalPosition = idx;
          }
        }

        // If we reach the first index, then we can
        // make the jump possible
        return finalPosition == 0;
      }

    }

    // --- #93 Jump Game 2 (45) | source: DSA/java/leetcode/medium/JumpGameII.java ---
    static class JumpGameII {

      int jump(int[] nums) {

        int totalJumps = 0;

        // destination is last index
        int destination = nums.length - 1;

        int coverage = 0, lastJumpIdx = 0;

        // Base case
        if (nums.length == 1) return 0;

        // Greedy strategy: extend coverage as long as possible
        for (int i = 0; i < nums.length; i++) {

          coverage = Math.max(coverage, i + nums[i]);

          if (i == lastJumpIdx) {
            lastJumpIdx = coverage;
            totalJumps++;

            // check if we reached destination already
            if (coverage >= destination) {
              return totalJumps;
            }
          }
        }

        return totalJumps;
      }

    }

    // --- #145 Gas Station (134) | source: DSA/java/leetcode/medium/GasStation.java ---
    static class GasStation {

      int canCompleteCircuit(int[] gas, int[] cost) {
        int totalGas = 0, totalCost = 0;

        // Calculate total gas and total cost
        for (int i = 0; i < gas.length; i++) {
          totalGas += gas[i];
          totalCost += cost[i];
        }

        // If total gas is less than total cost, return -1
        if (totalGas < totalCost) {
          return -1;
        }

        int currentGas = 0, startIndex = 0;
        // Iterate through the gas stations
        for (int i = 0; i < gas.length; i++) {
          currentGas += gas[i] - cost[i];

          // If current gas is negative, reset start index and current gas
          if (currentGas < 0) {
            startIndex = i + 1;
            currentGas = 0;
          }
        }

        // Return the starting index if a valid circuit exists
        return startIndex;
      }

    }

    // --- #163 Candy (135) | source: DSA/java/leetcode/hard/Candy.java ---
    static class Candy {

      int candy(int[] ratings) {

        int n = ratings.length;
        int[] candies = new int[n];
        Arrays.fill(candies, 1);

        for (int i = 1; i < n; i++)
          if (ratings[i] > ratings[i - 1])
            candies[i] = candies[i - 1] + 1;

        for (int i = n - 2; i >= 0; i--)
          if (ratings[i] > ratings[i + 1])
            candies[i] = Math.max(candies[i], candies[i + 1] + 1);

        int totalCandies = 0;
        for (int candy : candies) {
          totalCandies += candy;
        }

        return totalCandies;
      }

    }

    // --- #25 Partition Labels (763) | source: DSA/java/leetcode/medium/PartitionLabels.java ---
    /**
     * Created by nikoo28 on 2019-07-20 22:41.
     */

    static class PartitionLabels {

      public List<Integer> partitionLabels(String str) {

        List<Integer> partitions = new ArrayList<>();

        for (int i = 0; i < str.length(); ) {

          // Get first and last index of first character
          int startIndex = i;
          int endIndex = str.lastIndexOf(str.charAt(startIndex));

          for (int s = startIndex + 1; s <= endIndex - 1; s++) {

            // Find last index of any subsequent characters
            int lastIndexOfNextChar = str.lastIndexOf(str.charAt(s));

            if (lastIndexOfNextChar > endIndex) {
              // Update endIndex if required
              endIndex = lastIndexOfNextChar;
            }
          }

          partitions.add(endIndex - startIndex + 1);
          i = endIndex + 1;
        }

        return partitions;
      }
    }

    // --- #130 Minimum Increment to Make Array Unique (945) | source: DSA/java/leetcode/medium/MinimumIncrementToMakeArrayUnique.java ---
    static class MinimumIncrementToMakeArrayUnique {

      int minIncrementForUnique(int[] nums) {

        Arrays.sort(nums);

        int moves = 0;

        // Iterate through the array
        for (int i = 1; i < nums.length; i++) {

          // If the current element is
          // less than or equal to the previous element
          if (nums[i] <= nums[i - 1]) {

            // Increment the moves by the difference
            moves += nums[i - 1] - nums[i] + 1;
            nums[i] = nums[i - 1] + 1;
          }
        }

        return moves;
      }

    }

    // --- #117 Maximum Product After K Increments (2233, greedy with a min-heap) | source: DSA/java/leetcode/medium/MaximumProductAfterKIncrements.java ---
    static class MaximumProductAfterKIncrements {

      int maximumProduct(int[] nums, int k) {

        PriorityQueue<Integer> numPQ = new PriorityQueue<>();
        int mod = 1000000007;

        // Add all elements to priority queue
        for (int num : nums)
          numPQ.offer(num);

        for (int i = 0; i < k; i++) {
          // Get the minimum element and increment by 1
          int minElement = numPQ.remove();
          minElement++;

          // Add it back to the priority queue
          numPQ.offer(minElement);
        }

        // Find the product
        long result = 1;
        while (!numPQ.isEmpty()) {
          result *= numPQ.poll();
          result %= mod;
        }

        return (int) result;
      }

    }
    // ===== End of playlist solutions =====

}
