package patternsWithExample.missedpatterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #17 Number of Good Pairs (1512), #18 Numbers Smaller than Current Number (1365), #118 Sum of Unique Elements (1748), #35 Top K Frequent Elements (347, bucket sort), #84 Reorganize String (767), #127 Maximum Odd Binary Number (2864)

public class CountingArray {

    // Pattern: Count frequencies in a fixed-size int[] (values/letters have a small range) instead of a map.

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #17 Number of Good Pairs (1512) | source: DSA/java/leetcode/easy/NumberOfGoodPairs.java ---
    static class NumberOfGoodPairs {

      public int numIdenticalPairs(int[] nums) {

        // Calculate the frequency of each number
        int[] count = new int[102];

        for (int num : nums) {
          count[num]++;
        }

        int totalCount = 0;

        // Calculate total number of pairs possible
        for (int i : count) {
          totalCount += ((i) * (i-1))/2;
        }

        return totalCount;
      }

    }

    // --- #18 Numbers Smaller than Current Number (1365) | source: DSA/java/leetcode/easy/NumbersSmallerThanTheCurrentNumber.java ---
    static class NumbersSmallerThanTheCurrentNumber {

      public int[] smallerNumbersThanCurrent(int[] nums) {

        // Create buckets for counting sort
        int[] buckets = new int[102];

        // Get frequency of each element
        for (int num : nums) {
          buckets[num]++;
        }

        // Count smaller numbers than each element
        for (int i = 1; i < buckets.length; i++) {
          buckets[i] += buckets[i - 1];
        }

        // Populate the result
        int[] result = new int[nums.length];
        for (int i = 0; i < result.length; i++) {
          if (nums[i] == 0)
            result[i] = 0;
          else
            result[i] = buckets[nums[i] - 1];
        }

        return result;
      }

    }

    // --- #118 Sum of Unique Elements (1748) | source: DSA/java/leetcode/easy/SumOfUniqueElements.java ---
    static class SumOfUniqueElements {

      int sumOfUnique(int[] nums) {

        // Create a frequency array to store the frequency
        int[] freq = new int[101];
        int sum = 0;

        for (int num : nums)
          freq[num]++;

        for (int i = 0; i < freq.length; i++) {
          if (freq[i] == 1) {
            sum += i;
          }
        }

        return sum;
      }

    }

    // --- #35 Top K Frequent Elements (347, bucket sort) | source: DSA/java/leetcode/medium/TopKFrequentElements.java ---
    static class TopKFrequentElements {

      public int[] topKFrequent(int[] nums, int k) {

        List<Integer>[] bucket = new List[nums.length + 1];
        Map<Integer, Integer> frequencyMap = new HashMap<>();

        for (int n : nums) {
          frequencyMap.put(n, frequencyMap.getOrDefault(n, 0) + 1);
        }

        for (int key : frequencyMap.keySet()) {
          int frequency = frequencyMap.get(key);
          if (bucket[frequency] == null) {
            bucket[frequency] = new ArrayList<>();
          }
          bucket[frequency].add(key);
        }

        List<Integer> topK = new ArrayList<>();
        for (int pos = bucket.length - 1;pos >= 0 && topK.size() < k; pos--) {
          if (bucket[pos] != null) {
            topK.addAll(bucket[pos]);
          }
        }

        return topK.stream().mapToInt(i -> i).toArray();

      }

    }

    // --- #84 Reorganize String (767) | source: DSA/java/leetcode/medium/ReorganizeString.java ---
    static class ReorganizeString {

      String reorganizeString(String str) {
        int[] hash = new int[26];
        for (int i = 0; i < str.length(); i++) hash[str.charAt(i) - 'a']++;

        int max = 0, letter = 0;
        for (int i = 0; i < hash.length; i++)
          if (hash[i] > max) {
            max = hash[i];
            letter = i;
          }

        if (max > (str.length() + 1) / 2) return "";

        char[] res = new char[str.length()];

        // Fill all even places with majority character
        int idx = 0;
        while (hash[letter]-- > 0) {
          res[idx] = (char) (letter + 'a');
          idx += 2;
        }

        // Fill the remaining characters
        for (int i = 0; i < hash.length; i++)
          while (hash[i]-- > 0) {
            if (idx >= res.length) idx = 1;

            res[idx] = (char) (i + 'a');
            idx += 2;
          }

        return String.valueOf(res);
      }

    }

    // --- #127 Maximum Odd Binary Number (2864) | source: DSA/java/leetcode/easy/MaximumOddBinaryNumber.java ---
    static class MaximumOddBinaryNumber {

      String maximumOddBinaryNumber(String s) {

        // Count total 0's and 1's in string
        int countZero = 0;
        int countOne = 0;
        for (char c : s.toCharArray()) {
          if (c == '0')
            countZero++;
          else
            countOne++;
        }

        // Build the answer
        StringBuilder ans = new StringBuilder();

        // Add the first 1
        ans.append("1");
        countOne--;

        // Add all the 0's
        ans.append("0".repeat(countZero));

        // Add the remaining 1's
        ans.append("1".repeat(countOne));

        // Reverse and return the answer
        return ans.reverse().toString();
      }

    }
    // ===== End of playlist solutions =====

}
