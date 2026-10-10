package patterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

public class BuildAprefixSum {

    public static void main(String[] args) {
        
    }

    public int[] fn(int[] arr) {
        int[] prefix = new int[arr.length];
        if (arr.length == 0) {
            return prefix;
        }
        prefix[0] = arr[0];
    
        for (int i = 1; i < arr.length; i++) {
            prefix[i] = prefix[i - 1] + arr[i];
        }
    
        return prefix;
    }
    
}
