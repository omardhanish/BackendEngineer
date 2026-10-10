package patternsWithExample;

import java.util.Stack;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #1 Diameter of Binary Tree (543), #68 Subtree of Another Tree (572), #48 House Robber III (337), #64 Validate BST (98, no code file here)

public class BinaryTreeDFSRecursive {

    // Example: sum of all node values
    //        1
    //      /   \
    //     2     3
    //    / \     \
    //   4   5     6
    // Expected: 21

    public static void main(String[] args) {
        System.out.println("Sum = " + new BinaryTreeDFSRecursive().dfs(TreeNode.sampleTree())); // 21
    }

    public int dfs(TreeNode root) {
        if (root == null) {
            return 0;
        }

        int ans = 0;
        // do logic
        ans += root.val;
        System.out.println("  enter " + root.val);
        ans += dfs(root.left);
        ans += dfs(root.right);
        System.out.println("  leave " + root.val + "  subtree sum = " + ans);
        return ans;
    }

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #1 Diameter of Binary Tree (543) | source: DSA/java/leetcode/DiameterOfBinaryTree.java ---
    /**
     * Created by nikoo28 on 9/23/18 11:07 PM
     */

    static class DiameterOfBinaryTree {

      private int ans;

      public int diameterOfBinaryTree(TreeNode root) {

        ans = 1;
        depth(root);
        return ans - 1;
      }

      private int depth(TreeNode root) {
        if (root == null)
          return 0;

        int left = depth(root.left);
        int right = depth(root.right);
        ans = Math.max(ans, left + right + 1);
        return Math.max(left, right) + 1;
      }

    }

    // --- #68 Subtree of Another Tree (572) | source: DSA/java/leetcode/medium/SubtreeOfAnotherTree.java ---
    static class SubtreeOfAnotherTree {

      String preOrderTraversal(TreeNode node) {
        if (node == null) {
          return "null";
        }

        StringBuilder sb = new StringBuilder("^");
        sb.append(node.val);
        sb.append(preOrderTraversal(node.left));
        sb.append(preOrderTraversal(node.right));

        return sb.toString();
      }

      boolean isSubtree(TreeNode root, TreeNode subRoot) {

        String fullTree = preOrderTraversal(root);
        String subTree = preOrderTraversal(subRoot);

        return (fullTree.contains(subTree));
      }

    }

    // --- #48 House Robber III (337) | source: DSA/java/leetcode/medium/HouseRobberIII.java ---
    static class HouseRobberIII {

      int rob(TreeNode root) {

        int[] options = travel(root);
        return Math.max(options[0], options[1]);
      }

      private int[] travel(TreeNode root) {
        // Base case. just return {0,0} as you cannot rob anything
        if (root == null)
          return new int[2];

        int[] left_node_choices = travel(root.left);
        int[] right_node_choices = travel(root.right);
        int[] options = new int[2];

        // Store value if looted in [0]
        options[0] = root.val + left_node_choices[1] + right_node_choices[1];

        // Store value if skipped in [1]
        options[1] = Math.max(left_node_choices[0], left_node_choices[1]) +
                      Math.max(right_node_choices[0], right_node_choices[1]);

        return options;
      }

    }
    // ===== End of playlist solutions =====
}
