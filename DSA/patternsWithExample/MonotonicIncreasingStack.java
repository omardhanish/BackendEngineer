package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.Stack;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #31 Daily Temperatures (739), #30 Next Greater Element I (496), #10 Online Stock Span (901), #161 Sliding Window Maximum (239, deque)

public class MonotonicIncreasingStack {

    // Example: [2, 1, 5, 6, 2, 3]
    // Keep the stack increasing; every pop means "num is the next smaller element of the popped value".
    // ans = number of pops. Expected: 3  (1 pops 2; 2 pops 6 and 5)

    public static void main(String[] args) {
        int[] arr = {2, 1, 5, 6, 2, 3};
        System.out.println("Total pops = " + new MonotonicIncreasingStack().fn(arr)); // 3
    }

    public int fn(int[] arr) {
        Stack<Integer> stack = new Stack<>();
        int ans = 0;

        for (int num: arr) {
            // for monotonic decreasing, just flip the > to <
            while (!stack.empty() && stack.peek() > num) {
                // do logic
                ans++;
                System.out.println("  " + num + " < " + stack.peek() + " -> pop " + stack.peek());
                stack.pop();
            }

            stack.push(num);
            System.out.println("  push " + num + " -> stack " + stack);
        }

        return ans;
    }

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #31 Daily Temperatures (739) | source: DSA/java/leetcode/medium/DailyTemperatures.java ---
    static class DailyTemperatures {

      public int[] dailyTemperatures(int[] temperatures) {

        Stack<Integer> helperStack = new Stack<>();

        int n = temperatures.length;
        int[] result = new int[n];

        for(int idx = n - 1; idx >= 0; idx--) {

          // Popping all indices with a lower or equal
          // temperature than the current index
          while(!helperStack.isEmpty()
              && temperatures[idx] >= temperatures[helperStack.peek()]) {
            helperStack.pop();
          }

          // If the stack still has elements,
          // then the next warmer temperature exists!
          if(!helperStack.isEmpty()) {
            result[idx] = helperStack.peek() - idx;
          }

          // Inserting current index in the stack
          helperStack.push(idx);
        }

        return result;
      }

    }

    // --- #30 Next Greater Element I (496) | source: DSA/java/leetcode/easy/NextGreaterElementI.java ---
    static class NextGreaterElementI {

      public int[] nextGreaterElement(int[] nums1, int[] nums2) {

        if (nums2.length == 0 || nums1.length == 0)
          return new int[0];

        Map<Integer, Integer> numberNGE = new HashMap<>();
        Stack<Integer> numStack = new Stack<>();

        numStack.push(nums2[nums2.length - 1]);
        numberNGE.put(nums2[nums2.length - 1], -1);

        for (int i = nums2.length - 2; i >= 0; i--) {

          if (nums2[i] < numStack.peek()) {
            numberNGE.put(nums2[i], numStack.peek());
            numStack.push(nums2[i]);
            continue;
          }

          while (!numStack.isEmpty() && numStack.peek() < nums2[i])
            numStack.pop();

          if (numStack.isEmpty()) {
            numStack.push(nums2[i]);
            numberNGE.put(nums2[i], -1);
          } else {
            numberNGE.put(nums2[i], numStack.peek());
            numStack.push(nums2[i]);
          }
        }

        for (int i = 0; i < nums1.length; i++)
          nums1[i] = numberNGE.get(nums1[i]);

        return nums1;
      }

    }

    // --- #10 Online Stock Span (901) | source: DSA/java/leetcode/medium/OnlineStockSpan.java ---
    static class OnlineStockSpan {

      List<Integer> list;

      public OnlineStockSpan() {
        this.list = new ArrayList<>();
      }

      public int next(int price) {
        list.add(price);
        int count = 0;
        for (int i = list.size() - 1; i >= 0; i--) {
          if (list.get(i) > price)
            break;
          count++;
        }
        return count;
      }

      public int[] calculateSpans(int[] prices) {

        int[] spans = new int[prices.length];
        spans[0] = 1; // Span of first element is always 1

        Stack<Integer> indexStack = new Stack<>();

        // Push the index of first element
        indexStack.push(0);

        for (int i = 1; i < prices.length; i++) {
          while (!indexStack.isEmpty()
              && prices[indexStack.peek()] < prices[i])
            indexStack.pop();

          // If index stack is empty, the price at index 'i'
          // is greater than all previous values
          if (indexStack.isEmpty())
            spans[i] = i + 1;
          else
            spans[i] = i - indexStack.peek();

          indexStack.push(i);
        }

        return spans;
      }

    }

    // --- #161 Sliding Window Maximum (239, deque) | source: DSA/java/leetcode/hard/SlidingWindowMaximum.java ---
    /**
     * Created by nikoo28 on 7/20/19 12:26 AM
     */

    static class SlidingWindowMaximum {

      // Using a deque
      public int[] maxSlidingWindow(int[] nums, int k) {

        int n = nums.length;

        // Step 1: Initialize the deque and result array
        // Deque stores INDICES, not values
        Deque<Integer> deque = new ArrayDeque<>();
        int[] result = new int[n - k + 1];

        // Step 2: Setup deque for the first k elements
        for (int i = 0; i < k; i++) {
          // Remove all smaller elements from the back
          while (!deque.isEmpty() && nums[deque.peekLast()] <= nums[i]) {
            deque.pollLast();
          }
          deque.offerLast(i);
        }

        // The front of the deque is the max of the first window
        result[0] = nums[deque.peekFirst()];

        // Step 3: Process the remaining elements
        for (int i = k; i < n; i++) {

          // Remove the element that has slid out of the window
          if (deque.peekFirst() <= i - k) {
            deque.pollFirst();
          }

          // Remove all elements smaller than the incoming element
          while (!deque.isEmpty() && nums[deque.peekLast()] <= nums[i]) {
            deque.pollLast();
          }

          // Add current element's index
          deque.offerLast(i);

          // The front of the deque is always the max of the current window
          result[i - k + 1] = nums[deque.peekFirst()];
        }

        return result;
      }

    }
    // ===== End of playlist solutions =====
}
