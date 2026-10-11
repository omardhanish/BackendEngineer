package patternsWithExample.missedpatterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.Map;
import java.util.Optional;
import java.util.Queue;
import java.util.Stack;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #98 Valid Parentheses (20), #101 Implement Queue using Stacks (232), #102 Implement Stack using Queues (225), #139 Min Stack (155), #144 Time Based Key Value Store (981)

public class StackQueueAndDesign {

    // Pattern: Design a data structure from stacks / queues / maps, or match brackets with a stack.

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #98 Valid Parentheses (20) | source: DSA/java/leetcode/easy/ValidParantheses.java ---
    /**
     * Created by nikoo28 on 7/11/19 2:00 AM
     */

    static class ValidParantheses {

      boolean isValid(String s) {

        Stack<Character> stack = new Stack<>();

        for (char c : s.toCharArray()) {

          if (c == '(')
            stack.push(')');
          else if (c == '{')
            stack.push('}');
          else if (c == '[')
            stack.push(']');

          else if (stack.isEmpty() || stack.pop() != c)
            return false;
        }
        return stack.isEmpty();

      }

    }

    // --- #101 Implement Queue using Stacks (232) | source: DSA/java/leetcode/easy/MyQueue.java ---
    static class MyQueue {

      private final Stack<Integer> input;
      private final Stack<Integer> output;

      public MyQueue() {
        input = new Stack<>();
        output = new Stack<>();
      }

      public void push(int x) {
        input.push(x);
      }
      public int pop() {
        peek();
        return output.pop();
      }
      public int peek() {
        if (output.empty())
          while (!input.empty())
            output.push(input.pop());
        return output.peek();
      }
      public boolean empty() {
        return input.empty() && output.empty();
      }

      public static void main(String[] args) {
        MyQueue queue = new MyQueue();
        queue.push(1);
        queue.push(2);
        System.out.println(queue.peek());  // returns 1
        System.out.println(queue.pop());   // returns 1
        System.out.println(queue.empty()); // returns false
      }

    }

    // --- #102 Implement Stack using Queues (225) | source: DSA/java/leetcode/easy/MyStack.java ---
    static class MyStack {

      private Queue<Integer> queue;

      public MyStack() {
        queue = new LinkedList<>();
      }

      public void push(int x) {
        queue.add(x);
        for (int i = 1; i < queue.size(); i++)
          queue.add(queue.remove());

      }

      public int pop() {
        return queue.remove();
      }

      public int top() {
        return queue.peek();
      }

      public boolean empty() {
        return queue.isEmpty();
      }

      public static void main(String[] args) {
        MyStack stack = new MyStack();
        stack.push(1);
        stack.push(2);
        System.out.println(stack.top());   // returns 2
        stack.pop();
        System.out.println(stack.pop());   // returns 1
        System.out.println(stack.empty()); // returns false
      }
    }

    // --- #139 Min Stack (155) | source: DSA/java/leetcode/medium/MinStack.java ---
    static class MinStack {

      Stack<Integer> stack;
      Stack<Integer> minStack;

      public MinStack() {
        stack = new Stack<>();
        minStack = new Stack<>();
      }

      public void push(int val) {
        stack.push(val);

        // If minStack is empty or new value is less than equal to
        // the top of the minStack, push it onto the minStack
        if (minStack.isEmpty() || val <= minStack.peek())
          minStack.push(val);
      }

      public void pop() {
        int poppedValue = stack.pop();

        // If popped value == top of the minStack,
        // pop it from the minStack as well
        if (poppedValue == minStack.peek())
          minStack.pop();
      }

      public int top() {
        return stack.peek();
      }

      public int getMin() {
        return minStack.peek();
      }
    }

    // --- #144 Time Based Key Value Store (981) | source: DSA/java/leetcode/medium/TimeMap.java ---
    static class TimeStampedValue {
      public int timestamp;
      public String value;

      public TimeStampedValue(int timestamp, String value) {
        this.timestamp = timestamp;
        this.value = value;
      }
    }

    static class TimeMap {
      Map<String, ArrayList<TimeStampedValue>> entriesByKey;

      public TimeMap() {
        // Constructor to initialize the TimeMap object
        entriesByKey = new HashMap<>();
      }

      public void set(String key, String value, int timestamp) {
        // Implementation for setting the value at a specific timestamp
        if(!entriesByKey.containsKey(key)) {
          entriesByKey.put(key, new ArrayList<>());
        }
        ArrayList<TimeStampedValue> timeStampedValues = entriesByKey.get(key);
        timeStampedValues.add(new TimeStampedValue(timestamp, value));
      }

      public String get(String key, int timestamp) {
        if(!entriesByKey.containsKey(key)) return "";

        ArrayList<TimeStampedValue> timeStampedValues = entriesByKey.get(key);
        Optional<TimeStampedValue> timeStamp =
            binarySearchTimestamp(timeStampedValues, timestamp);
        if(timeStamp.isEmpty()) {
          return "";
        }

        return timeStamp.get().value;
      }

      private Optional<TimeStampedValue> binarySearchTimestamp(
          ArrayList<TimeStampedValue> arr, int target) {
        int left = 0, right = arr.size() - 1;
        int matchIndex = -1;

        while (left <= right) {
          int mid = left + (right - left) / 2;
          TimeStampedValue cur = arr.get(mid);
          if(cur.timestamp <= target) {
            matchIndex = mid;
            left = mid + 1;
          }
          else {
            right = mid - 1;
          }
        }

        if(matchIndex == -1) {
          return Optional.empty();
        }
        return Optional.of(arr.get(matchIndex));
      }
    }
    // ===== End of playlist solutions =====

}
