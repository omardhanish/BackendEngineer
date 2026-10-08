package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.ArrayList;
import java.util.List;

public class Backtracking {

    // Example: Permutations of [1, 2, 3]
    // STATE    : curr = numbers picked so far
    // BASE CASE: curr has every number -> one full permutation, count it
    // Expected : 6 permutations

    public static void main(String[] args) {
        int[] nums = {1, 2, 3};
        int total = new Backtracking().backtrack(new ArrayList<>(), nums);
        System.out.println("Total permutations = " + total); // 6
    }

    public int backtrack(List<Integer> curr, int[] nums) {
        String indent = "  ".repeat(curr.size());
        if (curr.size() == nums.length) {
            // modify the answer
            System.out.println(indent + "FOUND " + curr);
            return 1;
        }

        int ans = 0;
        for (int num : nums) {
            if (curr.contains(num)) {
                continue;
            }
            // modify the current state
            curr.add(num);
            System.out.println(indent + "choose " + num + " -> " + curr);
            ans += backtrack(curr, nums);
            // undo the modification of the current state
            curr.remove(curr.size() - 1);
            System.out.println(indent + "undo   " + num + " -> " + curr);
        }

        return ans;
    }

}
