import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class MainTest {
    @Test
    void shouldReturnMaxProfit() {
        Solution s = new Solution();
        assertEquals(5, s.maxProfit(new int[]{7, 1, 5, 3, 6, 4}));
    }

    @Test
    void shouldReturnZeroWhenNoProfitPossible() {
        Solution s = new Solution();
        assertEquals(0, s.maxProfit(new int[]{7, 6, 4, 3, 1}));
    }

    @Test
    void shouldReturnCorrectProfitForSinglePeak() {
        Solution s = new Solution();
        assertEquals(4, s.maxProfit(new int[]{1, 2, 3, 4, 5}));
    }
}
