package patterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.Arrays;
import java.util.List;
import java.util.PriorityQueue;
import java.util.Queue;

public class DijkstrasAlgorithm {

    public static void main(String[] args) {

    }

    // graph.get(node) holds edges as {neighbor, weight}
    public int[] fn(List<List<int[]>> graph, int n, int source) {
        int[] distances = new int[n];
        Arrays.fill(distances, Integer.MAX_VALUE);
        distances[source] = 0;

        // heap entries are {distance, node}, smallest distance first
        Queue<int[]> heap = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        heap.add(new int[] { 0, source });

        while (!heap.isEmpty()) {
            int[] curr = heap.remove();
            int currDist = curr[0];
            int node = curr[1];
            if (currDist > distances[node]) {
                continue;
            }

            for (int[] edge : graph.get(node)) {
                int neighbor = edge[0];
                int weight = edge[1];
                int dist = currDist + weight;
                if (dist < distances[neighbor]) {
                    distances[neighbor] = dist;
                    heap.add(new int[] { dist, neighbor });
                }
            }
        }

        return distances;
    }

}
