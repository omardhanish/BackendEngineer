package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

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

}
