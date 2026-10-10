package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.HashSet;
import java.util.LinkedList;
import java.util.Queue;
import java.util.Set;
import java.util.*;
import java.util.ArrayList;
import java.util.List;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #149 Course Schedule (207), #158 Word Ladder (127), #97 Jump Game III (1306), #138 Number of Islands (200, BFS version), #142 01 Matrix (542, BFS in the video; the code uses DP)

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

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #149 Course Schedule (207) | source: DSA/java/leetcode/medium/CourseSchedule.java ---
    static class CourseSchedule {

      // evaluate using BFS
      boolean canFinish(int numCourses, int[][] prerequisites) {
        List<List<Integer>> graph = new ArrayList<>();
        int[] inDegree = new int[numCourses];
        for (int i = 0; i < numCourses; i++)
          graph.add(new ArrayList<>());


        for (int[] pre : prerequisites) {
          graph.get(pre[1]).add(pre[0]);
          inDegree[pre[0]]++;
        }

        Queue<Integer> queue = new LinkedList<>();
        for (int i = 0; i < numCourses; i++)
          if (inDegree[i] == 0)
            queue.offer(i);

        int count = 0;
        while (!queue.isEmpty()) {
          int curr = queue.poll();
          count++;
          for (int next : graph.get(curr)) {
            inDegree[next]--;
            if (inDegree[next] == 0) queue.offer(next);
          }
        }
        return count == numCourses;
      }

    }

    // --- #158 Word Ladder (127) | source: DSA/java/leetcode/hard/WordLadder.java ---
    static class WordLadder {

      int ladderLength(String beginWord, String endWord, List<String> wordList) {
        Queue<String> queue = new LinkedList<>();
        queue.add(beginWord);
        queue.add(null);

        // Mark visited word
        Set<String> visited = new HashSet<>();
        visited.add(beginWord);

        int level = 1;

        while (!queue.isEmpty()) {
          String word = queue.poll();

          if (word == null) {
            level++;
            if (!queue.isEmpty())
              queue.add(null);
            continue;
          }

          // Found the end word
          if (word.equals(endWord)) return level;

          // Modify each character (so word distance is 1)
          for (int i = 0; i < word.length(); i++) {
            char[] chars = word.toCharArray();
            for (char c = 'a'; c <= 'z'; c++) {
              chars[i] = c;
              String nextWord = new String(chars);

              // Put it in the queue
              if (wordList.contains(nextWord) && !visited.contains(nextWord)) {
                visited.add(nextWord);
                queue.offer(nextWord);
              }
            }
          }
        }

        return 0;
      }

    }

    // --- #97 Jump Game III (1306) | source: DSA/java/leetcode/medium/JumpGameIII.java ---
    static class JumpGameIII {

      boolean canReach(int[] arr, int start) {

        Queue<Integer> q = new LinkedList<>();
        q.add(start);

        while (!q.isEmpty()) {
          int curr = q.poll();

          // reached the target index
          if (arr[curr] == 0)
            return true;

          // negative means we already tried it
          if (arr[curr] < 0)
            continue;

          // Try both directions
          if (curr + arr[curr] < arr.length) q.add(curr + arr[curr]);

          if (curr - arr[curr] >= 0) q.add(curr - arr[curr]);

          // mark this element as visited
          arr[curr] = -arr[curr];
        }

        return false;
      }

    }

    // --- #138 Number of Islands (200, BFS version) | source: DSA/java/leetcode/medium/NumberOfIslands.java ---
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

    // --- #142 01 Matrix (542, BFS in the video; the code uses DP) | source: DSA/java/leetcode/medium/UpdateMatrix.java ---
    static class UpdateMatrix {

      int[][] updateMatrix(int[][] mat) {
        int rows = mat.length;
        int cols = mat[0].length;
        int[][] result = new int[rows][cols];

        // Initialize the result matrix with maximum values
        for (int i = 0; i < rows; i++)
          for (int j = 0; j < cols; j++)
            result[i][j] = Integer.MAX_VALUE;

        // First pass: top-left to bottom-right
        for (int i = 0; i < rows; i++)
          for (int j = 0; j < cols; j++)
            if (mat[i][j] == 0) result[i][j] = 0;
            else {
              if (i > 0)
                result[i][j] = Math.min(result[i][j], result[i - 1][j] + 1);
              if (j > 0)
                result[i][j] = Math.min(result[i][j], result[i][j - 1] + 1);
            }

        // Second pass: bottom-right to top-left
        for (int i = rows - 1; i >= 0; i--)
          for (int j = cols - 1; j >= 0; j--)
            if (mat[i][j] != 0) {
              if (i < rows - 1)
                result[i][j] = Math.min(result[i][j], result[i + 1][j] + 1);
              if (j < cols - 1)
                result[i][j] = Math.min(result[i][j], result[i][j + 1] + 1);
            }

        return result;
      }

    }
    // ===== End of playlist solutions =====
}
