package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

public class SlidingWindow {

    // Example: longest subarray with sum <= k
    // arr = [3, 1, 2, 7, 4, 2, 1, 1, 5], k = 8
    // curr = sum of the window; WINDOW_CONDITION_BROKEN = (curr > k)
    // Expected: 4  ([4, 2, 1, 1])

    int k = 8;

    //Sliding window: track a window over an array/string
    public static void main(String[] args) {
        int[] arr = {3, 1, 2, 7, 4, 2, 1, 1, 5};
        System.out.println("Longest length = " + new SlidingWindow().fn(arr)); // 4
    }

    public int fn(int[] arr) {
        int left = 0, ans = 0, curr = 0;

        for (int right = 0; right < arr.length; right++) {
            // do logic here to add arr[right] to curr
            curr += arr[right];
            System.out.println("  add arr[" + right + "]=" + arr[right] + " -> sum " + curr);

            while (curr > k) {
                // remove arr[left] from curr
                curr -= arr[left];
                System.out.println("    sum > " + k + ", remove arr[" + left + "]=" + arr[left] + " -> sum " + curr);
                left++;
            }

            // update ans
            ans = Math.max(ans, right - left + 1);
            System.out.println("    window [" + left + ".." + right + "] length " + (right - left + 1) + "  best " + ans);
        }

        return ans;
    }

}
