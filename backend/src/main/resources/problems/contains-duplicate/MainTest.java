import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class MainTest {
    @Test
    void shouldReturnTrueWhenDuplicateExists() {
        Solution s = new Solution();
        assertTrue(s.containsDuplicate(new int[]{1, 2, 3, 1}));
    }

    @Test
    void shouldReturnFalseWhenAllDistinct() {
        Solution s = new Solution();
        assertFalse(s.containsDuplicate(new int[]{1, 2, 3, 4}));
    }

    @Test
    void shouldReturnTrueForMultipleDuplicates() {
        Solution s = new Solution();
        assertTrue(s.containsDuplicate(new int[]{1, 1, 1, 3, 3, 4, 3, 2, 4, 2}));
    }
}
