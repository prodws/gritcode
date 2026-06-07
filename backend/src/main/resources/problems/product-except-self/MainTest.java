import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class MainTest {
    @Test
    void shouldReturnProductsForBasicCase() {
        Solution s = new Solution();
        assertArrayEquals(new int[]{24, 12, 8, 6}, s.productExceptSelf(new int[]{1, 2, 3, 4}));
    }

    @Test
    void shouldHandleArrayWithZero() {
        Solution s = new Solution();
        assertArrayEquals(new int[]{0, 0, 9, 0, 0}, s.productExceptSelf(new int[]{-1, 1, 0, -3, 3}));
    }

    @Test
    void shouldHandleTwoElements() {
        Solution s = new Solution();
        assertArrayEquals(new int[]{2, 1}, s.productExceptSelf(new int[]{1, 2}));
    }
}
