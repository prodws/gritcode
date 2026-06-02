import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

public class MainTest {
    @Test
    void shouldReturnTriplets() {
        Solution s = new Solution();
        List<List<Integer>> result = s.threeSum(new int[]{-1,0,1,2,-1,-4});
        assertEquals(2, result.size());
        assertTrue(result.contains(List.of(-1,-1,2)));
        assertTrue(result.contains(List.of(-1,0,1)));
    }

    @Test
    void shouldReturnEmptyWhenNoTriplets() {
        Solution s = new Solution();
        assertTrue(s.threeSum(new int[]{0,1,1}).isEmpty());
    }
}
