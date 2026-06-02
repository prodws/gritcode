import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class MainTest {
    @Test
    void shouldReturnTrueForPalindrome() {
        Solution s = new Solution();
        assertTrue(s.isPalindrome(121));
    }

    @Test
    void shouldReturnFalseForNegative() {
        Solution s = new Solution();
        assertFalse(s.isPalindrome(-121));
    }
}
