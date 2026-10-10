package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;
import java.util.*;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #41 Average of Levels (637), #141 Right Side View (199), #66 Zigzag Traversal (103), #123 Symmetric Tree (101), #47 Max Depth (104), #49 Min Depth (111), #57 Same Tree (100)

public class BinaryTreeBFS {

    // Example: count the levels of the tree (level-order traversal)
    //        1
    //      /   \
    //     2     3
    //    / \     \
    //   4   5     6
    // Expected: levels [1] [2, 3] [4, 5, 6] -> 3 levels

    public static void main(String[] args) {
        System.out.println("Number of levels = " + new BinaryTreeBFS().fn(TreeNode.sampleTree())); // 3
    }

    public int fn(TreeNode root) {
        Queue<TreeNode> queue = new LinkedList<>();
        queue.add(root);
        int ans = 0;

        while (!queue.isEmpty()) {
            int currentLength = queue.size();
            // do logic for current level
            ans++;
            List<Integer> level = new ArrayList<>();

            for (int i = 0; i < currentLength; i++) {
                TreeNode node = queue.remove();
                // do logic
                level.add(node.val);
                if (node.left != null) {
                    queue.add(node.left);
                }
                if (node.right != null) {
                    queue.add(node.right);
                }
            }
            System.out.println("  level " + ans + ": " + level);
        }

        return ans;
    }

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #41 Average of Levels (637) | source: DSA/java/leetcode/easy/AverageOfLevelsInBinaryTree.java ---
    static class AverageOfLevelsInBinaryTree {

      public List<Double> averageOfLevels(TreeNode root) {

        Queue<TreeNode> levelQueue = new LinkedList<>();
        levelQueue.add(root);
        levelQueue.add(null);

        List<Double> avgList = new ArrayList<>();

        while (levelQueue.peek() != null) {

          double sum = 0;
          int nodes = 0;

          while (levelQueue.peek() != null) {

            TreeNode node = levelQueue.poll();
            sum += node.val;
            nodes++;

            if (node.left != null) levelQueue.add(node.left);
            if (node.right != null) levelQueue.add(node.right);
          }

          levelQueue.add(levelQueue.poll());
          avgList.add(sum / nodes);
        }

        return avgList;
      }

    }

    // --- #141 Right Side View (199) | source: DSA/java/leetcode/medium/BinaryTreeRightSideView.java ---
    static class BinaryTreeRightSideView {

      List<Integer> rightSideView(TreeNode root) {

        List<Integer> result = new ArrayList<>();
        if (root == null) return result;

        Queue<TreeNode> queue = new LinkedList<>();
        queue.offer(root);

        while (!queue.isEmpty()) {
          int levelSize = queue.size();  // Number of nodes at the current level
          int lastValue = 0;  // Store the last node's value of the level

          for (int i = 0; i < levelSize; i++) {
            TreeNode node = queue.poll();
            lastValue = node.val;  // Update lastValue with the current node

            // Add child nodes to queue for next level processing
            if (node.left != null) queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
          }

          result.add(lastValue);  // Add the last node's value of this level
        }

        return result;
      }

    }

    // --- #66 Zigzag Traversal (103) | source: DSA/java/leetcode/medium/BinaryTreeZigzagLevelOrderTraversal.java ---
    /**
     * Created by nikoo28 on 2019-08-24 18:30
     */

    static class BinaryTreeZigzagLevelOrderTraversal {

      List<List<Integer>> zigzagLevelOrder(TreeNode root) {

        List<List<Integer>> zigzag = new ArrayList<>();
        if (root == null) return zigzag;

        Queue<TreeNode> queue = new LinkedList<>();
        queue.add(root);
        boolean flag = false;

        while (!queue.isEmpty()) {

          int size = queue.size();
          List<Integer> level = new ArrayList<>();
          Stack<Integer> reverseStack = new Stack<>();
          for (int i = 0; i < size; i++) {
            TreeNode node = queue.poll();

            // Check flag
            if (flag)
              reverseStack.add(node.val);
            else
              level.add(node.val);

            if (node.left != null) queue.add(node.left);
            if (node.right != null) queue.add(node.right);
          }
          flag = !flag;

          // Pop all elements from stack
          while (!reverseStack.isEmpty())
            level.add(reverseStack.pop());

          zigzag.add(level);
        }

        return zigzag;
      }

    }

    // --- #123 Symmetric Tree (101) | source: DSA/java/leetcode/easy/SymmetricTree.java ---
    /**
     * Created by nikoo28 on 10/19/19 3:50 PM
     */

    static class SymmetricTree {

      // iterative method to determine if a binary tree is symmetric
      // using 2 queues
      boolean isSymmetric(TreeNode root) {

          if (root == null) return true;

          Queue<TreeNode> leftTree = new LinkedList<>();
          Queue<TreeNode> rightTree = new LinkedList<>();

          leftTree.add(root.left);
          rightTree.add(root.right);

          while (!leftTree.isEmpty() && !rightTree.isEmpty()) {

            TreeNode leftNode = leftTree.poll();
            TreeNode rightNode = rightTree.poll();

            if (leftNode == null && rightNode == null) continue;

            if (leftNode == null || rightNode == null) return false;

            if (leftNode.val != rightNode.val) return false;

            // Pushing order is very important
            leftTree.add(leftNode.left);
            leftTree.add(leftNode.right);
            rightTree.add(rightNode.right);
            rightTree.add(rightNode.left);
          }

          return true;
      }

    }

    // --- #47 Max Depth (104) | source: DSA/java/leetcode/easy/MaximumDepthOfABinaryTree.java ---
    /**
     * @author nikoo28 on 9/16/17
     */
    static class MaximumDepthOfABinaryTree {

      int maxDepth(TreeNode root) {

        if (root == null)
          return 0;

        Queue<TreeNode> nodes = new LinkedList<>();

        nodes.add(root);
        int levels = 0;

        while (!nodes.isEmpty()) {

          levels++;
          int size = nodes.size();
          for (int i = 0; i < size; i++) {
            TreeNode poppedNode = nodes.poll();
            if (poppedNode.left != null) nodes.add(poppedNode.left);
            if (poppedNode.right != null) nodes.add(poppedNode.right);
          }

        }

        return levels;
      }
    }

    // --- #49 Min Depth (111) | source: DSA/java/leetcode/easy/MinimumDepthBinaryTree.java ---
    static class MinimumDepthBinaryTree {

      int minDepth(TreeNode root) {
        if (root == null)
          return 0;

        int depth = 1;
        Queue<TreeNode> q = new LinkedList<TreeNode>();
        q.offer(root);

        // Level order traversal
        while (!q.isEmpty()) {
          int size = q.size();
          for (int i = 0; i < size; i++) {
            TreeNode node = q.poll();

            // If a leaf node is found just return depth
            if (node.left == null && node.right == null) {
              return depth;
            }
            if (node.left != null) {
              q.offer(node.left);
            }
            if (node.right != null) {
              q.offer(node.right);
            }
          }
          depth++;
        }
        return depth;
      }

    }

    // --- #57 Same Tree (100) | source: DSA/java/leetcode/easy/SameTree.java ---
    static class SameTree {

      boolean isSameTree(TreeNode root1, TreeNode root2) {

        Queue<TreeNode> queue = new LinkedList<>();
        queue.add(root1);
        queue.add(root2);

        // Loop till the queue is not empty
        while (!queue.isEmpty()) {
          TreeNode first = queue.poll();
          TreeNode second = queue.poll();

          // Check for equality
          if (first == null && second == null) {
            continue;
          } else if (
              first == null || second == null || first.val != second.val) {
            return false;
          }

          // Add other nodes
          queue.add(first.left);
          queue.add(second.left);
          queue.add(first.right);
          queue.add(second.right);
        }
        return true;
      }

    }
    // ===== End of playlist solutions =====
}
