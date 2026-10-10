package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.Stack;
import java.util.Deque;
import java.util.LinkedList;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #58 Invert Binary Tree (226), #50 Path Sum (112)

public class BinaryTreeDFSIterative {

    // Example: sum of all node values
    //        1
    //      /   \
    //     2     3
    //    / \     \
    //   4   5     6
    // Expected: 21

    public static void main(String[] args) {
        System.out.println("Sum = " + new BinaryTreeDFSIterative().dfs(TreeNode.sampleTree())); // 21
    }

    public int dfs(TreeNode root) {
        Stack<TreeNode> stack = new Stack<>();
        stack.push(root);
        int ans = 0;

        while (!stack.empty()) {
            TreeNode node = stack.pop();
            // do logic
            ans += node.val;
            System.out.println("  visit " + node.val + "  running sum = " + ans);
            if (node.left != null) {
                stack.push(node.left);
            }
            if (node.right != null) {
                stack.push(node.right);
            }
        }

        return ans;
    }

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #58 Invert Binary Tree (226) | source: DSA/java/leetcode/InvertBinaryTree.java ---
    /**
     * @author nikoo28 on 9/17/17
     */
    static class InvertBinaryTree {

      public TreeNode invertTree(TreeNode root) {

        if (root == null) {
          return null;
        }

        final Deque<TreeNode> stack = new LinkedList<>();
        stack.push(root);

        while (!stack.isEmpty()) {
          final TreeNode node = stack.pop();
          final TreeNode left = node.left;
          node.left = node.right;
          node.right = left;

          if (node.left != null) {
            stack.push(node.left);
          }
          if (node.right != null) {
            stack.push(node.right);
          }
        }
        return root;
      }

    }

    // --- #50 Path Sum (112) | source: DSA/java/leetcode/easy/PathSum.java ---
    static class PathSum {

      boolean hasPathSum(TreeNode root, int sum) {

        if (root == null)
          return false;

        // Create 2 stacks for the path and the sums
        Stack<TreeNode> path = new Stack<>();
        Stack<Integer> sumPath = new Stack<>();

        path.push(root);
        sumPath.push(root.val);

        while (!path.isEmpty()) {
          TreeNode temp = path.pop();
          int tempVal = sumPath.pop();

          // If a child node and we find the sum total, return true
          if (temp.left == null && temp.right == null && tempVal == sum)
            return true;

          if (temp.right != null) {
            path.push(temp.right);
            sumPath.push(temp.right.val + tempVal);
          }

          if (temp.left != null) {
            path.push(temp.left);
            sumPath.push(temp.left.val + tempVal);
          }

        }

        return false;
      }
    }
    // ===== End of playlist solutions =====
}
