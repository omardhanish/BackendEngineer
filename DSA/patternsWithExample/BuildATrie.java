package patternsWithExample;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.HashMap;
import java.util.Map;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// ❌ None in the playlist

public class BuildATrie {

    // Example: build a trie from ["cat", "car", "dog"], then look words up.
    // "cat" and "car" share the nodes c -> a.
    // data = 1 marks the end of a whole word.

    public static void main(String[] args) {
        BuildATrie t = new BuildATrie();
        TrieNode root = t.buildTrie(new String[] {"cat", "car", "dog"});
        for (String w : new String[] {"car", "ca", "cow", "dog"}) {
            System.out.println("contains \"" + w + "\" ? " + t.contains(root, w));
        }
        // car true, ca false, cow false, dog true
    }

    // note: using a class is only necessary if you want to store data at each node.
    // otherwise, you can implement a trie using only hash maps.
    static class TrieNode {
        // you can store data at nodes if you wish
        int data;
        Map<Character, TrieNode> children;

        TrieNode() {
            this.children = new HashMap<>();
        }
    }

    public TrieNode buildTrie(String[] words) {
        TrieNode root = new TrieNode();
        for (String word : words) {
            System.out.println("insert \"" + word + "\"");
            TrieNode curr = root;
            for (char c : word.toCharArray()) {
                if (!curr.children.containsKey(c)) {
                    curr.children.put(c, new TrieNode());
                    System.out.println("  '" + c + "' new node");
                } else {
                    System.out.println("  '" + c + "' already there, reuse");
                }
                curr = curr.children.get(c);
            }
            // at this point, you have a full word at curr
            // you can perform more logic here to give curr an attribute if you want
            curr.data = 1;
        }

        return root;
    }

    // helper for the demo: walk the trie letter by letter
    public boolean contains(TrieNode root, String word) {
        TrieNode curr = root;
        for (char c : word.toCharArray()) {
            if (!curr.children.containsKey(c)) {
                return false;
            }
            curr = curr.children.get(c);
        }
        return curr.data == 1;
    }

}
