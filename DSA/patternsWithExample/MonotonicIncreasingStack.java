package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.Stack;

public class MonotonicIncreasingStack {

    // Example: [2, 1, 5, 6, 2, 3]
    // Keep the stack increasing; every pop means "num is the next smaller element of the popped value".
    // ans = number of pops. Expected: 3  (1 pops 2; 2 pops 6 and 5)

    public static void main(String[] args) {
        int[] arr = {2, 1, 5, 6, 2, 3};
        System.out.println("Total pops = " + new MonotonicIncreasingStack().fn(arr)); // 3
    }

    public int fn(int[] arr) {
        Stack<Integer> stack = new Stack<>();
        int ans = 0;

        for (int num: arr) {
            // for monotonic decreasing, just flip the > to <
            while (!stack.empty() && stack.peek() > num) {
                // do logic
                ans++;
                System.out.println("  " + num + " < " + stack.peek() + " -> pop " + stack.peek());
                stack.pop();
            }

            stack.push(num);
            System.out.println("  push " + num + " -> stack " + stack);
        }

        return ans;
    }

}
