package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.HashSet;
import java.util.Set;
import java.util.Stack;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// ❌ None in the playlist

public class GraphDFSIterative {

    // Example: count nodes reachable from node 0 (adjacency list)
    //   0 - 1 - 3
    //   |
    //   2 - 4        5 (alone, not reachable)
    // Expected: visit order 0, 2, 4, 1, 3 (stack = last in, first out) -> 5 nodes

    static final int START_NODE = 0;

    public static void main(String[] args) {
        int[][] graph = {
            {1, 2},   // 0
            {0, 3},   // 1
            {0, 4},   // 2
            {1},      // 3
            {2},      // 4
            {}        // 5
        };
        System.out.println("Reachable nodes = " + new GraphDFSIterative().fn(graph)); // 5
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
            ans++;
            System.out.println("  visit " + node + "  stack now " + stack);
            for (int neighbor : graph[node]) {
                if (!seen.contains(neighbor)) {
                    seen.add(neighbor);
                    stack.push(neighbor);
                    System.out.println("    push " + neighbor);
                }
            }
        }

        return ans;
    }

}
