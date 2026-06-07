import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class MainTest {
    @Test
    void shouldReturnFalseForNoCycle() {
        Solution s = new Solution();
        Solution.ListNode head = new Solution.ListNode(1);
        head.next = new Solution.ListNode(2);
        head.next.next = new Solution.ListNode(3);
        assertFalse(s.hasCycle(head));
    }

    @Test
    void shouldReturnTrueForCycle() {
        Solution s = new Solution();
        Solution.ListNode head = new Solution.ListNode(3);
        Solution.ListNode second = new Solution.ListNode(2);
        Solution.ListNode third = new Solution.ListNode(0);
        Solution.ListNode fourth = new Solution.ListNode(-4);
        head.next = second;
        second.next = third;
        third.next = fourth;
        fourth.next = second; // cycle back to second node
        assertTrue(s.hasCycle(head));
    }

    @Test
    void shouldReturnFalseForSingleNode() {
        Solution s = new Solution();
        Solution.ListNode head = new Solution.ListNode(1);
        assertFalse(s.hasCycle(head));
    }
}
