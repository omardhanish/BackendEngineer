package patterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.HashSet;
import java.util.Set;

public class GraphDFSRecursive {

    static final int START_NODE = 0;

    Set<Integer> seen = new HashSet<>();

    public static void main(String[] args) {

    }

    public int fn(int[][] graph) {
        seen.add(START_NODE);
        return dfs(START_NODE, graph);
    }

    public int dfs(int node, int[][] graph) {
        int ans = 0;
        // do some logic
        for (int neighbor : graph[node]) {
            if (!seen.contains(neighbor)) {
                seen.add(neighbor);
                ans += dfs(neighbor, graph);
            }
        }

        return ans;
    }

}
