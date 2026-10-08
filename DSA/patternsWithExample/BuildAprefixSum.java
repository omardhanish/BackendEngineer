package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.Arrays;

public class BuildAprefixSum {

    // Example: [1, 6, 3, 2, 7, 2] -> [1, 7, 10, 12, 19, 21]
    // prefix[i] = sum of arr[0..i], so sum(i..j) = prefix[j] - prefix[i - 1]

    public static void main(String[] args) {
        int[] arr = {1, 6, 3, 2, 7, 2};
        System.out.println("arr    = " + Arrays.toString(arr));
        int[] prefix = new BuildAprefixSum().fn(arr);
        System.out.println("prefix = " + Arrays.toString(prefix));
        System.out.println("sum(1..3) = prefix[3] - prefix[0] = " + (prefix[3] - prefix[0])); // 11
    }

    public int[] fn(int[] arr) {
        int[] prefix = new int[arr.length];
        prefix[0] = arr[0];
        System.out.println("  prefix[0] = " + prefix[0]);

        for (int i = 1; i < arr.length; i++) {
            prefix[i] = prefix[i - 1] + arr[i];
            System.out.println("  prefix[" + i + "] = " + prefix[i - 1] + " + " + arr[i] + " = " + prefix[i]);
        }

        return prefix;
    }

}
