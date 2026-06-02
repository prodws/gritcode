Given a string `s` and a list of strings `wordDict`, return `true` if `s` can be segmented into a space-separated sequence of one or more dictionary words.

The same word in the dictionary may be reused multiple times.

# Example

Input: `s = "leetcode"`, `wordDict = ["leet","code"]`
Output: `true`
Explanation: "leetcode" can be segmented as "leet code".

Input: `s = "applepenapple"`, `wordDict = ["apple","pen"]`
Output: `true`
Explanation: "applepenapple" can be segmented as "apple pen apple".

Input: `s = "catsandog"`, `wordDict = ["cats","dog","sand","and","cat"]`
Output: `false`

# Constraints

- `1 <= s.length <= 300`
- `1 <= wordDict.length <= 1000`
- All strings consist of lowercase English letters.
