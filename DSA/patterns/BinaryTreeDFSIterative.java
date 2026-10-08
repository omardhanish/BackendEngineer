package patterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.Stack;

public class BinaryTreeDFSIterative {

    public static void main(String[] args) {
        
    }

    public int dfs(TreeNode root) {
        Stack<TreeNode> stack = new Stack<>();
        stack.push(root);
        int ans = 0;
    
        while (!stack.empty()) {
            TreeNode node = stack.pop();
            // do logic
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
