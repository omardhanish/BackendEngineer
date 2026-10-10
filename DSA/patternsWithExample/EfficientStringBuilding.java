package patternsWithExample;

import java.util.Arrays;
import java.util.Stack;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #115 Reverse Prefix of Word (2000), #32 Decode String (394), #23 Longest Common Prefix (14), #40 Backspace String Compare (844)

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

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #115 Reverse Prefix of Word (2000) | source: DSA/java/leetcode/easy/ReversePrefixOfWord.java ---
    static class ReversePrefixOfWord {

      String reversePrefix(String word, char ch) {

        int firstOccurrence = word.indexOf(ch);
        if (firstOccurrence == -1)
          return word;

        Stack<Character> charStack = new Stack<>();

        // Add all elements to stack
        for (int i = 0; i <= firstOccurrence; i++)
          charStack.push(word.charAt(i));

        StringBuilder result = new StringBuilder();

        // POP elements of stack
        while (!charStack.isEmpty())
          result.append(charStack.pop());

        // Add all remaining chars
        for (int i = (firstOccurrence + 1); i < word.length(); i++)
          result.append(word.charAt(i));

        return result.toString();
      }

    }

    // --- #32 Decode String (394) | source: DSA/java/leetcode/medium/DecodeString.java ---
    static class DecodeString {

      public String decodeString(String s) {

        Stack<Integer> numStack = new Stack<>();
        Stack<String> stringStack = new Stack<>();
        int k = 0;

        for (char c : s.toCharArray()) {

          if (Character.isDigit(c)) {
            k = (k * 10) + (c - '0');
            continue;
          }

          if (c == '[') {
            numStack.push(k);
            k = 0;
            stringStack.push(String.valueOf(c));
            continue;
          }

          if (c != ']') {
            stringStack.push(String.valueOf(c));
            continue;
          }

          StringBuilder temp = new StringBuilder();
          while (!stringStack.peek().equals("["))
            temp.insert(0, stringStack.pop());

          // remove the "["
          stringStack.pop();

          // Get the new string
          StringBuilder replacement = new StringBuilder();
          int count = numStack.pop();
          for (int i = 0; i < count; i++)
            replacement.append(temp);

          // Add it to the stack
          stringStack.push(replacement.toString());
        }

        StringBuilder result = new StringBuilder();
        while (!stringStack.empty()) {
          result.insert(0, stringStack.pop());
        }
        return result.toString();
      }

    }

    // --- #23 Longest Common Prefix (14) | source: DSA/java/leetcode/easy/LongestCommonPrefix.java ---
    static class LongestCommonPrefix {

      public String longestCommonPrefix(String[] strs) {

        StringBuilder result = new StringBuilder();

        // Sort the array
        Arrays.sort(strs);

        // Get the first and last strings
        char[] first = strs[0].toCharArray();
        char[] last = strs[strs.length - 1].toCharArray();

        // Start comparing
        for (int i = 0; i < first.length; i++) {
          if (first[i] != last[i])
            break;
          result.append(first[i]);
        }

        return result.toString();
      }

    }

    // --- #40 Backspace String Compare (844) | source: DSA/java/leetcode/easy/BackspaceStringCompare.java ---
    static class BackspaceStringCompare {

      boolean backspaceCompare(String s, String t) {
        return getActual(s).equals(getActual(t));
      }

      private String getActual(String input) {

        StringBuilder actualString = new StringBuilder();
        int hashCount = 0;

        for (int i = input.length() - 1; i >= 0 ; i--) {

          // Keep a count of backspace characters
          if (input.charAt(i) == '#') {
            hashCount++;
            continue;
          }

          // If backspace count > 0 reduce it and skip the character
          if (hashCount > 0) {
            hashCount--;
          } else {
            // If no backspace, just insert at beginning
            actualString.insert(0, input.charAt(i));
          }
        }

        return actualString.toString();
      }
    }
    // ===== End of playlist solutions =====
}
