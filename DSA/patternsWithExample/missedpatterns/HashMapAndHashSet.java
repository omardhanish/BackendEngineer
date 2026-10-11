package patternsWithExample.missedpatterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.*;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #6 Two Sum (1), #8 Group Anagrams (49), 
// #36 Contains Duplicate (217),
//  #44 Longest Consecutive Sequence (128), 
// #79 Isomorphic Strings (205),
//  #80 Jewels and Stones (771),
// #82 Check if Sentence is Pangram (1832),
//  #34 Sorting a Sentence (1859), #33 Happy Number (202)

public class HashMapAndHashSet {

    // Pattern: Store seen values / keys in a HashMap or HashSet for O(1) lookups.

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #6 Two Sum (1) | source: DSA/java/leetcode/easy/TwoSum.java ---
    /**
     * Created by nikoo28 on 7/4/19 2:50 PM
     */

    static class TwoSum {

      int[] twoSumBruteForce(int[] nums, int target) {

        for (int i = 0; i < nums.length; i++) {
          for (int j = 0; j < nums.length; j++) {
            if (nums[i] + nums[j] == target)
              return new int[]{i, j};
          }
        }
        throw new IllegalArgumentException("No two sum solution");
      }

      int[] twoSumSorting(int[] nums, int target) {
        int[] copyArray = Arrays.copyOf(nums, nums.length);
        Arrays.sort(copyArray);

        int head = 0;
        int tail = copyArray.length - 1;
        int num1 = 0, num2 = 0;
        while (head < tail) {
          int sum = copyArray[head] + copyArray[tail];
          if (sum < target) {
            head++;
          }
          else if (sum > target) {
            tail--;
          } else {
            num1 = copyArray[head];
            num2 = copyArray[tail];
            break;
          }
        }

        // Create the result array with indices
        int[] result = new int[2];
        for (int i = 0; i < nums.length; i++) {
          if (nums[i] == num1) result[0] = i;
          if (nums[i] == num2) result[1] = i;
        }
        return result;
      }

      int[] twoSumHashing(int[] nums, int target) {

        // Create a HashMap
        Map<Integer, Integer> map = new HashMap<>();

        for (int i = 0; i < nums.length; i++) {

          // Get the complement using the target value
          int complement = target - nums[i];

          // Search the hashmap for complement, if found, we got our pair
          if (map.containsKey(complement)) {
            return new int[]{map.get(complement), i};
          }

          // Put the element in hashmap for subsequent searches.
          map.put(nums[i], i);
        }
        throw new IllegalArgumentException("No two sum solution");
      }

    }

    // --- #8 Group Anagrams (49) | source: DSA/java/leetcode/medium/GroupAnagrams.java ---
    /**
     * Created by nikoo28 on 12/18/17 11:01 PM
     */

    static class GroupAnagrams {

      public List<List<String>> groupAnagramsCategorizeBySorting(String[] strs) {

        if (strs == null || strs.length == 0)
          return new ArrayList<>();

        Map<String, List<String>> stringAnagramsMap = new HashMap<>();
        for (String s : strs) {
          char[] arr = s.toCharArray();
          Arrays.sort(arr);
          String key = String.valueOf(arr);

          if (!stringAnagramsMap.containsKey(key))
            stringAnagramsMap.put(key, new ArrayList<>());

          stringAnagramsMap.get(key).add(s);
        }

        List<List<String>> resultList = new ArrayList<>();
        for (Map.Entry<String, List<String>> stringAnagrams : stringAnagramsMap.entrySet()) {
          resultList.add(stringAnagrams.getValue());
        }
        return resultList;
      }

      public List<List<String>> groupAnagramsCategorizeByFrequency(String[] strs) {

        // Check for empty inputs
        if (strs == null || strs.length == 0)
          return new ArrayList<>();

        Map<String, List<String>> frequencyStringsMap = new HashMap<>();
        for (String str : strs) {

          String frequencyString = getFrequencyString(str);

          // If the frequency string is present, add the string to the list
          if (frequencyStringsMap.containsKey(frequencyString)) {
            frequencyStringsMap.get(frequencyString).add(str);
          }
          else {
            // else create a new list
            List<String> strList = new ArrayList<>();
            strList.add(str);
            frequencyStringsMap.put(frequencyString, strList);
          }
        }

        return new ArrayList<>(frequencyStringsMap.values());
      }

      private String getFrequencyString(String str) {

        // Frequency buckets
        int[] freq = new int[26];

        // Iterate over each character
        for (char c : str.toCharArray()) {
          freq[c - 'a']++;
        }

        // Start creating the frequency string
        StringBuilder frequencyString = new StringBuilder("");
        char c = 'a';
        for (int i : freq) {
          frequencyString.append(c);
          frequencyString.append(i);
          c++;
        }

        return frequencyString.toString();
      }
    }

    // --- #36 Contains Duplicate (217) | source: DSA/java/leetcode/easy/ContainsDuplicate.java ---
    /**
     * Created by nikoo28 on 10/11/19 12:10 AM
     */

    static class ContainsDuplicate {

      public boolean containsDuplicate(int[] nums) {

        // Create hashset to store integers
        Set<Integer> intSet = new HashSet<>();

        // Iterate over each element
        for (int num : nums) {

          // Check the number in hashset
          if (intSet.contains(num))
            return true;

          // Add the number to hashset
          intSet.add(num);
        }

        return false;
      }

    }

    // --- #44 Longest Consecutive Sequence (128) | source: DSA/java/leetcode/medium/LongestConsecutiveSequence.java ---
    /**
     * Created by nikoo28 on 9/18/22 1:46 PM
     */

    static class LongestConsecutiveSequence {

      int longestConsecutive(int[] nums) {

        int longestLength = 0;
        Map<Integer, Boolean> numberTravelledMap = new HashMap<>();
        for (int num : nums) {
          numberTravelledMap.put(num, Boolean.FALSE);
        }

        for (int num : nums) {
          int currentLength = 1;

          // Check in forward direction
          int nextNum = num + 1;
          while (numberTravelledMap.containsKey(nextNum) &&
              numberTravelledMap.get(nextNum) == false) {

            currentLength++;
            numberTravelledMap.put(nextNum, Boolean.TRUE);

            // Move to the next number
            nextNum++;
          }

          // Check in reverse direction
          int prevNum = num - 1;
          while (numberTravelledMap.containsKey(prevNum) &&
              numberTravelledMap.get(prevNum) == false) {

            currentLength++;
            numberTravelledMap.put(prevNum, Boolean.TRUE);

            // Move to the previous number
            prevNum--;
          }

          longestLength = Math.max(longestLength, currentLength);
        }

        return longestLength;
      }

    }

    // --- #79 Isomorphic Strings (205) | source: DSA/java/leetcode/easy/IsomorphicStrings.java ---
    static class IsomorphicStrings {

      boolean isIsomorphic(String s, String t) {

        if (s.length() != t.length()) {
          return false;
        }

        // Create a hashmap to store character mappings
        Map<Character, Character> charMappingMap = new HashMap<>();

        for (int i = 0; i < s.length(); i++) {

          char original = s.charAt(i);
          char replacement = t.charAt(i);

          if (!charMappingMap.containsKey(original)) {
            if (!charMappingMap.containsValue(replacement))
              charMappingMap.put(original, replacement);
            else
              return false;
          }
          else {
            char mappedCharacter = charMappingMap.get(original);
            if (mappedCharacter != replacement)
              return false;
          }
        }

        return true;
      }

    }

    // --- #80 Jewels and Stones (771) | source: DSA/java/leetcode/easy/JewelsAndStones.java ---
    static class JewelsAndStones {

      int numJewelsInStones(String jewels, String stones) {

        // Create a set for all different jewels
        Set<Character> jewelSet = new HashSet<>();
        for (int i = 0; i < jewels.length(); i++)
          jewelSet.add(jewels.charAt(i));

        // Find total score/value
        int score = 0;
        for (int i = 0; i < stones.length(); i++)
          if (jewelSet.contains(stones.charAt(i)))
            score++;

        return score;
      }

    }

    // --- #82 Check if Sentence is Pangram (1832) | source: DSA/java/leetcode/easy/CheckIfPangram.java ---
    static class CheckIfPangram {

      boolean checkIfPangram(String sentence) {

        Set<Character> alphabetSet = new HashSet<>();

        // Add all characters from 'a' to 'z' in hashset
        for (int i = 'a'; i <= 'z'; i++) {
          alphabetSet.add((char) i);
        }

        // Remove every character and check
        // if set becomes empty at any point of time
        for (int i = 0; i < sentence.length(); i++) {
          alphabetSet.remove(sentence.charAt(i));
          if (alphabetSet.isEmpty())
            return true;
        }

        return false;
      }

    }

    // --- #34 Sorting a Sentence (1859) | source: DSA/java/leetcode/easy/SortingTheSentence.java ---
    static class SortingTheSentence {

      String sortSentence(String s) {

        // Map to store words in correct order
        Map<Integer, String> indexWordMap = new HashMap<>();

        // Split each word based on space
        for (String word : s.split(" ")) {
          int lastIndex = word.length() - 1;

          // get the word and index separately
          int index = word.charAt(lastIndex) - '0';
          String actualWord = word.substring(0, lastIndex);

          indexWordMap.put(index, actualWord);
        }

        // Build the actual string
        StringBuilder actualString = new StringBuilder();
        for (Map.Entry<Integer, String> indexWord : indexWordMap.entrySet()) {
          actualString.append(indexWord.getValue());
          actualString.append(" ");
        }

        return actualString.toString().trim();
      }

    }

    // --- #33 Happy Number (202) | source: DSA/java/leetcode/easy/HappyNumber.java ---
    /**
     * Created by nikoo28 on 10/19/19 3:11 PM
     */

    static class HappyNumber {

      boolean isHappy(int n) {

        Set<Integer> usedIntegers = new HashSet<>();
        while (true) {

          // Find the sum of squares
          int sum = 0;
          while (n != 0) {
            sum += Math.pow(n % 10, 2.0);
            n = n / 10;
          }

          // If sum is 1, return true
          if (sum == 1) return true;

          // Else, the new number is the current sum
          n = sum;

          // Check if we have already encountered
          // that number
          if (usedIntegers.contains(n))
            return false;
          usedIntegers.add(n);
        }
      }

    }
    // ===== End of playlist solutions =====

}
