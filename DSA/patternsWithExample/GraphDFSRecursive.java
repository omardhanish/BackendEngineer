package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.HashSet;
import java.util.Set;

public class GraphDFSRecursive {

    // Example: count nodes reachable from node 0 (adjacency list)
    //   0 - 1 - 3
    //   |
    //   2 - 4        5 (alone, not reachable)
    // Expected: visit order 0, 1, 3, 2, 4 -> 5 nodes

    static final int START_NODE = 0;
    Set<Integer> seen = new HashSet<>();

    public static void main(String[] args) {
        int[][] graph = {
            {1, 2},   // 0
            {0, 3},   // 1
            {0, 4},   // 2
            {1},      // 3
            {2},      // 4
            {}        // 5
        };
        System.out.println("Reachable nodes = " + new GraphDFSRecursive().fn(graph)); // 5
    }

    public int fn(int[][] graph) {
        seen.add(START_NODE);
        return dfs(START_NODE, graph);
    }

    public int dfs(int node, int[][] graph) {
        int ans = 0;
        // do some logic
        ans++;
        System.out.println("  enter " + node);
        for (int neighbor : graph[node]) {
            if (!seen.contains(neighbor)) {
                seen.add(neighbor);
                ans += dfs(neighbor, graph);
            }
        }
        System.out.println("  leave " + node + "  nodes in this branch = " + ans);

        return ans;
    }

}
