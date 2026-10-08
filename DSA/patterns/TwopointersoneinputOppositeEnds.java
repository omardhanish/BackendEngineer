package patterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

public class TwopointersoneinputOppositeEnds {
    //Two pointers: one input, opposite ends

    // just for reference, replace with your problem's logic
    boolean CONDITION = false;


    public static void main(String[] args) {
        
    }

    public int fn(int[] arr) {
        int left = 0;
        int right = arr.length - 1;
        int ans = 0;
    
        while (left < right) {
            // do some logic here with left and right
            if (CONDITION) {
                left++;
            } else {
                right--;
            }
        }
    
        return ans;
    }
    
}
