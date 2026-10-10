package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.HashSet;
import java.util.Set;
import java.util.Arrays;
import java.util.LinkedList;
import java.util.Queue;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #138 Number of Islands (200), #140 Rotting Oranges (994)

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

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #138 Number of Islands (200) | source: DSA/java/leetcode/medium/NumberOfIslands.java ---
    static class NumberOfIslands {

      int numIslands(char[][] grid) {
        if (grid == null || grid.length == 0 || grid[0].length == 0) {
          return 0;
        }

        int count = 0;

        for (int i = 0; i < grid.length; i++)
          for (int j = 0; j < grid[0].length; j++)
            if (grid[i][j] == '1') {
              dfs(grid, i, j);
              count++;
            }

        return count;
      }

      private void dfs(char[][] grid, int i, int j) {
        if (i < 0 || i >= grid.length
            || j < 0 || j >= grid[0].length
            || grid[i][j] == '0') {
          return;
        }

        grid[i][j] = '0'; // Mark the cell as visited

        // Explore all four directions
        dfs(grid, i + 1, j);
        dfs(grid, i - 1, j);
        dfs(grid, i, j + 1);
        dfs(grid, i, j - 1);
      }

      int numIslandsBFS(char[][] grid) {
        if (grid == null || grid.length == 0) return 0;

        int rows = grid.length;
        int cols = grid[0].length;
        int islands = 0;
        int[][] directions = { {0, 1}, {1, 0}, {0, -1}, {-1, 0} }; // Right, Down, Left, Up

        for (int r = 0; r < rows; r++) {
          for (int c = 0; c < cols; c++) {
            if (grid[r][c] == '1') { // Found an island
              islands++;
              bfs(grid, r, c, directions);
            }
          }
        }
        return islands;
      }

      private void bfs(char[][] grid, int r, int c, int[][] directions) {
        int rows = grid.length;
        int cols = grid[0].length;
        Queue<int[]> queue = new LinkedList<>();
        queue.offer(new int[] {r, c});
        grid[r][c] = '0'; // Mark as visited

        while (!queue.isEmpty()) {
          int[] current = queue.poll();
          int row = current[0];
          int col = current[1];

          for (int[] dir : directions) {
            int newRow = row + dir[0];
            int newCol = col + dir[1];

            if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols && grid[newRow][newCol] == '1') {
              queue.offer(new int[] {newRow, newCol});
              grid[newRow][newCol] = '0'; // Mark as visited
            }
          }
        }
      }
    }

    // --- #140 Rotting Oranges (994) | source: DSA/java/leetcode/medium/RottingOranges.java ---
    static class RottingOranges {

      int orangesRotting(int[][] grid) {
        if (grid == null || grid.length == 0) return -1;

        int rows = grid.length, cols = grid[0].length;
        int[][] time = new int[rows][cols];
        for (int i = 0; i < rows; i++)
          Arrays.fill(time[i], Integer.MAX_VALUE);

        for (int i = 0; i < rows; i++)
          for (int j = 0; j < cols; j++)
            if (grid[i][j] == 2)
              dfs(grid, time, i, j, 0);

        int timeRequired = 0;
        for (int i = 0; i < rows; i++)
          for (int j = 0; j < cols; j++)
            if (grid[i][j] == 1) {
              if (time[i][j] == Integer.MAX_VALUE) return -1;
              timeRequired = Math.max(timeRequired, time[i][j]);
            }

        return timeRequired;
      }

      private void dfs(int[][] grid, int[][] time, int i, int j, int currentTime) {
        if (i < 0 || i >= grid.length || j < 0 || j >= grid[0].length
            || grid[i][j] == 0 || currentTime >= time[i][j]) return;

        time[i][j] = currentTime;
        dfs(grid, time, i - 1, j, currentTime + 1);
        dfs(grid, time, i + 1, j, currentTime + 1);
        dfs(grid, time, i, j - 1, currentTime + 1);
        dfs(grid, time, i, j + 1, currentTime + 1);
      }
    }
    // ===== End of playlist solutions =====
}
