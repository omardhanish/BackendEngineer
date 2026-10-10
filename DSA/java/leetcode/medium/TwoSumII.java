package leetcode.medium;

public class TwoSumII {

  int[] twoSum(int[] numbers, int target) {
    int left = 0, right = numbers.length - 1;

    while (left < right) {

      // Starting point
      int sum = numbers[left] + numbers[right];

      // Traditional approach to move pointers
      if (sum == target) {
        return new int[]{left + 1, right + 1};
      } else if (sum < target) {

        // We need to look for bigger sum
        left++;
      } else {

        // We need to look for smaller sum
        right--;
      }
    }

    return new int[]{-1, -1};
  }

}
