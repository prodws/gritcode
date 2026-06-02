import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

public class MainTest {
    @Test
    void shouldReturnMaxSum() {
        Solution s = new Solution();
        assertEquals(6, s.maxSubArray(new int[]{-2,1,-3,4,-1,2,1,-5,4}));
    }

    @Test
    void shouldHandleAllNegative() {
        Solution s = new Solution();
        assertEquals(-1, s.maxSubArray(new int[]{-3,-1,-2}));
    }
}
