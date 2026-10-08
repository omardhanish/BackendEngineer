package patterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

public class TwopointersTwoInputsExhaustBoth {

    boolean CONDITION = false;
    //Two pointers: two inputs, exhaust both
    // just for reference, replace with your problem's logic
    
    public static void main(String[] args) {
        
    }

    public int fn(int[] arr1, int[] arr2) {
        int i = 0, j = 0, ans = 0;
    
        while (i < arr1.length && j < arr2.length) {
            // do some logic here
            if (CONDITION) {
                i++;
            } else {
                j++;
            }
        }
    
        while (i < arr1.length) {
            // do logic
            i++;
        }
    
        while (j < arr2.length) {
            // do logic
            j++;
        }
    
        return ans;
    }
    
}
