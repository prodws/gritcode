import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class MainTest {
    @Test
    void shouldReturnTrueForAnagram() {
        Solution s = new Solution();
        assertTrue(s.isAnagram("anagram", "nagaram"));
    }

    @Test
    void shouldReturnFalseForNonAnagram() {
        Solution s = new Solution();
        assertFalse(s.isAnagram("rat", "car"));
    }

    @Test
    void shouldReturnFalseWhenDifferentLengths() {
        Solution s = new Solution();
        assertFalse(s.isAnagram("ab", "a"));
    }
}
