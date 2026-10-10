package patternsWithExample;

import java.util.*;
import java.util.Arrays;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #11 Container With Most Water (11), #160 Two Sum II (167), #69 3Sum (15), #70 3Sum Closest (16), #94 Valid Palindrome (125), #95 Valid Palindrome II (680), #39 Squares of Sorted Array (977), #105 Sum of Square Numbers (633), #104 Boats to Save People (881), #106 Reverse Words III (557)

public class TwopointersoneinputOppositeEnds {

    //Two pointers: one input, opposite ends
    // Example: count pairs in a SORTED array that add up to target
    // arr = [1, 2, 4, 6, 8, 9], target = 10
    // CONDITION = (sum < target): too small -> move left up, otherwise move right down
    // Expected: 3  (1+9, 2+8, 4+6)

    int target = 10;

    public static void main(String[] args) {
        int[] arr = {1, 2, 4, 6, 8, 9};
        System.out.println("Pairs = " + new TwopointersoneinputOppositeEnds().fn(arr)); // 3
    }

    public int fn(int[] arr) {
        int left = 0;
        int right = arr.length - 1;
        int ans = 0;

        while (left < right) {
            // do some logic here with left and right
            int sum = arr[left] + arr[right];
            if (sum == target) {
                ans++;
            }
            System.out.println("  left=" + left + "(" + arr[left] + ") right=" + right + "(" + arr[right] + ") sum=" + sum
                    + (sum == target ? "  MATCH" : "") + (sum < target ? "  -> left++" : "  -> right--"));
            if (sum < target) {
                left++;
            } else {
                right--;
            }
        }

        return ans;
    }

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #11 Container With Most Water (11) | source: DSA/java/leetcode/medium/ContainerWithMostWater.java ---
    /**
     * Created by nikoo28 on 12/18/17 9:25 PM
     */

    static class ContainerWithMostWater {

      public int maxArea(int[] height) {

        int left = 0;
        int right = height.length - 1;
        int maxArea = 0;

        while (left < right) {

          int area =
              Math.min(height[left], height[right])
              * (right - left);

          maxArea = Math.max(area, maxArea);

          if (height[left] < height[right])
            left++;
          else
            right--;
        }

        return maxArea;
      }

    }

    // --- #160 Two Sum II (167) | source: DSA/java/leetcode/easy/TwoSumII.java ---
    /**
     * Created by nikoo28 on 12/17/17 8:54 PM
     */

    static class TwoSumII {

      public int[] twoSum(int[] numbers, int target) {

        int start = 0;
        int end = numbers.length - 1;

        while (start < end) {
          int sum = numbers[start] + numbers[end];
          if (sum > target)
            end--;
          if (sum < target)
            start++;
          if (sum == target)
            break;
        }

        return new int[]{start + 1, end + 1};
      }

    }

    // --- #69 3Sum (15) | source: DSA/java/leetcode/medium/ThreeSum.java ---
    static class ThreeSum {

      List<List<Integer>> threeSum(int[] arr) {

        if (arr == null || arr.length < 3) return new ArrayList<>();

        // Sort the elements
        Arrays.sort(arr);
        Set<List<Integer>> result = new HashSet<>();

        // Now fix the first element and find the other two elements
        for (int i = 0; i < arr.length - 2; i++)
        {
          // Find other two elements using Two Sum approach
          int left = i + 1;
          int right = arr.length - 1;

          while (left < right) {
            int sum = arr[i] + arr[left] + arr[right];

            if (sum == 0) {

              // Add the set, and move to find other triplets
              result.add(Arrays.asList(arr[i], arr[left], arr[right]));
              left++;
              right--;
            } else if (sum < 0)
              left++;
            else
              right--;
          }
        }
        return new ArrayList<>(result);
      }

    }

    // --- #70 3Sum Closest (16) | source: DSA/java/leetcode/medium/ThreeSumClosest.java ---
    static class ThreeSumClosest {

      int threeSumClosest(int[] arr, int target) {

        // Sort the elements
        Arrays.sort(arr);
        int resultSum = arr[0] + arr[1] + arr[2];
        int minDifference = Integer.MAX_VALUE;

        // Now fix the first element and find the other two elements
        for (int i = 0; i < arr.length - 2; i++) {
          // Find other two elements using Two Sum approach
          int left = i + 1;
          int right = arr.length - 1;

          while (left < right) {
            int sum = arr[i] + arr[left] + arr[right];

            if (sum == target)
              return target;
            if (sum < target)
              left++;
            else
              right--;

            int diffToTarget = Math.abs(sum - target);
            if (diffToTarget < minDifference) {
              // update the result sum
              resultSum = sum;
              minDifference = diffToTarget;
            }
          }
        }
        return resultSum;
      }

    }

    // --- #94 Valid Palindrome (125) | source: DSA/java/leetcode/easy/ValidPalindrome.java ---
    static class ValidPalindrome {

      boolean validPalindrome(String s) {
        // Get the left and right pointers
        int left = 0;
        int right = s.length() - 1;

        // Start a loop and compare characters
        while (left < right)
          // If same, move both pointers
          if (s.charAt(left) == s.charAt(right)) {
            left++;
            right--;
          }
          // If not, simply return false
          else
            return false;

        // If we come out of the loop, then all
        // characters have matched, return true
        return true;
      }

    }

    // --- #95 Valid Palindrome II (680) | source: DSA/java/leetcode/easy/ValidPalindromeII.java ---
    static class ValidPalindromeII {

      boolean validPalindrome(String s) {
        int left = 0;
        int right = s.length() - 1;

        while (left < right) {
          // Keep moving till characters match
          if (s.charAt(left) == s.charAt(right)) {
            left++;
            right--;
          } else {
            // Try deleting 1 character from either direction
            return isPalindrome(s, left + 1, right)
                || isPalindrome(s, left, right - 1);
          }
        }

        return true;
      }

      private boolean isPalindrome(String s, int left, int right) {
        while (left < right) {
          if (s.charAt(left) == s.charAt(right)) {
            left++;
            right--;
          } else return false;
        }
        return true;
      }

    }

    // --- #39 Squares of Sorted Array (977) | source: DSA/java/leetcode/easy/SquaresOfSortedArray.java ---
    static class SquaresOfSortedArray {

      int[] sortedSquares(int[] nums) {

        int[] result = new int[nums.length];

        // Square all elements
        for (int i = 0; i < nums.length; i++) {
          nums[i] = nums[i] * nums[i];
        }

        int head = 0;
        int tail = nums.length - 1;

        // Set them at right place in the result array
        for (int pos = nums.length - 1; pos >= 0; pos--) {

          if (nums[head] > nums[tail]) {
            result[pos] = nums[head];
            // Increment head pointer
            head++;
          } else {
            result[pos] = nums[tail];
            // Increment tail pointer
            tail--;
          }
        }

        return result;
      }

    }

    // --- #105 Sum of Square Numbers (633) | source: DSA/java/leetcode/medium/SumOfSquareNumbers.java ---
    static class SumOfSquareNumbers {

      boolean judgeSquareSum(int c) {

        // Base case
        if (c < 0) return false;

        // Two pointers
        long left = 0;
        long right = (int) Math.sqrt(c);

        while (left <= right) {
          long sum = left * left + right * right;

          if (sum == c)
            return true;
          else if (sum < c)
            left++;
          else
            right--;
        }

        return false;
      }

    }

    // --- #104 Boats to Save People (881) | source: DSA/java/leetcode/medium/BoatsToSavePeople.java ---
    static class BoatsToSavePeople {

      int numRescueBoats(int[] people, int limit) {

        // Sort the people by weight
        Arrays.sort(people);

        int boats = 0;

        // Use 2 pointers to find the heaviest and lightest person
        int left = 0, right = people.length - 1;

        while (left <= right) {

          // If heaviest and lightest person can fit in same boat
          if (people[left] + people[right] <= limit) {
            left++;
          }

          // In any case, the heaviest person will be on the boat
          right--;

          // Increment the number of boats
          boats++;
        }

        return boats;
      }

    }

    // --- #106 Reverse Words III (557) | source: DSA/java/leetcode/easy/ReverseWordsInAStringIII.java ---
    static class ReverseWordsInAStringIII {

      String reverseWords(String s) {

        char[] arr = s.toCharArray();

        int left = 0, right = 0;

        while (right < arr.length) {
          // If we find a space, reverse the word
          if (arr[right] == ' ') {
            reverse(arr, left, right - 1);
            left = right + 1;
          }

          right++;
        }

        // Reverse the last word
        reverse(arr, left, right - 1);

        // Return the string
        return new String(arr);
      }

      private void reverse(char[] arr, int left, int right) {
        while (left < right) {
          char temp = arr[left];
          arr[left++] = arr[right];
          arr[right--] = temp;
        }
      }

    }
    // ===== End of playlist solutions =====
}
