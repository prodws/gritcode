import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

public class MainTest {
    @Test
    void shouldFindTarget() {
        Solution s = new Solution();
        assertEquals(4, s.search(new int[]{-1,0,3,5,9,12}, 9));
    }

    @Test
    void shouldReturnMinusOneWhenNotFound() {
        Solution s = new Solution();
        assertEquals(-1, s.search(new int[]{-1,0,3,5,9,12}, 2));
    }
}
