import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

public class MainTest {
    @Test
    void shouldFindSingleNumber() {
        assertEquals(1, new Solution().singleNumber(new int[]{2,2,1}));
    }

    @Test
    void shouldFindSingleNumberLonger() {
        assertEquals(4, new Solution().singleNumber(new int[]{4,1,2,1,2}));
    }
}
