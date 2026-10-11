package patternsWithExample.missedpatterns;

// Linked list node with an extra random pointer, used by Copy List With Random Pointer
// (same shape as util.Node: val, next, random, Node(int)).

public class Node {
    int val;
    Node next;
    Node random;

    Node(int val) {
        this.val = val;
    }
}
