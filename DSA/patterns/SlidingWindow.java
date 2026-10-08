package patterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

public class SlidingWindow {

    boolean WINDOW_CONDITION_BROKEN = false;
    //Sliding window: track a window over an array/string

    public static void main(String[] args) {
        
    }

    public int fn(int[] arr) {
        int left = 0, ans = 0, curr = 0;
    
        for (int right = 0; right < arr.length; right++) {
            // do logic here to add arr[right] to curr
    
            while (WINDOW_CONDITION_BROKEN) {
                // remove arr[left] from curr
                left++;
            }
    
            // update ans
        }
    
        return ans;
    }
    
}
