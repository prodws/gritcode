import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;

public class MainTest {
    @Test
    void shouldReverseString() {
        Solution s = new Solution();
        char[] input = {'h','e','l','l','o'};
        s.reverseString(input);
        assertArrayEquals(new char[]{'o','l','l','e','h'}, input);
    }
}
