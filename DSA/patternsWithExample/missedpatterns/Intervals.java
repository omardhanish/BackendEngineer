package patternsWithExample.missedpatterns;

// References (LeetCode cheatsheets):
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4723/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4724/
// https://leetcode.com/explore/interview/card/cheatsheets/720/resources/4725/

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

// Playlist problems (Nikhil Lohia - "LeetCode Solutions" playlist; #N = position in playlist, (N) = LeetCode number):
// #71 Merge Intervals (56), #134 Non-overlapping Intervals (435), #135 Insert Interval (57), #164 The Skyline Problem (218, sweep line + heap, no code file here)

public class Intervals {

    // Pattern: Sort intervals (by start or end), then sweep once, merging or counting overlaps.

    // ===== Playlist solutions (copied from DSA/java/leetcode) =====

    // --- #71 Merge Intervals (56) | source: DSA/java/leetcode/medium/MergeIntervals.java ---
    /**
     * Created by nikoo28 on 11/8/19 12:58 AM
     */

    static class MergeIntervals {

      int[][] merge(int[][] intervals) {

        if (intervals.length <= 1)
          return intervals;

        // Sort by ascending starting point
        Arrays.sort(intervals, Comparator.comparingInt(i -> i[0]));

        List<int[]> result = new ArrayList<>();

        int[] newInterval = intervals[0];
        result.add(newInterval);

        for (int[] interval : intervals) {
          if (interval[0] <= newInterval[1])
            // Overlapping intervals,
            // update the end if needed
            newInterval[1] = Math.max(newInterval[1], interval[1]);
          else {
            // Disjoint intervals,
            // add the new interval to the list
            newInterval = interval;
            result.add(newInterval);
          }
        }

        return result.toArray(new int[result.size()][]);
      }

    }

    // --- #134 Non-overlapping Intervals (435) | source: DSA/java/leetcode/medium/NonOverlappingIntervals.java ---
    static class NonOverlappingIntervals {

      int eraseOverlapIntervals(int[][] intervals) {

        if (intervals.length == 0)
          return 0;

        // Sort the intervals based on the end time
        Arrays.sort(intervals, Comparator.comparingInt(a -> a[1]));

        int count = 1;

        // end time of the first/current interval
        int previous_interval = 0;

        for (int i = 1; i < intervals.length; i++) {

          // If the start time of the next interval is greater than or equal to
          // the end time of the current interval, then we can keep it
          if (intervals[i][0] >= intervals[previous_interval][1]) {
            previous_interval = i;
            count++;
          }
        }

        // Return the number of intervals to remove
        return intervals.length - count;
      }

    }

    // --- #135 Insert Interval (57) | source: DSA/java/leetcode/medium/InsertInterval.java ---
    static class InsertInterval {

      int[][] insert(int[][] intervals, int[] newInterval) {
        int[][] result = new int[intervals.length + 1][2];
        int i = 0, j = 0;

        // Add all intervals that end before the new interval starts
        while (i < intervals.length && intervals[i][1] < newInterval[0]) {
          result[j++] = intervals[i++];
        }

        // Merge overlapping intervals
        while (i < intervals.length && intervals[i][0] <= newInterval[1]) {
          newInterval[0] = Math.min(newInterval[0], intervals[i][0]);
          newInterval[1] = Math.max(newInterval[1], intervals[i++][1]);
        }

        result[j++] = newInterval;

        // Add remaining intervals
        while (i < intervals.length) {
          result[j++] = intervals[i++];
        }

        return java.util.Arrays.copyOf(result, j);
      }

    }
    // ===== End of playlist solutions =====

}
