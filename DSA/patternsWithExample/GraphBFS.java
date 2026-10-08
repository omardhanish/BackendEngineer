package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.HashSet;
import java.util.LinkedList;
import java.util.Queue;
import java.util.Set;

public class GraphBFS {

    // Example: count nodes reachable from node 0 (adjacency list)
    //   0 - 1 - 3
    //   |
    //   2 - 4        5 (alone, not reachable)
    // Expected: visit order 0, 1, 2, 3, 4 -> 5 nodes

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
        System.out.println("Reachable nodes = " + new GraphBFS().fn(graph)); // 5
    }

    public int fn(int[][] graph) {
        Queue<Integer> queue = new LinkedList<>();
        Set<Integer> seen = new HashSet<>();
        queue.add(START_NODE);
        seen.add(START_NODE);
        int ans = 0;

        while (!queue.isEmpty()) {
            int node = queue.remove();
            // do some logic
            ans++;
            System.out.println("  visit " + node + "  queue now " + queue);
            for (int neighbor : graph[node]) {
                if (!seen.contains(neighbor)) {
                    seen.add(neighbor);
                    queue.add(neighbor);
                    System.out.println("    enqueue " + neighbor);
                }
            }
        }

        return ans;
    }

}
