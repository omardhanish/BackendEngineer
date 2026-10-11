package patternsWithExample.missedpatterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #5 Longest Palindromic Sub-string (5), #133 Palindromic Substrings (647)

public class ExpandAroundCenter {

    // Pattern: Every palindrome has a center: expand left/right from each index (odd) and each gap (even).

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #5 Longest Palindromic Sub-string (5) | source: DSA/java/leetcode/medium/LongestPalindromicSubstring.java ---
    /**
     * Created by nikoo28 on 12/18/17 10:14 PM
     */

    static class LongestPalindromicSubstring {

      String longestPalindrome(String str) {

        if (str.length() <= 1)
          return str;

        String LPS = "";

        for (int i = 1; i < str.length(); i++) {

          // Consider odd length
          int low = i;
          int high = i;
          while(str.charAt(low) == str.charAt(high)) {
            low--;
            high++;

            if (low == -1 || high == str.length())
              break;
          }

          String palindrome = str.substring(low+1, high);
          if (palindrome.length() > LPS.length()) {
            LPS = palindrome;
          }

          // Consider even length
          low = i-1;
          high = i;
          while(str.charAt(low) == str.charAt(high)) {
            low--;
            high++;

            if (low == -1 || high == str.length())
              break;
          }

          palindrome = str.substring(low+1, high);
          if (palindrome.length() > LPS.length()) {
            LPS = palindrome;
          }
        }

        return LPS;
      }

    }

    // --- #133 Palindromic Substrings (647) | source: DSA/java/leetcode/medium/PalindromicSubstrings.java ---
    static class PalindromicSubstrings {

      int countSubstrings(String s) {

        int count = 0;

        for (int i = 0; i < s.length(); i++) {

          // Count palindromes with odd length
          count += countPalindromes(s, i, i);

          // Count palindromes with even length
          count += countPalindromes(s, i, i + 1);
        }

        return count;

      }

      private int countPalindromes(String s, int left, int right) {

        int count = 0;

        // Check for palindromes
        while (left >= 0 && right < s.length()
            && s.charAt(left) == s.charAt(right)) {
          count++;
          left--;
          right++;
        }

        return count;
      }

    }
    // ===== End of playlist solutions =====

}
