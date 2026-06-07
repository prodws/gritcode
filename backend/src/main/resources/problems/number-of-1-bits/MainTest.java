import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class MainTest {
    @Test
    void shouldCountBitsForEleven() {
        Solution s = new Solution();
        assertEquals(3, s.hammingWeight(11)); // 1011 in binary
    }

    @Test
    void shouldCountBitsForPowerOfTwo() {
        Solution s = new Solution();
        assertEquals(1, s.hammingWeight(128)); // 10000000 in binary
    }

    @Test
    void shouldCountBitsForAllOnes() {
        Solution s = new Solution();
        assertEquals(32, s.hammingWeight(-1)); // all 32 bits set (0xFFFFFFFF)
    }
}
