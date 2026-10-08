package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

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

}
