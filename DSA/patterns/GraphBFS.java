package patterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.HashSet;
import java.util.LinkedList;
import java.util.Queue;
import java.util.Set;

public class GraphBFS {

    static final int START_NODE = 0;

    public static void main(String[] args) {

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
            for (int neighbor : graph[node]) {
                if (!seen.contains(neighbor)) {
                    seen.add(neighbor);
                    queue.add(neighbor);
                }
            }
        }

        return ans;
    }

}
