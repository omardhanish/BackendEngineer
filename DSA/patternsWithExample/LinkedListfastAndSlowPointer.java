package patternsWithExample;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #37 Middle of a Linked List (876), #15 Linked List Cycle II (142), #16 Find the Duplicate Number (287), #51 Palindrome Linked List (234), #114 Reorder List (143), #99 Remove Nth Node From End (19, one pointer starts n steps ahead)

public class LinkedListfastAndSlowPointer {

    // Example: Middle of the Linked List (LeetCode 876)
    // 1 -> 2 -> 3 -> 4 -> 5
    // fast moves 2 steps, slow moves 1, so slow is in the middle when fast reaches the end.
    // Expected: 3

    static class ListNode {
        int val;
        ListNode next;

        ListNode(int val) {
            this.val = val;
        }

        ListNode(int val, ListNode next) {
            this.val = val;
            this.next = next;
        }
    }

    public static void main(String[] args) {
        // 1 -> 2 -> 3 -> 4 -> 5
        ListNode head = new ListNode(1, new ListNode(2, new ListNode(3, new ListNode(4, new ListNode(5)))));
        System.out.println("Middle = " + new LinkedListfastAndSlowPointer().fn(head)); // 3
    }

    public int fn(ListNode head) {
        ListNode slow = head;
        ListNode fast = head;
        int ans = 0;
        System.out.println("  start: slow=" + slow.val + " fast=" + fast.val);

        while (fast != null && fast.next != null) {
            // do logic
            slow = slow.next;
            fast = fast.next.next;
            System.out.println("  step : slow=" + slow.val + " fast=" + (fast == null ? "null" : fast.val));
        }
        ans = slow.val;

        return ans;
    }

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #37 Middle of a Linked List (876) | source: DSA/java/leetcode/easy/MiddleOfTheLinkedList.java ---
    static class MiddleOfTheLinkedList {

      ListNode middleNode(ListNode head) {

        ListNode slowPtr = head;
        ListNode fastPtr = head;

        // Travel until the fast pointer reaches
        // the last node or null
        while (fastPtr != null && fastPtr.next!= null) {

          // Slow pointer moves 1 node
          slowPtr = slowPtr.next;

          // Fast pointer moves 2 nodes
          fastPtr = fastPtr.next.next;
        }

        return slowPtr;
      }

    }

    // --- #15 Linked List Cycle II (142) | source: DSA/java/leetcode/medium/LinkedListCycleII.java ---
    /**
     * Created by nikoo28 on 12/19/17 12:43 AM
     */

    static class LinkedListCycleII {

      public ListNode detectCycle(ListNode head) {

        // Start both from head
        ListNode slow = head, fast = head;

        // Advance both at different speeds
        // until they meet once
        while (fast != null && fast.next != null) {
          fast = fast.next.next;
          slow = slow.next;

          // As soon as they meet, start from the
          // head again and move at the same speed
          if (slow == fast) {
            while (head != slow) {
              head = head.next;
              slow = slow.next;
            }
            return slow;
          }
        }
        return null;
      }

    }

    // --- #16 Find the Duplicate Number (287) | source: DSA/java/leetcode/medium/FindTheDuplicateNumber.java ---
    static class FindTheDuplicateNumber {

      public int findDuplicate(int[] nums) {

        // Start a fast and slow pointer
        // until they meet
        int slow = 0, fast = 0;
        do {
          slow = nums[slow];
          fast = nums[nums[fast]];
        } while (slow != fast);

        // As soon as they meet, move both
        // pointers at same speed until they
        // meet again
        slow = 0;
        while (slow != fast) {
          slow = nums[slow];
          fast = nums[fast];
        }
        return slow;
      }

      public int findDuplicatesSorting(int[] nums) {
        Arrays.sort(nums);

        int prev = -1;
        for (int num : nums) {
          if (num == prev)
            break;
          prev = num;
        }

        return prev;
      }

      public int findDuplicatesHashSet(int[] nums) {
        Set<Integer> numSet = new HashSet<>();

        for (int num : nums) {
          if (numSet.contains(num))
            return num;
          numSet.add(num);
        }

        return -1;
      }
    }

    // --- #51 Palindrome Linked List (234) | source: DSA/java/leetcode/easy/PalindromeLinkedList.java ---
    /**
     * Created by nikoo28 on 2019-07-20 22:26
     */

    static class PalindromeLinkedList {

      boolean isPalindrome(ListNode head) {

        // Find the middle
        ListNode fast = head, slow = head;
        while (fast != null && fast.next != null) {
          fast = fast.next.next;
          slow = slow.next;
        }
        if (fast != null) { // odd nodes: let right half smaller
          slow = slow.next;
        }

        // Reverse the second half
        slow = reverseList(slow);
        fast = head;

        // Start comparing one by one
        while (slow != null) {
          if (fast.val != slow.val)
            return false;

          fast = fast.next;
          slow = slow.next;
        }
        return true;
      }

      private ListNode reverseList(ListNode head) {
        ListNode prev = null;
        while (head != null) {
          ListNode next = head.next;
          head.next = prev;
          prev = head;
          head = next;
        }
        return prev;
      }

    }

    // --- #114 Reorder List (143) | source: DSA/java/leetcode/medium/ReorderList.java ---
    static class ReorderList {

      void reorderList(ListNode head) {

        if (head == null || head.next == null) // base case
          return;

        // Find the middle of the list
        ListNode p1 = head;
        ListNode p2 = head;
        while (p2.next != null && p2.next.next != null) {
          p1 = p1.next;
          p2 = p2.next.next;
        }

        // Reverse the half after middle
        ListNode preMiddle = p1;
        ListNode preCurrent = p1.next;
        while (preCurrent.next != null) {
          ListNode current = preCurrent.next;
          preCurrent.next = current.next;
          current.next = preMiddle.next;
          preMiddle.next = current;
        }

        // Start reordering
        p1 = head;
        p2 = preMiddle.next;
        while (p1 != preMiddle) {
          preMiddle.next = p2.next;
          p2.next = p1.next;
          p1.next = p2;
          p1 = p2.next;
          p2 = preMiddle.next;
        }
      }

    }

    // --- #99 Remove Nth Node From End (19, one pointer starts n steps ahead) | source: DSA/java/leetcode/medium/RemoveNthNodeFromEndOfList.java ---
    static class RemoveNthNodeFromEndOfList {

      ListNode removeNthFromEnd(ListNode head, int n) {

        ListNode dummy = new ListNode(-1);
        dummy.next = head;

        ListNode firstPtr = dummy;
        ListNode secondPtr = dummy;

        // Move secondPtr n spaces ahead
        for (int i = 0; i < n; i++) {
          secondPtr = secondPtr.next;
        }

        // Move both now, until the next of secondPtr is null
        while(secondPtr.next != null) {
          firstPtr = firstPtr.next;
          secondPtr = secondPtr.next;
        }

        // We now have to remove the node next of firstPtr
        firstPtr.next = firstPtr.next.next;

        return dummy.next;
      }

    }
    // ===== End of playlist solutions =====
}
