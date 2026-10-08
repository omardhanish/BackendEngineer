package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

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

}
