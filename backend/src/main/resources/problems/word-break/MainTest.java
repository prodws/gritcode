import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

public class MainTest {
    @Test
    void shouldReturnTrueForLeetcode() {
        Solution s = new Solution();
        assertTrue(s.wordBreak("leetcode", List.of("leet", "code")));
    }

    @Test
    void shouldReturnTrueWithReuse() {
        Solution s = new Solution();
        assertTrue(s.wordBreak("applepenapple", List.of("apple", "pen")));
    }

    @Test
    void shouldReturnFalseWhenNotSegmentable() {
        Solution s = new Solution();
        assertFalse(s.wordBreak("catsandog", List.of("cats", "dog", "sand", "and", "cat")));
    }

    @Test
    void shouldReturnTrueForSingleWord() {
        Solution s = new Solution();
        assertTrue(s.wordBreak("dog", List.of("dog", "cat")));
    }

    @Test
    void shouldReturnFalseForEmpty() {
        Solution s = new Solution();
        assertFalse(s.wordBreak("ab", List.of("a", "b", "bcd", "abc")));
    }
}
