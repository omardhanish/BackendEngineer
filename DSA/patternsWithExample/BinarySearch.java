package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.Arrays;

public class BinarySearch {

    // Example: find 7 in [1, 3, 5, 7, 9, 11] -> index 3
    //          find 6 (missing)              -> insertion point 3

    public static void main(String[] args) {
        int[] arr = {1, 3, 5, 7, 9, 11};
        System.out.println("arr = " + Arrays.toString(arr));
        System.out.println("Result for 7 = " + new BinarySearch().fn(arr, 7)); // 3
        System.out.println();
        System.out.println("Result for 6 = " + new BinarySearch().fn(arr, 6)); // 3
    }

    public int fn(int[] arr, int target) {
        int left = 0;
        int right = arr.length - 1;
        System.out.println("target = " + target);
        while (left <= right) {
            int mid = left + (right - left) / 2;
            System.out.println("  left=" + left + " right=" + right + " mid=" + mid + " arr[mid]=" + arr[mid]);
            if (arr[mid] == target) {
                // do something
                System.out.println("  found at " + mid);
                return mid;
            }
            if (arr[mid] > target) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }

        // left is the insertion point
        System.out.println("  not found, insertion point = " + left);
        return left;
    }

}
