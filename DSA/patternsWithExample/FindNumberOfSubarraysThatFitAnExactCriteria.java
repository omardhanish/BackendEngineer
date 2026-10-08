package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.HashMap;
import java.util.Map;

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

}
