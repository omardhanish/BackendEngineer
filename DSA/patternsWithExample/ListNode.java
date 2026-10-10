package patternsWithExample;

// Shared singly linked list node, used by the playlist solutions copied from DSA/java
// (same shape as util.ListNode: val, next, ListNode(int)).

public class ListNode {
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
