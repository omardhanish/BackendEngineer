package patterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

public class EfficientStringBuilding {

    public static void main(String[] args) {
        
    }


    public String fn(char[] arr) {
        StringBuilder sb = new StringBuilder();
        for (char c: arr) {
            sb.append(c);
        }
    
        return sb.toString();
    }
    
}
