package leetcode.hard;

public class FirstMissingPositive {

  int firstMissingPositive(int[] nums) {

    // Loop 1: clean the array
    for (int i = 0; i < nums.length; i++) {
      if (nums[i] <= 0 || nums[i] > nums.length) {
        nums[i] = nums.length + 1;
      }
    }

    // Loop 2: Mark the presence
    for (int i = 0; i < nums.length; i++) {
      int num = Math.abs(nums[i]);
      if (num > nums.length) continue;

      if (nums[num - 1] > 0) {
        nums[num - 1] = -nums[num - 1];
      }
    }

    // Loop 3: Find the first missing positive
    for (int i = 0; i < nums.length; i++) {
      if (nums[i] > 0) {
        return i + 1;
      }
    }

    return nums.length + 1;
  }

}
