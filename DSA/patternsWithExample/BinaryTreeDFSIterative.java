package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.Stack;

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

}
