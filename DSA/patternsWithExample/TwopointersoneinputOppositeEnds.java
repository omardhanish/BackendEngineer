package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

public class TwopointersoneinputOppositeEnds {

    //Two pointers: one input, opposite ends
    // Example: count pairs in a SORTED array that add up to target
    // arr = [1, 2, 4, 6, 8, 9], target = 10
    // CONDITION = (sum < target): too small -> move left up, otherwise move right down
    // Expected: 3  (1+9, 2+8, 4+6)

    int target = 10;

    public static void main(String[] args) {
        int[] arr = {1, 2, 4, 6, 8, 9};
        System.out.println("Pairs = " + new TwopointersoneinputOppositeEnds().fn(arr)); // 3
    }

    public int fn(int[] arr) {
        int left = 0;
        int right = arr.length - 1;
        int ans = 0;

        while (left < right) {
            // do some logic here with left and right
            int sum = arr[left] + arr[right];
            if (sum == target) {
                ans++;
            }
            System.out.println("  left=" + left + "(" + arr[left] + ") right=" + right + "(" + arr[right] + ") sum=" + sum
                    + (sum == target ? "  MATCH" : "") + (sum < target ? "  -> left++" : "  -> right--"));
            if (sum < target) {
                left++;
            } else {
                right--;
            }
        }

        return ans;
    }

}
