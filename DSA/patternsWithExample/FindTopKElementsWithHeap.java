package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.Arrays;
import java.util.Comparator;
import java.util.PriorityQueue;

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

}
