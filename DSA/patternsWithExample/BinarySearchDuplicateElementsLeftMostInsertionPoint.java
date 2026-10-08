package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.Arrays;

public class BinarySearchDuplicateElementsLeftMostInsertionPoint {

    // Example: [1, 2, 2, 2, 3], target 2 -> left-most index of 2 = 1

    public static void main(String[] args) {
        int[] arr = {1, 2, 2, 2, 3};
        System.out.println("arr = " + Arrays.toString(arr) + ", target = 2");
        System.out.println("Left-most insertion point = "
                + new BinarySearchDuplicateElementsLeftMostInsertionPoint().fn(arr, 2)); // 1
    }

    public int fn(int[] arr, int target) {
        int left = 0;
        int right = arr.length;
        while (left < right) {
            int mid = left + (right - left) / 2;
            System.out.println("  left=" + left + " right=" + right + " mid=" + mid + " arr[mid]=" + arr[mid]
                    + (arr[mid] >= target ? "  >= target -> right = mid" : "  < target -> left = mid + 1"));
            if (arr[mid] >= target) {
                right = mid;
            } else {
                left = mid + 1;
            }
        }

        return left;
    }

}
