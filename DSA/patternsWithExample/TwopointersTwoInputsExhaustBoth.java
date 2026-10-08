package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.ArrayList;
import java.util.List;

public class TwopointersTwoInputsExhaustBoth {

    //Two pointers: two inputs, exhaust both
    // Example: merge two sorted arrays
    // arr1 = [1, 4, 7], arr2 = [2, 3, 8, 9]
    // CONDITION = (arr1[i] < arr2[j]): take the smaller one
    // Expected: [1, 2, 3, 4, 7, 8, 9] -> ans = 7 elements merged

    List<Integer> merged = new ArrayList<>();

    public static void main(String[] args) {
        int[] arr1 = {1, 4, 7};
        int[] arr2 = {2, 3, 8, 9};
        TwopointersTwoInputsExhaustBoth t = new TwopointersTwoInputsExhaustBoth();
        System.out.println("Merged count = " + t.fn(arr1, arr2)); // 7
        System.out.println("Merged = " + t.merged);
    }

    public int fn(int[] arr1, int[] arr2) {
        int i = 0, j = 0, ans = 0;

        while (i < arr1.length && j < arr2.length) {
            // do some logic here
            ans++;
            if (arr1[i] < arr2[j]) {
                merged.add(arr1[i]);
                System.out.println("  arr1[" + i + "]=" + arr1[i] + " < arr2[" + j + "]=" + arr2[j] + " -> take " + arr1[i] + "  " + merged);
                i++;
            } else {
                merged.add(arr2[j]);
                System.out.println("  arr1[" + i + "]=" + arr1[i] + " >= arr2[" + j + "]=" + arr2[j] + " -> take " + arr2[j] + "  " + merged);
                j++;
            }
        }

        while (i < arr1.length) {
            // do logic
            ans++;
            merged.add(arr1[i]);
            System.out.println("  arr2 done, take leftover arr1[" + i + "]=" + arr1[i] + "  " + merged);
            i++;
        }

        while (j < arr2.length) {
            // do logic
            ans++;
            merged.add(arr2[j]);
            System.out.println("  arr1 done, take leftover arr2[" + j + "]=" + arr2[j] + "  " + merged);
            j++;
        }

        return ans;
    }

}
