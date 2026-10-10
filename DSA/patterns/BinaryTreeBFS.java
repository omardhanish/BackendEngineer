package patterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.LinkedList;
import java.util.Queue;

public class BinaryTreeBFS {

    public static void main(String[] args) {
        
    }

    public int fn(TreeNode root) {
        if (root == null) {
            return 0;
        }
        Queue<TreeNode> queue = new LinkedList<>();
        queue.add(root);
        int ans = 0;
    
        while (!queue.isEmpty()) {
            int currentLength = queue.size();
            // do logic for current level
    
            for (int i = 0; i < currentLength; i++) {
                TreeNode node = queue.remove();
                // do logic
                if (node.left != null) {
                    queue.add(node.left);
                }
                if (node.right != null) {
                    queue.add(node.right);
                }
            }
        }
    
        return ans;
    }
    
}
