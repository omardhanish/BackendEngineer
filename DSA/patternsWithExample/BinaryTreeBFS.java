package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;

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

}
