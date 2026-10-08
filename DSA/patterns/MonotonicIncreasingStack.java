package patterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.Stack;

public class MonotonicIncreasingStack {

    public static void main(String[] args) {
        
    }

    public int fn(int[] arr) {
        Stack<Integer> stack = new Stack<>();
        int ans = 0;
    
        for (int num: arr) {
            // for monotonic decreasing, just flip the > to <
            while (!stack.empty() && stack.peek() > num) {
                // do logic
                stack.pop();
            }
    
            stack.push(num);
        }
    
        return ans;
    }
    
}
