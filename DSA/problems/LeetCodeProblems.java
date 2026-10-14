package problems;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

public class LeetCodeProblems {

    public static void main(String[] args) {

        //LeetCode 219
        int[] nums = {1,2,3,1};
        int k = 3;
        boolean ansOne = containsNearbyDuplicate(nums, k);
        //System.out.println(ansOne);


        //435. Non-overlapping Intervals
        //int[][] intervals = {{1, 2}, {2, 3}, {3, 4}, {1, 3}};
        int[][] intervals = {
            {1, 100},
            {11, 22},
            {1, 11},
            {2, 12}
        };
        int answer = eraseOverlapIntervals(intervals);        
        System.out.println(answer);
    }

    public static  int eraseOverlapIntervals(int[][] intervals) {

        Arrays.sort(intervals, (a,b) -> a[1] - b[1]); 
        //System.out.println(Arrays.deepToString(intervals));

        int removeCount = 0;
        int[] lastInterval = {0,0};

        lastInterval = intervals[0];

        for(int i = 0; i<intervals.length; i++ ) {

            if(i > 0) {
                int[] currentInterval = intervals[i];
                if(currentInterval[0] >= lastInterval[1]){
                    lastInterval = currentInterval;
                }else {
                    removeCount++;
                }
            }

        }

        return removeCount;
        
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

    // Without sliding window: store the last index of each number
    public static boolean containsNearbyDuplicateHashMap(int[] nums, int k) {

        Map<Integer, Integer> map = new HashMap<>();

        for (int i = 0; i < nums.length; i++) {

            if (map.containsKey(nums[i]) && i - map.get(nums[i]) <= k)
                return true;

            map.put(nums[i], i);
        }

        return false;
    }

}
