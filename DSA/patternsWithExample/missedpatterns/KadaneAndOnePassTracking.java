package patternsWithExample.missedpatterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.Arrays;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #2 Maximum Sub-Array Sum (Kadane's Algorithm) (53), #75 Maximum Product Sub-array (152), #55 Best Time To Buy & Sell Stock 1 (121), #165 Best Time To Buy & Sell Stock 2 (122), #112 Max Consecutive Ones (485), #56 Majority Element (169, Boyer-Moore voting)

public class KadaneAndOnePassTracking {

    // Pattern: One pass, keeping a running best (current streak / min so far / candidate) instead of checking every subarray.

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #2 Maximum Sub-Array Sum (Kadane's Algorithm) (53) | source: DSA/java/leetcode/easy/MaximumSubarray.java ---
    /**
     * Created by nikoo28 on 2019-10-05 18:20
     */

    static class MaximumSubarray {

      public int maxSubArray(int[] nums) {

        int max_so_far = nums[0];
        int curr_max = nums[0];

        for (int i = 1; i < nums.length; i++) {
          curr_max = Math.max(nums[i], nums[i] + curr_max);
          max_so_far = Math.max(curr_max, max_so_far);
        }

        return max_so_far;
      }

    }

    // --- #75 Maximum Product Sub-array (152) | source: DSA/java/leetcode/medium/MaximumProductSubarray.java ---
    static class MaximumProductSubarray {

      int maxProduct(int[] nums) {

        int n = nums.length;
        long leftProduct = 1;
        long rightProduct = 1;
        long ans = nums[0];

        for (int i = 0; i < n; i++) {

          //if any of leftProduct or rightProduct become 0 then update it to 1
          leftProduct = (leftProduct == 0 || leftProduct < Integer.MIN_VALUE) ? 1 : leftProduct;
          rightProduct = (rightProduct == 0 || rightProduct < Integer.MIN_VALUE) ? 1 : rightProduct;

          //prefix product
          leftProduct *= nums[i];

          //suffix product
          rightProduct *= nums[n - 1 - i];

          ans = Math.max(ans, Math.max(leftProduct, rightProduct));
        }

        return (int) ans;
      }

    }

    // --- #55 Best Time To Buy & Sell Stock 1 (121) | source: DSA/java/leetcode/easy/BestTimeToBuyAndSellAStock.java ---
    /**
     * Created by nikoo28 on 12/19/17 1:26 AM
     */

    static class BestTimeToBuyAndSellAStock {

      int maxProfit(int[] prices) {

        // at the beginning the minimum price is the first price
        int buy_price = prices[0];

        // at the beginning the minimum  profit is zero
        int profit = 0;

        for (int i = 1; i < prices.length; i++) {

          // if the current price is less update the buy_price
          if (prices[i] < buy_price) {
            buy_price = prices[i];
          }
          else {
            // else check if we can get a better profit
            int current_profit = prices[i] - buy_price;
            profit = Math.max(current_profit, profit);
          }
        }

        return profit;
      }

    }

    // --- #165 Best Time To Buy & Sell Stock 2 (122) | source: DSA/java/leetcode/easy/BestTimeToBuyAndSellAStockII.java ---
    /**
     * Created by nikoo28 on 12/17/17 2:58 PM
     */

    static class BestTimeToBuyAndSellAStockII {

      public int maxProfit(int[] prices) {

        if (prices.length < 2) return 0;

        int buyingPrice = prices[0];
        int profit = 0;

        for (int i = 1; i < prices.length; i++) {

          if (prices[i] < buyingPrice) {
            buyingPrice = prices[i];
            continue;
          }

          profit += prices[i] - buyingPrice;
          buyingPrice = prices[i];
        }

        return profit;
      }

    }

    // --- #112 Max Consecutive Ones (485) | source: DSA/java/leetcode/easy/MaxConsecutiveOnes.java ---
    static class MaxConsecutiveOnes {

      int findMaxConsecutiveOnes(int[] nums) {
        int max = 0;
        int count = 0;

        // Iterate through all the elements
        // and keep a track of the maximum 1s
        for (int num : nums) {
          if (num == 1) {
            count++;
            max = Math.max(max, count);
          } else {
            count = 0;
          }
        }

        return max;
      }

    }

    // --- #56 Majority Element (169, Boyer-Moore voting) | source: DSA/java/leetcode/easy/MajorityElement.java ---
    /**
     * Created by nikoo28 on 12/17/17 3:14 PM
     */

    static class MajorityElement {

      int majorityElement(int[] num) {

        int majority = num[0], votes = 1;

        for (int i = 1; i < num.length; i++) {

          if (votes == 0) {
            votes++;
            majority = num[i];
          } else if (majority == num[i]) {
            votes++;
          } else
            votes--;

        }
        return majority;
      }

    }
    // ===== End of playlist solutions =====

}
