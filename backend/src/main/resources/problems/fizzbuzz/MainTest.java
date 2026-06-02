import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;

public class MainTest {
    @Test
    void shouldReturnFizzBuzzList() {
        Solution s = new Solution();
        assertEquals(List.of("1", "2", "Fizz", "4", "Buzz"), s.fizzBuzz(5));
    }

    @Test
    void shouldHandleFizzBuzz() {
        Solution s = new Solution();
        assertEquals("FizzBuzz", s.fizzBuzz(15).get(14));
    }
}
