package leetcode.hard;

import java.util.*;

public class WordLadder {

  int ladderLength(String beginWord, String endWord, List<String> wordList) {
    Queue<String> queue = new LinkedList<>();
    queue.add(beginWord);
    queue.add(null);

    // Mark visited word
    Set<String> visited = new HashSet<>();
    visited.add(beginWord);

    int level = 1;

    while (!queue.isEmpty()) {
      String word = queue.poll();

      if (word == null) {
        level++;
        if (!queue.isEmpty())
          queue.add(null);
        continue;
      }

      // Found the end word
      if (word.equals(endWord)) return level;

      // Modify each character (so word distance is 1)
      for (int i = 0; i < word.length(); i++) {
        char[] chars = word.toCharArray();
        for (char c = 'a'; c <= 'z'; c++) {
          chars[i] = c;
          String nextWord = new String(chars);

          // Put it in the queue
          if (wordList.contains(nextWord) && !visited.contains(nextWord)) {
            visited.add(nextWord);
            queue.offer(nextWord);
          }
        }
      }
    }

    return 0;
  }

}
