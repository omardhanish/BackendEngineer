package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.PriorityQueue;
import java.util.Queue;

public class DijkstrasAlgorithm {

    // Example: shortest distance from node 0 in this directed weighted graph
    //   0 -> 1 (4)   0 -> 2 (1)   2 -> 1 (2)
    //   1 -> 3 (1)   2 -> 3 (5)   3 -> 4 (3)
    // Expected: [0, 3, 1, 4, 7]   (0->2->1 = 3 beats 0->1 = 4)

    public static void main(String[] args) {
        int n = 5;
        int[][] edges = { {0, 1, 4}, {0, 2, 1}, {2, 1, 2}, {1, 3, 1}, {2, 3, 5}, {3, 4, 3} };
        List<List<int[]>> graph = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            graph.add(new ArrayList<>());
        }
        for (int[] e : edges) {
            graph.get(e[0]).add(new int[] { e[1], e[2] });
        }

        int[] distances = new DijkstrasAlgorithm().fn(graph, n, 0);
        System.out.println("distances = " + Arrays.toString(distances)); // [0, 3, 1, 4, 7]
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
                System.out.println("pop node " + node + " dist " + currDist + "  stale, skip");
                continue;
            }
            System.out.println("pop node " + node + " dist " + currDist);

            for (int[] edge : graph.get(node)) {
                int neighbor = edge[0];
                int weight = edge[1];
                int dist = currDist + weight;
                if (dist < distances[neighbor]) {
                    distances[neighbor] = dist;
                    heap.add(new int[] { dist, neighbor });
                    System.out.println("  relax " + node + "->" + neighbor + " : distance becomes " + dist);
                } else {
                    System.out.println("  " + node + "->" + neighbor + " : " + dist + " is not better than " + distances[neighbor]);
                }
            }
        }

        return distances;
    }

}
