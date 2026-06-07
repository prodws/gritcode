import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class MainTest {
    @Test
    void shouldReturnLongestSubstringLength() {
        Solution s = new Solution();
        assertEquals(3, s.lengthOfLongestSubstring("abcabcbb"));
    }

    @Test
    void shouldReturnOneForAllSameChars() {
        Solution s = new Solution();
        assertEquals(1, s.lengthOfLongestSubstring("bbbbb"));
    }

    @Test
    void shouldHandleMixedString() {
        Solution s = new Solution();
        assertEquals(3, s.lengthOfLongestSubstring("pwwkew"));
    }
}
