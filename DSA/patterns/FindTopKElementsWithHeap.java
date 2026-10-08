package patterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.Comparator;
import java.util.PriorityQueue;

public class FindTopKElementsWithHeap {

    // min-heap keeps the k largest; use Comparator.reverseOrder() for the k smallest
    static final Comparator<Integer> CRITERIA = Comparator.naturalOrder();

    public static void main(String[] args) {

    }

    public int[] fn(int[] arr, int k) {
        PriorityQueue<Integer> heap = new PriorityQueue<>(CRITERIA);
        for (int num : arr) {
            heap.add(num);
            if (heap.size() > k) {
                heap.remove();
            }
        }

        int[] ans = new int[k];
        for (int i = 0; i < k; i++) {
            ans[i] = heap.remove();
        }

        return ans;
    }

}
