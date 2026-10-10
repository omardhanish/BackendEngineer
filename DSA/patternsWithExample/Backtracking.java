package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.ArrayList;
import java.util.List;
import java.util.Arrays;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #26 Subsets (78), #28 Subsets II (90), #27 Permutations (46), #29 Permutations II (47)

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

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #26 Subsets (78) | source: DSA/java/leetcode/medium/Subsets.java ---
    /**
     * Created by nikoo28 on 7/20/19 1:57 PM
     */

    static class Subsets {

      public List<List<Integer>> subsets(int[] nums) {
        List<List<Integer>> resultList = new ArrayList<>();

        // Start backtracking from the beginning
        backtrack(resultList, new ArrayList<>(), nums, 0);
        return resultList;
      }

      private void backtrack(List<List<Integer>> resultSets, List<Integer> tempSet,
                             int[] nums, int start) {
        // Add the set to result set
        resultSets.add(new ArrayList<>(tempSet));
        for (int i = start; i < nums.length; i++) {

          // Case of including the number
          tempSet.add(nums[i]);

          // Backtrack the new subset
          backtrack(resultSets, tempSet, nums, i + 1);

          // Case of not-including the number
          tempSet.remove(tempSet.size() - 1);
        }
      }

    }

    // --- #28 Subsets II (90) | source: DSA/java/leetcode/medium/SubsetsII.java ---
    /**
     * Created by nikoo28 on 7/20/19 1:57 PM
     */

    static class SubsetsII {

      public List<List<Integer>> subsetsWithDup(int[] nums) {
        List<List<Integer>> resultList = new ArrayList<>();
        Arrays.sort(nums);

        // Start backtracking from the beginning
        backtrack(resultList, new ArrayList<>(), nums, 0);
        return resultList;
      }

      private void backtrack(List<List<Integer>> resultSets, List<Integer> tempSet,
                             int[] nums, int start) {
        // If the set is already present, just continue
        if (resultSets.contains((tempSet)))
          return;

        resultSets.add(new ArrayList<>(tempSet));

        for (int i = start; i < nums.length; i++) {
          // Case of including the number
          tempSet.add(nums[i]);

          // Backtrack the new subset
          backtrack(resultSets, tempSet, nums, i + 1);

          // Case of not-including the number
          tempSet.remove(tempSet.size() - 1);
        }
      }

    }

    // --- #27 Permutations (46) | source: DSA/java/leetcode/medium/Permutations.java ---
    static class Permutations {

      public List<List<Integer>> permute(int[] nums) {

        List<List<Integer>> resultList = new ArrayList<>();

        backtrack(resultList, new ArrayList<>(), nums);
        return resultList;
      }

      private void backtrack(List<List<Integer>> resultList,
                             ArrayList<Integer> tempList, int[] nums) {
        // If we match the length, it is a permutation
        if (tempList.size() == nums.length) {
          resultList.add(new ArrayList<>(tempList));
          return;
        }

        for (int number : nums) {
          // Skip if we get same element
          if (tempList.contains(number))
            continue;

          // Add the new element
          tempList.add(number);

          // Go back to try other element
          backtrack(resultList, tempList, nums);

          // Remove the element
          tempList.remove(tempList.size() - 1);
        }
      }

    }

    // --- #29 Permutations II (47) | source: DSA/java/leetcode/medium/PermutationsII.java ---
    static class PermutationsII {

      public List<List<Integer>> permuteUnique(int[] nums) {

        List<List<Integer>> resultList = new ArrayList<>();
        Arrays.sort(nums);

        backtrack(resultList, new ArrayList<>(), nums, new boolean[nums.length]);
        return resultList;
      }

      private void backtrack(List<List<Integer>> resultList,
                             ArrayList<Integer> tempList, int[] nums, boolean[] used) {
        // If we match the length, it is a permutation
        if (tempList.size() == nums.length
            && !resultList.contains(tempList)) {
          resultList.add(new ArrayList<>(tempList));
          return;
        }

        for (int i = 0; i < nums.length; i++) {
          // Skip if we get same element
          if (used[i]) continue;

          // Add the new element and mark it as used
          used[i] = true;
          tempList.add(nums[i]);

          // Go back to try other element
          backtrack(resultList, tempList, nums, used);

          // Remove the element and mark it as unused
          used[i] = false;
          tempList.remove(tempList.size() - 1);
        }
      }

    }
    // ===== End of playlist solutions =====
}
