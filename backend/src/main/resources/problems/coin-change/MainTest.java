import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class MainTest {
    @Test
    void shouldReturnFewestCoins() {
        Solution s = new Solution();
        assertEquals(3, s.coinChange(new int[]{1, 5, 10, 25}, 36));
    }

    @Test
    void shouldReturnNegativeOneWhenImpossible() {
        Solution s = new Solution();
        assertEquals(-1, s.coinChange(new int[]{2}, 3));
    }

    @Test
    void shouldReturnZeroForZeroAmount() {
        Solution s = new Solution();
        assertEquals(0, s.coinChange(new int[]{1}, 0));
    }
}
