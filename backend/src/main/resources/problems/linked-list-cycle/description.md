Given the `head` of a linked list, determine if the linked list has a cycle in it.

A cycle exists if some node in the list can be reached again by continuously following the `next` pointer.

Return `true` if there is a cycle in the linked list, otherwise return `false`.

Use the provided `ListNode` class defined inside `Solution`.

# Example 1

Input:
3 -> 2 -> 0 -> -4, where -4's next points back to node with value 2

Output:
true

# Example 2

Input:
1 -> 2, where 2's next points back to node with value 1

Output:
true

# Example 3

Input:
1

Output:
false

# Constraints

- The number of nodes in the list is in the range [0, 10^4]
- -10^5 <= Node.val <= 10^5
