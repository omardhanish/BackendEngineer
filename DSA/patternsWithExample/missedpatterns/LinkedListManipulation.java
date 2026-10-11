package patternsWithExample.missedpatterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.List;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #43 Remove Linked List Elements (203), #60 Odd Even Linked List (328), #62 Add Two Numbers (2), #63 Swap Nodes in Pairs (24), #126 Remove Duplicates from Sorted List 2 (82), #109 Copy List With Random Pointer (138), #159 Merge k Sorted Lists (23, divide and conquer), #74 Remove Duplicates from Sorted List (83, no code file here)

public class LinkedListManipulation {

    // Pattern: Rewire next pointers in place, usually starting from a dummy node.

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #43 Remove Linked List Elements (203) | source: DSA/java/leetcode/easy/RemoveLinkedListElements.java ---
    static class RemoveLinkedListElements {

      public ListNode removeElements(ListNode head, int val) {

        // Create a dummy head node
        ListNode dummy = new ListNode(-1);
        dummy.next = head;

        ListNode curr = dummy;
        while (curr.next != null) {

          // Check if the value matches
          if (curr.next.val == val)
            curr.next = curr.next.next;
          else
            curr = curr.next;
        }

        // Return the head
        return dummy.next;
      }

    }

    // --- #60 Odd Even Linked List (328) | source: DSA/java/leetcode/medium/OddEvenLinkedList.java ---
    static class OddEvenLinkedList {

      ListNode oddEvenList(ListNode head) {

        if (head == null)
          return head;

        ListNode odd = head;
        ListNode even = head.next;

        // Maintain the even head
        ListNode evenHead = even;

        while (even != null && even.next != null) {

          // Change pointers for odd list
          odd.next = odd.next.next;
          odd = odd.next;

          // Change pointers for even list
          even.next = even.next.next;
          even = even.next;
        }

        // Assign even list at the end of odd list
        odd.next = evenHead;

        return head;
      }

    }

    // --- #62 Add Two Numbers (2) | source: DSA/java/leetcode/medium/AddTwoNumbers.java ---
    static class AddTwoNumbers {

      ListNode addTwoNumbers(ListNode l1, ListNode l2) {

        ListNode result = new ListNode(0);
        ListNode ptr = result;

        int carry = 0;    // Set default carry

        while (l1 != null || l2 != null) {

          int sum = 0 + carry;    // Initialize sum

          if (l1 != null) {    // Use number from first list
            sum += l1.val;
            l1 = l1.next;
          }

          if (l2 != null) {    // Use number from 2nd list
            sum += l2.val;
            l2 = l2.next;
          }

          carry = sum / 10;    // Get sum and carry
          sum = sum % 10;
          ptr.next = new ListNode(sum);
          ptr = ptr.next;
        }

        if (carry == 1) ptr.next = new ListNode(1);

        return result.next;
      }

    }

    // --- #63 Swap Nodes in Pairs (24) | source: DSA/java/leetcode/medium/SwapNodesInPairs.java ---
    static class SwapNodesInPairs {

      ListNode swapPairs(ListNode head) {

        // Create a dummy node to ease things
        ListNode dummy = new ListNode(0);
        dummy.next = head;

        ListNode point = dummy;

        // Ensure nodes we are swapping are not null
        while (point.next != null && point.next.next != null) {

          // Identify nodes to swap
          ListNode swap1 = point.next;
          ListNode swap2 = point.next.next;

          // Actually swap
          swap1.next = swap2.next;
          swap2.next = swap1;


          // Prepare for next
          point.next = swap2;
          point = swap1;
        }

        // Return the start node
        return dummy.next;
      }

    }

    // --- #126 Remove Duplicates from Sorted List 2 (82) | source: DSA/java/leetcode/medium/DeleteDuplicatesFromSortedListII.java ---
    static class DeleteDuplicatesFromSortedListII {

      ListNode deleteDuplicates(ListNode head) {

          ListNode dummy = new ListNode(0);
          dummy.next = head;

          ListNode prev = dummy;
          ListNode curr = head;

          while (curr != null) {

            // If the current node is a duplicate
            if (curr.next != null && curr.val == curr.next.val) {

              // Move to the last duplicated node
              while (curr.next != null && curr.val == curr.next.val) {
                curr = curr.next;
              }

              // Skip the duplicated nodes
              prev.next = curr.next;
            } else {
              // We have found a unique node
              prev = prev.next;
            }

            // Move to the next node
            curr = curr.next;
          }

          return dummy.next;
      }

    }

    // --- #109 Copy List With Random Pointer (138) | source: DSA/java/leetcode/medium/CopyListWithRandomPointer.java ---
    static class CopyListWithRandomPointer {

      Node copyRandomList(Node head) {
        if (head == null) return null;

        Node curr = head; // Create new list w/ same values
        while (curr != null) {
          Node newNode = new Node(curr.val);
          newNode.next = curr.next;
          curr.next = newNode;
          curr = newNode.next;
        }

        curr = head; // Copy the random pointers
        while (curr != null) {
          if (curr.random != null)
            curr.next.random = curr.random.next;
          curr = curr.next.next;
        }

        curr = head; // Separate the two lists
        Node newHead = head.next;
        Node newCurr = newHead;
        while (curr != null) {
          curr.next = newCurr.next;
          curr = curr.next;
          if (curr != null) {
            newCurr.next = curr.next;
            newCurr = newCurr.next;
          }
        }

        return newHead;
      }

    }

    // --- #159 Merge k Sorted Lists (23, divide and conquer) | source: DSA/java/leetcode/hard/MergeKSortedLists.java ---
    /**
     * Created by nikoo28 on 7/10/19 2:21 AM
     */

    static class MergeKSortedLists {

      ListNode mergeKLists(ListNode[] lists) {
        if (lists == null || lists.length == 0) {
          return null;
        }
        return mergeKListsHelper(lists, 0, lists.length - 1);
      }

      private ListNode mergeKListsHelper(ListNode[] lists, int start, int end) {
        if (start == end) {
          return lists[start];
        }

        if (start + 1 == end) {
          return merge2Lists(lists[start], lists[end]);
        }

        int mid = start + (end - start) / 2;
        ListNode left = mergeKListsHelper(lists, start, mid);
        ListNode right = mergeKListsHelper(lists, mid + 1, end);
        return merge2Lists(left, right);
      }

      private ListNode merge2Lists(ListNode l1, ListNode l2) {
        ListNode dummy = new ListNode(0);
        ListNode curr = dummy;

        while (l1 != null && l2 != null) {
          if (l1.val < l2.val) {
            curr.next = l1;
            l1 = l1.next;
          } else {
            curr.next = l2;
            l2 = l2.next;
          }
          curr = curr.next;
        }

        curr.next = (l1 != null) ? l1 : l2;

        return dummy.next;
      }

    }
    // ===== End of playlist solutions =====

}
