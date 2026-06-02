import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;

public class MainTest {
    @Test
    void shouldMergeArrays() {
        Solution s = new Solution();
        int[] nums1 = {1,2,3,0,0,0};
        s.merge(nums1, 3, new int[]{2,5,6}, 3);
        assertArrayEquals(new int[]{1,2,2,3,5,6}, nums1);
    }
}
