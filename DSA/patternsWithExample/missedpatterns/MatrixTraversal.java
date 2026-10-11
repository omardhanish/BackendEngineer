package patternsWithExample.missedpatterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #12 Rotate Image (48), #61 Spiral Matrix (54), #53 Set Matrix Zeroes (73), #52 Count Servers that Communicate (1267), #119 Matrix Diagonal Sum (1572)

public class MatrixTraversal {

    // Pattern: Walk a 2D grid by index: layers, diagonals, row/column markers, transpose + reverse.

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #12 Rotate Image (48) | source: DSA/java/leetcode/medium/RotateImage.java ---
    /**
     * Created by nikoo28 on 7/20/19 2:28 PM
     */

    static class RotateImage {

      public int[][] rotate2(int[][] matrix) {

        // Transpose the matrix
        for (int i = 0; i < matrix.length; i++) {
          for (int j = i + 1; j < matrix.length; j++) {
            int temp = matrix[i][j];
            matrix[i][j] = matrix[j][i];
            matrix[j][i] = temp;
          }
        }

        // Reverse each row
        for (int i = 0; i < matrix.length; i++) {
          for (int j = 0; j < matrix.length / 2; j++) {
            int temp = matrix[i][j];
            matrix[i][j] = matrix[i][matrix.length - j - 1];
            matrix[i][matrix.length - j - 1] = temp;
          }
        }

        return matrix;
      }

      public void rotate(int[][] matrix) {

        int n = matrix.length;

        for (int i = 0; i < (n + 1) / 2; i ++) {

          for (int j = 0; j < n / 2; j++) {
            // Start 4 way swaps
            // temp = bottom left
            int temp = matrix[n - 1 - j][i];

            // bottom left = bottom right
            matrix[n - 1 - j][i] = matrix[n - 1 - i][n - j - 1];

            // bottom right = top right
            matrix[n - 1 - i][n - j - 1] = matrix[j][n - 1 -i];

            // top right = top left
            matrix[j][n - 1 - i] = matrix[i][j];

            // top left = temp
            matrix[i][j] = temp;
          }
        }
      }

    }

    // --- #61 Spiral Matrix (54) | source: DSA/java/leetcode/medium/SpiralMatrix.java ---
    /**
     * Created by nikoo28 on 2019-08-24 16:45
     */

    static class SpiralMatrix {

      List<Integer> spiralOrder(int[][] matrix) {

        List<Integer> res = new ArrayList<>();

        if (matrix.length == 0) {
          return res;
        }

        int rowBegin = 0;
        int rowEnd = matrix.length - 1;
        int colBegin = 0;
        int colEnd = matrix[0].length - 1;

        while (rowBegin <= rowEnd && colBegin <= colEnd) {
          // Traverse Right
          for (int j = colBegin; j <= colEnd; j++) {
            res.add(matrix[rowBegin][j]);
          }
          rowBegin++;

          // Traverse Down
          for (int j = rowBegin; j <= rowEnd; j++) {
            res.add(matrix[j][colEnd]);
          }
          colEnd--;

          if (rowBegin <= rowEnd) {
            // Traverse Left
            for (int j = colEnd; j >= colBegin; j--) {
              res.add(matrix[rowEnd][j]);
            }
          }
          rowEnd--;

          if (colBegin <= colEnd) {
            // Traverse Up
            for (int j = rowEnd; j >= rowBegin; j--) {
              res.add(matrix[j][colBegin]);
            }
          }
          colBegin++;
        }

        return res;
      }
    }

    // --- #53 Set Matrix Zeroes (73) | source: DSA/java/leetcode/medium/SetMatrixZeroes.java ---
    /**
     * Created by nikoo28 on 2019-07-21 15:15
     */

    static class SetMatrixZeroes {

      public void setZeroes(int[][] matrix) {
        boolean firstRow = false, firstCol = false;

        // Set markers in first row and first column
        for (int i = 0; i < matrix.length; i++)
          for (int j = 0; j < matrix[0].length; j++)
            if (matrix[i][j] == 0) {
              if (i == 0) firstRow = true;
              if (j == 0) firstCol = true;
              matrix[0][j] = 0;
              matrix[i][0] = 0;
            }

        // Replace inner matrix
        for (int i = 1; i < matrix.length; i++)
          for (int j = 1; j < matrix[0].length; j++)
            if (matrix[i][0] == 0 || matrix[0][j] == 0)
              matrix[i][j] = 0;

        // Last remaining checks
        if (firstRow)
          for (int j = 0; j < matrix[0].length; j++)
            matrix[0][j] = 0;

        if (firstCol)
          for (int i = 0; i < matrix.length; i++)
            matrix[i][0] = 0;
      }
    }

    // --- #52 Count Servers that Communicate (1267) | source: DSA/java/leetcode/medium/CountServersThatCommunicate.java ---
    static class CountServersThatCommunicate {

      int countServers(int[][] grid) {

        int rows = grid.length;
        int cols = rows == 0 ? 0 : grid[0].length;

        int[] rowCount = new int[rows];
        int[] colCount = new int[cols];

        int servers = 0;

        for (int row = 0; row < rows; row++)
          for (int col = 0; col < cols; col++)
            if (grid[row][col] == 1) {
              ++rowCount[row];
              ++colCount[col];
            }

        for (int row = 0; row < rows; row++)
          for (int col = 0; col < cols; col++)
            if (grid[row][col] == 1 && (rowCount[row] > 1 || colCount[col] > 1)) {
              ++servers;
            }

        return servers;
      }
    }

    // --- #119 Matrix Diagonal Sum (1572) | source: DSA/java/leetcode/easy/MatrixDiagonalSum.java ---
    static class MatrixDiagonalSum {

      int diagonalSum(int[][] mat) {

        int sum = 0;
        int n = mat.length;

        // Get the sum of both diagonals
        for (int i = 0; i < n; i++) {
          sum += mat[i][i];
          sum += mat[i][n - i - 1];
        }

        // If the matrix is odd
        // Subtract the duplicate element
        if (n % 2 != 0) {
          sum -= mat[n / 2][n / 2];
        }

        return sum;
      }

    }
    // ===== End of playlist solutions =====

}
