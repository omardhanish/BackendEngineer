package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #89 Reverse Linked List II (92), #114 Reorder List (143), #51 Palindrome Linked List (234)

public class ReversingALinkedList {

    // Example: 1 -> 2 -> 3 -> 4  becomes  4 -> 3 -> 2 -> 1

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
        ListNode head = new ListNode(1, new ListNode(2, new ListNode(3, new ListNode(4))));
        System.out.println("Before: " + toString(head));
        ListNode reversed = new ReversingALinkedList().fn(head);
        System.out.println("After : " + toString(reversed)); // 4 -> 3 -> 2 -> 1
    }

    public ListNode fn(ListNode head) {
        ListNode curr = head;
        ListNode prev = null;
        while (curr != null) {
            ListNode nextNode = curr.next;
            curr.next = prev;
            prev = curr;
            curr = nextNode;
            System.out.println("  reversed part: " + toString(prev) + "   remaining: " + toString(curr));
        }

        return prev;
    }

    static String toString(ListNode node) {
        if (node == null) {
            return "null";
        }
        StringBuilder sb = new StringBuilder();
        while (node != null) {
            sb.append(node.val);
            if (node.next != null) {
                sb.append(" -> ");
            }
            node = node.next;
        }
        return sb.toString();
    }

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #89 Reverse Linked List II (92) | source: DSA/java/leetcode/medium/ReverseLinkedListII.java ---
    static class ReverseLinkedListII {

      ListNode reverseBetween(ListNode head, int left, int right) {

        // create a dummy node to mark the head of this list
        ListNode dummy = new ListNode(0);
        dummy.next = head;

        // make markers for currentNode and for the node before reversing
        ListNode leftPre = dummy;
        ListNode currNode = head;

        for (int i = 0; i < left - 1; i++) {
          leftPre = leftPre.next;
          currNode = currNode.next;
        }

        // make a marker to node where we start reversing
        ListNode subListHead = currNode;

        ListNode preNode = null;
        for (int i = 0; i <= right - left; i++) {
          ListNode nextNode = currNode.next;
          currNode.next = preNode;
          preNode = currNode;
          currNode = nextNode;
        }

        // Join the pieces
        leftPre.next = preNode;
        subListHead.next = currNode;

        return dummy.next;
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
    // ===== End of playlist solutions =====
}
