package patternsWithExample;

import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #86 Max Average Subarray (643), #92 Max Vowels in a Substring (1456), #116 Min Size Subarray Sum (209), #91 Fruit Into Baskets (904), #137 Longest Substring Without Repeating (3), #129 Longest Repeating Char Replacement (424), #113 Max Consecutive Ones III (1004), #148 Find All Anagrams (438), #156 Minimum Window Substring (76)

public class SlidingWindow {

    // Example: longest subarray with sum <= k
    // arr = [3, 1, 2, 7, 4, 2, 1, 1, 5], k = 8
    // curr = sum of the window; WINDOW_CONDITION_BROKEN = (curr > k)
    // Expected: 4  ([4, 2, 1, 1])

    int k = 8;

    //Sliding window: track a window over an array/string
    public static void main(String[] args) {
        int[] arr = {3, 1, 2, 7, 4, 2, 1, 1, 5};
        System.out.println("Longest length = " + new SlidingWindow().fn(arr)); // 4
    }

    public int fn(int[] arr) {
        int left = 0, ans = 0, curr = 0;

        for (int right = 0; right < arr.length; right++) {
            // do logic here to add arr[right] to curr
            curr += arr[right];
            System.out.println("  add arr[" + right + "]=" + arr[right] + " -> sum " + curr);

            while (curr > k) {
                // remove arr[left] from curr
                curr -= arr[left];
                System.out.println("    sum > " + k + ", remove arr[" + left + "]=" + arr[left] + " -> sum " + curr);
                left++;
            }

            // update ans
            ans = Math.max(ans, right - left + 1);
            System.out.println("    window [" + left + ".." + right + "] length " + (right - left + 1) + "  best " + ans);
        }

        return ans;
    }

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #86 Max Average Subarray (643) | source: DSA/java/leetcode/easy/MaximumAverageSubarrayI.java ---
    static class MaximumAverageSubarrayI {

      double findMaxAverage(int[] nums, int k) {

        // Get sum for starting window
        int sum = 0;
        for (int i = 0; i < k; i++)
          sum += nums[i];

        int maxSum = sum;

        // Start sliding window
        int startIndex = 0;
        int endIndex = k;
        while (endIndex < nums.length) {

          sum -= nums[startIndex]; // Remove previous element
          startIndex++;

          sum += nums[endIndex]; // Add next element
          endIndex++;

          maxSum = Math.max(maxSum, sum); // Update max sum
        }

        // Return the average
        return (double) maxSum / k;
      }
    }

    // --- #92 Max Vowels in a Substring (1456) | source: DSA/java/leetcode/medium/MaximumVowelsInASubstring.java ---
    static class MaximumVowelsInASubstring {

      int maxVowels(String s, int k) {
        int maxVowels = 0;
        int windowVowels = 0;

        Set<Character> vowels = new HashSet<>();
        vowels.add('a'); vowels.add('e'); vowels.add('i');
        vowels.add('o'); vowels.add('u');

        // Count the number of vowels in the first window
        for (int i = 0; i < k; i++)
          if (vowels.contains(s.charAt(i)))
            windowVowels++;

        maxVowels = windowVowels;

        // Slide the window and update the maximum number of vowels
        for (int i = k; i < s.length(); i++) {
          if (vowels.contains(s.charAt(i - k)))
            windowVowels--;

          if (vowels.contains(s.charAt(i)))
            windowVowels++;

          maxVowels = Math.max(maxVowels, windowVowels);
        }

        return maxVowels;
      }

    }

    // --- #116 Min Size Subarray Sum (209) | source: DSA/java/leetcode/medium/MinimumSizeSubarraySum.java ---
    static class MinimumSizeSubarraySum {

      int minSubArrayLen(int target, int[] nums) {

        int minLenWindow = Integer.MAX_VALUE;
        int currentSum = 0;

        // Start 2 pointers sliding window
        int low = 0;
        int high = 0;
        while(high < nums.length) {

          // Find the current sum and increase window size
          currentSum += nums[high];
          high++;

          // Try to reduce the window size
          while (currentSum >= target) {

            int currentWindowSize = high - low;

            // Update minimum length of window
            minLenWindow = Math.min(minLenWindow, currentWindowSize);

            currentSum -= nums[low];
            low++;
          }
        }

        return minLenWindow == Integer.MAX_VALUE ? 0 : minLenWindow;
      }

    }

    // --- #91 Fruit Into Baskets (904) | source: DSA/java/leetcode/medium/FruitIntoBaskets.java ---
    static class FruitIntoBaskets {

      int totalFruit(int[] fruits) {

        Map<Integer, Integer> basket = new HashMap<>();
        int left = 0;
        int right = 0;
        int maxFruits = 0;

        for (right = 0; right < fruits.length; right++) {
          // Add current to basket
          int currentCount = basket.getOrDefault(fruits[right], 0);
          basket.put(fruits[right], currentCount + 1);

          // If basket has more than 2 type of fruits,
          // start emptying the basket
          while (basket.size() > 2) {
            int fruitCount = basket.get(fruits[left]);
            if (fruitCount == 1)
              basket.remove(fruits[left]);
            else
              basket.put(fruits[left], fruitCount - 1);
            left++;
          }

          maxFruits = Math.max(maxFruits, right - left + 1);
        }
        return maxFruits;
      }

    }

    // --- #137 Longest Substring Without Repeating (3) | source: DSA/java/leetcode/medium/LongestSubstringWithoutRepeatingCharacters.java ---
    /**
     * Created by nikoo28 on 12/18/17 9:29 PM
     */

    static class LongestSubstringWithoutRepeatingCharacters {

      int lengthOfLongestSubstring(String s) {

        Set<Character> charSet = new HashSet<>();

        int maxLength = 0;
        int left = 0;

        for (int right = 0; right < s.length(); right++) {

          while (charSet.contains(s.charAt(right))) {
            charSet.remove(s.charAt(left));
            left++;
          }

          charSet.add(s.charAt(right));
          maxLength = Math.max(maxLength, right - left + 1);
        }

        return maxLength;
      }

    }

    // --- #129 Longest Repeating Char Replacement (424) | source: DSA/java/leetcode/medium/LongestRepeatingCharacterReplacement.java ---
    static class LongestRepeatingCharacterReplacement {

      int characterReplacement(String s, int k) {

        int[] freq = new int[26];
        int left = 0;
        int maxFreq = 0;
        int maxWindow = 0;

        for (int right = 0; right < s.length(); right++) {

          // Update the frequency of the current character
          freq[s.charAt(right) - 'A']++;

          // Update the max frequency
          maxFreq = Math.max(maxFreq, freq[s.charAt(right) - 'A']);

          int windowLength = right - left + 1;

          // If the windowLength - max frequency > k,
          // then we need to shrink the window
          if (windowLength - maxFreq > k) {
            freq[s.charAt(left) - 'A']--;
            left++;
          }

          windowLength = right - left + 1;
          maxWindow = Math.max(maxWindow, windowLength);
        }

        return maxWindow;

      }

    }

    // --- #113 Max Consecutive Ones III (1004) | source: DSA/java/leetcode/medium/MaxConsecutiveOnesIII.java ---
    static class MaxConsecutiveOnesIII {

      int longestOnes(int[] nums, int k) {

        int zeroCount = 0;
        int start = 0;
        int max_ones = 0;

        for (int end = 0; end < nums.length; end++) {
          if (nums[end] == 0)
            zeroCount++;

          while (zeroCount > k) {
            if (nums[start] == 0)
              zeroCount--;

            start++;
          }

          max_ones = Math.max(max_ones, end - start + 1);
        }
        return max_ones;
      }

    }

    // --- #148 Find All Anagrams (438) | source: DSA/java/leetcode/medium/FindAllAnagramsInAString.java ---
    static class FindAllAnagramsInAString {

      List<Integer> findAnagrams(String s, String p) {

        int[] pCount = new int[26];
        int[] sCount = new int[26];
        List<Integer> result = new java.util.ArrayList<>();

        // Count frequency of characters in p
        for (char c : p.toCharArray()) {
          pCount[c - 'a']++;
        }

        // Sliding window to count frequency of characters in s
        for (int i = 0; i < s.length(); i++) {
          sCount[s.charAt(i) - 'a']++;

          // Remove the character that is out of the window
          if (i >= p.length()) {
            sCount[s.charAt(i - p.length()) - 'a']--;
          }

          // Compare counts
          if (Arrays.equals(pCount, sCount)) {
            result.add(i - p.length() + 1);
          }
        }

        return result;
      }

    }

    // --- #156 Minimum Window Substring (76) | source: DSA/java/leetcode/hard/MinimumWindowSubstring.java ---
    /**
     * Created by nikoo28 on 11/9/19 1:41 AM
     */

    static class MinimumWindowSubstring {

      String minWindow(String s, String t) {

        // Count characters in s
        int[] mapS = new int[256];

        // Count characters in t
        int[] mapT = new int[256];

        for (char ch : t.toCharArray())
          mapT[ch]++;

        String result = "";
        int right = 0, min = Integer.MAX_VALUE;

        // Two pointers of the sliding window: i(left), right
        for (int i = 0; i < s.length(); i++) {

          while (right < s.length() && !isDesirable(mapS, mapT)) {
            mapS[s.charAt(right)]++;

            // Extend the right pointer of the sliding window
            right++;
          }

          if (isDesirable(mapS, mapT) && min > right - i + 1) {
            result = s.substring(i, right);
            min = right - i + 1;
          }

          // Shrink the left pointer from i to i + 1
          mapS[s.charAt(i)]--;
        }

        return result;
      }

      // Runtime = O(256) = O(1)
      private boolean isDesirable(int[] mapS, int[] mapT) {
        // s should cover all characters in t
        for (int i = 0; i < mapT.length; i++) {
          if (mapT[i] > mapS[i])
            return false;
        }
        return true;
      }
    }
    // ===== End of playlist solutions =====
}
