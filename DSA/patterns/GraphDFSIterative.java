package patterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.HashSet;
import java.util.Set;
import java.util.Stack;

public class GraphDFSIterative {

    static final int START_NODE = 0;

    public static void main(String[] args) {

    }

    public int fn(int[][] graph) {
        Stack<Integer> stack = new Stack<>();
        Set<Integer> seen = new HashSet<>();
        stack.push(START_NODE);
        seen.add(START_NODE);
        int ans = 0;

        while (!stack.empty()) {
            int node = stack.pop();
            // do some logic
            for (int neighbor : graph[node]) {
                if (!seen.contains(neighbor)) {
                    seen.add(neighbor);
                    stack.push(neighbor);
                }
            }
        }

        return ans;
    }

}
