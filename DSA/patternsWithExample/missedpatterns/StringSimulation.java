package patternsWithExample.missedpatterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #73 Length of Last Word (58), #81 Shuffle String (1528)

public class StringSimulation {

    // Pattern: Plain index-by-index string processing; no special data structure needed.

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #73 Length of Last Word (58) | source: DSA/java/leetcode/easy/LengthOfLastWord.java ---
    static class LengthOfLastWord {

      int lengthOfLastWord(String s) {

        int count = 0;

        for (int i = s.length() - 1; i >= 0; i--) {

          // a letter is found so count
          if (s.charAt(i) != ' ') {
            count++;
          }
          else {
            // it's a white space instead
            // Did we already started to count a word ?
            // Yes so we found the last word
            if (count > 0)
              return count;
          }
        }

        return count;
      }

    }

    // --- #81 Shuffle String (1528) | source: DSA/java/leetcode/easy/ShuffleString.java ---
    static class ShuffleString {

      String restoreString(String s, int[] indices) {

        // Character array to form final string
        char[] str = new char[s.length()];

        // Do what the question says
        for (int i = 0; i < s.length(); i++) {
          str[indices[i]] = s.charAt(i);
        }

        // Return the restored string
        return String.valueOf(str);
      }

    }
    // ===== End of playlist solutions =====

}
