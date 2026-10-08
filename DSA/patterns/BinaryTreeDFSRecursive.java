package patterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

public class BinaryTreeDFSRecursive {

    public static void main(String[] args) {
        
    }

    public int dfs(TreeNode root) {
        if (root == null) {
            return 0;
        }
    
        int ans = 0;
        // do logic
        dfs(root.left);
        dfs(root.right);
        return ans;
    }
    
}
