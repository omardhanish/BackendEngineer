package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.Arrays;
import java.util.Comparator;
import java.util.PriorityQueue;
import java.util.Collections;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #121 Last Stone Weight (1046) only

public class FindTopKElementsWithHeap {

    // Example: 3 largest of [5, 1, 9, 3, 7, 2] -> [5, 7, 9]
    // min-heap of size k: whenever it grows past k, drop the smallest.

    // min-heap keeps the k largest; use Comparator.reverseOrder() for the k smallest
    static final Comparator<Integer> CRITERIA = Comparator.naturalOrder();

    public static void main(String[] args) {
        int[] arr = {5, 1, 9, 3, 7, 2};
        System.out.println("Top 3 = " + Arrays.toString(new FindTopKElementsWithHeap().fn(arr, 3))); // [5, 7, 9]
    }

    public int[] fn(int[] arr, int k) {
        PriorityQueue<Integer> heap = new PriorityQueue<>(CRITERIA);
        for (int num : arr) {
            heap.add(num);
            System.out.print("  add " + num + " -> heap " + heap);
            if (heap.size() > k) {
                System.out.print("  size > " + k + ", remove " + heap.peek());
                heap.remove();
            }
            System.out.println();
        }

        int[] ans = new int[k];
        for (int i = 0; i < k; i++) {
            ans[i] = heap.remove();
        }

        return ans;
    }

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #121 Last Stone Weight (1046) | source: DSA/java/leetcode/easy/LastStoneWeight.java ---
    static class LastStoneWeight {

      int lastStoneWeight(int[] stones) {

        // Create a priority queue
        PriorityQueue<Integer> pq =
            new PriorityQueue<>(Collections.reverseOrder());

        // Add all stones to the priority queue
        for (int stone : stones)
          pq.add(stone);

        // While there are more than 1 stone
        while (pq.size() > 1) {

          // Get the two heaviest stones
          int y = pq.poll();
          int x = pq.poll();

          // If the stones are not equal
          if (x != y) {
            pq.add(y - x);
          }
        }

        return pq.isEmpty() ? 0 : pq.poll();
      }

    }
    // ===== End of playlist solutions =====
}
