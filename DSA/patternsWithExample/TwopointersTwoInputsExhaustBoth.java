package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.ArrayList;
import java.util.List;
import java.util.HashSet;
import java.util.Set;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #3 Merge Two Sorted Lists (21), #85 Is Subsequence (392), #14 Intersection of Two Linked Lists (160)

public class TwopointersTwoInputsExhaustBoth {

    //Two pointers: two inputs, exhaust both
    // Example: merge two sorted arrays
    // arr1 = [1, 4, 7], arr2 = [2, 3, 8, 9]
    // CONDITION = (arr1[i] < arr2[j]): take the smaller one
    // Expected: [1, 2, 3, 4, 7, 8, 9] -> ans = 7 elements merged

    List<Integer> merged = new ArrayList<>();

    public static void main(String[] args) {
        int[] arr1 = {1, 4, 7};
        int[] arr2 = {2, 3, 8, 9};
        TwopointersTwoInputsExhaustBoth t = new TwopointersTwoInputsExhaustBoth();
        System.out.println("Merged count = " + t.fn(arr1, arr2)); // 7
        System.out.println("Merged = " + t.merged);
    }

    public int fn(int[] arr1, int[] arr2) {
        int i = 0, j = 0, ans = 0;

        while (i < arr1.length && j < arr2.length) {
            // do some logic here
            ans++;
            if (arr1[i] < arr2[j]) {
                merged.add(arr1[i]);
                System.out.println("  arr1[" + i + "]=" + arr1[i] + " < arr2[" + j + "]=" + arr2[j] + " -> take " + arr1[i] + "  " + merged);
                i++;
            } else {
                merged.add(arr2[j]);
                System.out.println("  arr1[" + i + "]=" + arr1[i] + " >= arr2[" + j + "]=" + arr2[j] + " -> take " + arr2[j] + "  " + merged);
                j++;
            }
        }

        while (i < arr1.length) {
            // do logic
            ans++;
            merged.add(arr1[i]);
            System.out.println("  arr2 done, take leftover arr1[" + i + "]=" + arr1[i] + "  " + merged);
            i++;
        }

        while (j < arr2.length) {
            // do logic
            ans++;
            merged.add(arr2[j]);
            System.out.println("  arr1 done, take leftover arr2[" + j + "]=" + arr2[j] + "  " + merged);
            j++;
        }

        return ans;
    }

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #3 Merge Two Sorted Lists (21) | source: DSA/java/leetcode/easy/MergeTwoSortedLists.java ---
    /**
     * Created by nikoo28 on 6/15/20 10:23 PM
     */

    static class MergeTwoSortedLists {

      public ListNode mergeTwoLists(ListNode l1, ListNode l2) {

        // Create a sentinal/dummy node to start
        ListNode returnNode = new ListNode(Integer.MIN_VALUE);

        // Create a copy of this node to iterate while solving the problem
        ListNode headNode = returnNode;

        // Traverse till one of the list reaches the end
        while (l1 != null && l2 != null) {

          // Compare the 2 values of lists
          if (l1.val <= l2.val) {
            returnNode.next = l1;
            l1 = l1.next;
          } else {
            returnNode.next = l2;
            l2 = l2.next;
          }
          returnNode = returnNode.next;
        }

        // Append the remaining list
        if (l1 == null) {
          returnNode.next = l2;
        } else if (l2 == null) {
          returnNode.next = l1;
        }

        // return the next node to sentinal node
        return headNode.next;
      }

    }

    // --- #85 Is Subsequence (392) | source: DSA/java/leetcode/easy/IsSubsequence.java ---
    static class IsSubsequence {

      boolean isSubsequence(String str1, String str2) {

        // Initialize pointers for both strings
        int i = 0;
        int j = 0;
        // We can iterate until either of them becomes zero...

        while (i < str1.length() && j < str2.length()) {
          // Compare characters, increment both pointers if same
          if (str1.charAt(i) == str2.charAt(j)) {
            i++;
            j++;
          } else {
            j++; // Only increment second pointer
          }
        }

        // If it is a subsequence, 'i' will have travelled full
        // length of string 'str1', so just check and return
        return (i == str1.length());
      }

    }

    // --- #14 Intersection of Two Linked Lists (160) | source: DSA/java/leetcode/easy/IntersectionOfTwoLinkedLists.java ---
    /**
     * Created by nikoo28 on 2019-07-21 12:38
     */

    static class IntersectionOfTwoLinkedLists {

      ListNode getIntersectionNodeSet(ListNode headA, ListNode headB) {

        if (headA == null) return headA;
        if (headB == null) return headB;

        Set<ListNode> nodeAddress = new HashSet<>();

        while (headA != null) {

          nodeAddress.add(headA);
          headA = headA.next;
        }

        ListNode result = null;

        while (headB != null) {
          if (nodeAddress.contains(headB))
            return headB;

          headB = headB.next;
        }

        return result;
      }

      ListNode getIntersectionNode(ListNode headA, ListNode headB) {

        int lenA = getListLength(headA);
        int lenB = getListLength(headB);

        while (lenA > lenB) {
          lenA--;
          headA = headA.next;
        }

        while (lenB > lenA) {
          lenB--;
          headB = headB.next;
        }

        // Now both heads are at same distance from intersection
        // Start moving them both until they meet
        while(headA != headB) {
          headA = headA.next;
          headB = headB.next;
        }

        return headA;
      }

      private int getListLength(ListNode head) {
        int len = 0;

        while (head != null) {
          len++;
          head = head.next;
        }

        return len;
      }

    }
    // ===== End of playlist solutions =====
}
