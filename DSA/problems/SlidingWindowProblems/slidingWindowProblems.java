package problems.SlidingWindowProblems;

import java.util.HashSet;
import java.util.Set;

public class slidingWindowProblems {

    public static void main(String[] args) {

        //Given an integer array arr and an integer k, find the maximum sum of any k consecutive elements.
        //arr = [2, 1, 5, 1, 3, 2]
        //k = 3

        int[] arr = {2, 1, 5, 1, 3, 2};
        int ans = function( arr, 3);
        System.out.println(ans);


       /*  Given a string s and an integer k, find the maximum number of vowels (a, e, i, o, u) in any substring of length k.
        Sample Input 1
        s = "abciiidef"
        k = 3

        curre = a

        a b 
        
        "abc" → 1 vowel (a)
        "bci" → 1 vowel (i)
        "cii" → 2 vowels (i, i)
        "iii" → 3 vowels (i, i, i) ✅
        "iid" → 2 vowels (i, i)
        "ide" → 2 vowels (i, e)
        "def" → 1 vowel (e)
        */

        System.out.println(functionae("abciiidef", 3)); // 3

    }


    public static int functionae(String str, int k) {
        int left = 0, ans = 0, curr = 0; // curr = number of vowels in the window

        Set<Character> set = new HashSet<>();
        set.add('a');
        set.add('e');
        set.add('i');
        set.add('o');
        set.add('u');

        for (int right = 0; right < str.length(); right++) {

            //add current as thw window builds
            if (set.contains(str.charAt(right))) {
                curr++;
            }

            // if window exeeds minus l from the window
            while (right - left + 1 > k) {
                if (set.contains(str.charAt(left))) {
                    curr--;
                }
                left++;
            }
    
            // update answer max one from ans and curr
            if(right - left + 1 == k) {
                ans = Math.max(ans, curr);
            }
        }
    
        return ans;
    }


    public static int function(int[] arr, int k) {
        int left = 0, ans = 0, curr = 0;
    
        for (int right = 0; right < arr.length; right++) {
            
            //add current as thw window builds 
            curr = curr + arr[right];
    
            // if window exeeds minus l from the window 
            while (right - left + 1  >  k) {
                curr = curr - arr[left];
                left++;
            }
    
            // update answer max one from ans and curr
            if(right - left + 1 == k) {
                ans = Math.max(ans, curr);
            }
        }
    
        return ans;
    }



    
} 
