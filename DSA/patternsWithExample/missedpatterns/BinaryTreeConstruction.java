package patternsWithExample.missedpatterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.HashMap;
import java.util.Map;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #76 Create Binary Tree from Pre-order and In-order Traversal (105), #77 Maximum Binary Tree (654), #157 Serialize and Deserialize a Binary Tree (297)

public class BinaryTreeConstruction {

    // Pattern: Build (or rebuild) a tree recursively: pick the root, split the input into left and right parts.

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #76 Create Binary Tree from Pre-order and In-order Traversal (105) | source: DSA/java/leetcode/medium/BinaryTreeFromPreorderInOrderTraversal.java ---
    static class BinaryTreeFromPreorderInOrderTraversal {

      TreeNode buildTree(int[] preOrder, int[] inOrder) {

        Map<Integer, Integer> inOrderIndexMap = new HashMap<>();
        for (int i = 0; i < inOrder.length; i++)
          inOrderIndexMap.put(inOrder[i], i);

        return splitTree(preOrder, inOrderIndexMap,
            0, 0, inOrder.length - 1);
      }

      private TreeNode splitTree(int[] preOrder, Map<Integer, Integer> inOrderIndexMap,
                                 int rootIndex, int left, int right) {

        TreeNode root = new TreeNode(preOrder[rootIndex]);

        // Create left and right subtree
        int mid = inOrderIndexMap.get(preOrder[rootIndex]);
        if (mid > left)
          root.left = splitTree(preOrder, inOrderIndexMap,
              rootIndex + 1, left, mid - 1);
        if (mid < right)
          root.right = splitTree(preOrder, inOrderIndexMap,
              rootIndex + mid - left + 1, mid + 1, right);
        return root;
      }

    }

    // --- #77 Maximum Binary Tree (654) | source: DSA/java/leetcode/medium/MaximumBinaryTree.java ---
    static class MaximumBinaryTree {

      TreeNode constructMaximumBinaryTree(int[] nums) {
        if (nums == null)
          return null;
        return build(nums, 0, nums.length - 1);
      }

      private TreeNode build(int[] nums, int start, int end) {
        if (start > end) return null;

        // Identify max index
        int idxMax = start;
        for (int i = start + 1; i <= end; i++)
          if (nums[i] > nums[idxMax])
            idxMax = i;

        // Create a root
        TreeNode root = new TreeNode(nums[idxMax]);

        // Assign left and right children
        root.left = build(nums, start, idxMax - 1);
        root.right = build(nums, idxMax + 1, end);

        return root;
      }

    }

    // --- #157 Serialize and Deserialize a Binary Tree (297) | source: DSA/java/leetcode/hard/SerializeAndDeserializeABinaryTree.java ---
    /**
     * Created by nikoo28 on 7/12/19 3:06 AM
     */

    static class SerializeAndDeserializeABinaryTree {

      // Encodes a tree to a single string.
      public String serialize(TreeNode root) {

        StringBuilder inOrderString = new StringBuilder();
        inOrder(root, inOrderString);

        StringBuilder preOrderString = new StringBuilder();
        preOrder(root, preOrderString);

        return inOrderString.toString() + preOrderString.toString();
      }

      private void inOrder(TreeNode root, StringBuilder inOrderString) {
        if (root == null)
          return;

        inOrder(root.left, inOrderString);
        inOrderString.append(root.val).append(":").append(root.hashCode()).append(",");
        inOrder(root.right, inOrderString);
      }

      private void preOrder(TreeNode root, StringBuilder preOrderString) {
        if (root == null)
          return;

        preOrderString.append(root.val).append(":").append(root.hashCode()).append(",");
        preOrder(root.left, preOrderString);
        preOrder(root.right, preOrderString);
      }

      // Decodes your encoded data to tree.
      public TreeNode deserialize(String data) {

        if (data == null || data.length() == 0)
          return null;

        String inOrderString = data.substring(0, data.length() / 2);
        String[] inOrderSplits = inOrderString.split(",");

        String preOrderString = data.substring(data.length() / 2);
        String[] preOrderSplits = preOrderString.split(",");

        String rootValAddress = preOrderSplits[0];
        int rootVal = Integer.parseInt(rootValAddress.split(":")[0]);

        StringBuilder inOrderStringLeft = new StringBuilder();
        StringBuilder preOrderStringLeft = new StringBuilder();

        StringBuilder inOrderStringRight = new StringBuilder();
        StringBuilder preOrderStringRight = new StringBuilder();

        boolean left = true;
        int j = 1;
        for (String inOrderSplit : inOrderSplits) {

          if (inOrderSplit.equals(rootValAddress)) {
            left = false;
            continue;
          }

          if (left) {
            inOrderStringLeft.append(inOrderSplit).append(",");
            preOrderStringLeft.append(preOrderSplits[j++]).append(",");
          } else {
            inOrderStringRight.append(inOrderSplit).append(",");
            preOrderStringRight.append(preOrderSplits[j++]).append(",");
          }
        }

        String leftData = null, rightData = null;
        if (inOrderStringLeft.length() > 0) {
          leftData = inOrderStringLeft.toString() + preOrderStringLeft.toString();
        }

        if (inOrderStringRight.length() > 0) {
          rightData = inOrderStringRight.toString() + preOrderStringRight.toString();
        }

        TreeNode root = new TreeNode(rootVal);
        root.left = deserialize(leftData);
        root.right = deserialize(rightData);

        return root;
      }
    }
    // ===== End of playlist solutions =====

}
