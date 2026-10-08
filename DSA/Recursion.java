public class Recursion {
    public static void main(String[] args) {

        int answer = printBackwards(100);
        System.err.println(answer);
    }


    public static int printBackwards(int n) {
        if(n  == 0)
            return n;

        int answer  = printBackwards(n -1);
        return answer;
    }


}
