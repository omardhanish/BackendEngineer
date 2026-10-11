package problems;

import java.util.HashMap;
import java.util.Map;

public class LeetCodeProblems {

    public static void main(String[] args) {

        //LeetCode 219
        int[] nums = {1,2,3,1};
        int k = 3;
        boolean ansOne = containsNearbyDuplicate(nums, k);
        //System.out.println(ansOne);

        //LeetCode 57 Insert Interval
        
    }

    public static  int[][] insert(int[][] intervals, int[] newInterval) {
        return intervals;
    }


    public static boolean containsNearbyDuplicate(int[] nums, int k) {

        Map<Integer, Integer> map = new HashMap<>();
 
         int start = 0 ;
 
         for (int end = 0; end < nums.length; end++) {
 
             if (end - start >  k) {
                 map.remove(nums[start]);
                 start++;
             }
 
             if(map.containsKey(nums[end]))
                 return true;
 
             map.put(nums[end], end);
 
         }
 
         return false;
 
     }
    
}
