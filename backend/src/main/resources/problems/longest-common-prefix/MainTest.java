import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

public class MainTest {
    @Test
    void shouldReturnCommonPrefix() {
        Solution s = new Solution();
        assertEquals("fl", s.longestCommonPrefix(new String[]{"flower","flow","flight"}));
    }

    @Test
    void shouldReturnEmptyWhenNoPrefix() {
        Solution s = new Solution();
        assertEquals("", s.longestCommonPrefix(new String[]{"dog","racecar","car"}));
    }
}
