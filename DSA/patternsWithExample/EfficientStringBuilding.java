package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

public class EfficientStringBuilding {

    // Example: ['h', 'e', 'l', 'l', 'o'] -> "hello"
    // StringBuilder appends in place; s = s + c would copy the whole string every time.

    public static void main(String[] args) {
        char[] arr = {'h', 'e', 'l', 'l', 'o'};
        System.out.println("Result = \"" + new EfficientStringBuilding().fn(arr) + "\""); // "hello"
    }

    public String fn(char[] arr) {
        StringBuilder sb = new StringBuilder();
        for (char c: arr) {
            sb.append(c);
            System.out.println("  append '" + c + "' -> " + sb);
        }

        return sb.toString();
    }

}
