import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class MainTest {
    @Test
    void shouldReturnTrueForValid() {
        Solution s = new Solution();
        assertTrue(s.isValid("()[]{}"));
    }

    @Test
    void shouldReturnFalseForInvalid() {
        Solution s = new Solution();
        assertFalse(s.isValid("(]"));
    }
}
