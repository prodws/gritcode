import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

public class MainTest {
    @Test
    void shouldReturn2For2Steps() {
        assertEquals(2, new Solution().climbStairs(2));
    }

    @Test
    void shouldReturn3For3Steps() {
        assertEquals(3, new Solution().climbStairs(3));
    }
}
