package com.github.prodws.codingplatform.user;

import com.github.prodws.codingplatform.config.JwtTokenProvider;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.github.prodws.codingplatform.submission.SubmissionRepository;
import com.github.prodws.codingplatform.problem.ProblemDifficulty;
import com.github.prodws.codingplatform.problem.ProblemRepository;
import java.util.Base64;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserService {
    private static final int MAX_AVATAR_BYTES = 512 * 1024; // 512 KB

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final Validator validator;
    private final SubmissionRepository submissionRepository;
    private final ProblemRepository problemRepository;

    public List<User> getUsers() {
        return userRepository.findAll();
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalStateException("User not found"));
    }

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("User not found"));
    }

    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("User not found"));
    }

    public String login(String emailOrUsername, String password) {
        User user = userRepository.findByEmail(emailOrUsername)
                .orElseGet(() -> userRepository.findByUsername(emailOrUsername)
                        .orElseThrow(() -> new IllegalStateException("User not found")));
        if (!verifyPassword(password, user.getPasswordHash()))
            throw new IllegalStateException("Invalid credentials");
        return jwtTokenProvider.generateToken(user);
    }

    public User register(String username, String email, String password) {
        checkIfEmailExists(email);
        checkIfUsernameExists(username);
        User user = new User(username, email, passwordEncoder.encode(password));
        Set<ConstraintViolation<User>> violations = validator.validate(user);
        if (!violations.isEmpty()) throw new ConstraintViolationException(violations);
        return userRepository.save(user);
    }

    private void checkIfEmailExists(String email) {
        if (userRepository.existsByEmail(email)) throw new IllegalStateException("Email already taken");
    }

    private void checkIfUsernameExists(String username) {
        if (userRepository.existsByUsername(username)) throw new IllegalStateException("Username already taken");
    }

    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) throw new IllegalStateException("User not found");
        userRepository.deleteById(id);
    }

    private boolean verifyPassword(String rawPassword, String storedHash) {
        return passwordEncoder.matches(rawPassword, storedHash);
    }

    public User updateUsername(Long id, String newUsername) {
        if (newUsername == null || newUsername.isBlank()) throw new IllegalArgumentException("Username cannot be empty");
        if (newUsername.length() < 3) throw new IllegalArgumentException("Username must be at least 3 characters");
        if (newUsername.length() > 20) throw new IllegalArgumentException("Username cannot exceed 20 characters");
        if (!newUsername.matches("^[a-zA-Z0-9_]+$")) throw new IllegalArgumentException("Username can only contain letters, numbers, and underscores");
        User user = getUserById(id);
        checkIfUsernameExists(newUsername);
        user.setUsername(newUsername);
        return userRepository.save(user);
    }

    public User updatePassword(Long id, String currentPassword, String newPassword) {
        User user = getUserById(id);
        if (!verifyPassword(currentPassword, user.getPasswordHash()))
            throw new IllegalStateException("Current password is incorrect");
        if (newPassword == null || newPassword.length() < 5)
            throw new IllegalArgumentException("Password must be at least 5 characters");
        if (!newPassword.matches(".*[^a-zA-Z0-9].*"))
            throw new IllegalArgumentException("Password must contain at least one special character");
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        return userRepository.save(user);
    }

    public boolean checkAvailability(String field, String value) {
        return switch (field) {
            case "username" -> !userRepository.existsByUsername(value);
            case "email"    -> !userRepository.existsByEmail(value);
            default -> throw new IllegalArgumentException("Unknown field: " + field);
        };
    }

    public User addPoints(Long id, Long pointsToAdd) {
        User user = getUserById(id);
        user.setTotalPoints(user.getTotalPoints() + pointsToAdd);
        return userRepository.save(user);
    }

    public void addPracticeXpIfFirstSolve(Long userId, Long problemId) {
        boolean alreadySolved = submissionRepository.findAllByUserIdAndProblemId(userId, String.valueOf(problemId))
                .stream().anyMatch(s -> s.isPassed());
        // Only award on first successful solve
        if (alreadySolved) return;
        var problem = problemRepository.findById(problemId).orElse(null);
        if (problem == null) return;
        long xp = switch (problem.getDifficulty()) {
            case EASY   -> 20L;
            case MEDIUM -> 50L;
            case HARD   -> 100L;
        };
        addPoints(userId, xp);
    }

    public User updateAvatar(Long id, String base64Data) {
        byte[] decoded;
        try {
            // strip data URI prefix if present
            String raw = base64Data.contains(",") ? base64Data.split(",", 2)[1] : base64Data;
            decoded = Base64.getDecoder().decode(raw);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid base64 image data");
        }
        if (decoded.length > MAX_AVATAR_BYTES) {
            throw new IllegalArgumentException("Avatar image must be smaller than 512 KB");
        }
        User user = getUserById(id);
        // store as full data URI so the frontend can use it directly in <img src>
        String raw = base64Data.contains(",") ? base64Data : "data:image/jpeg;base64," + base64Data;
        user.setAvatarBase64(raw);
        return userRepository.save(user);
    }

    @Transactional
    public boolean followUser(Long followerId, Long followedId) {
        if (followerId.equals(followedId)) throw new IllegalArgumentException("Cannot follow yourself");
        User follower = getUserById(followerId);
        User followed = getUserById(followedId);
        if (follower.getFollowing().contains(followed)) return false;
        follower.getFollowing().add(followed);
        userRepository.save(follower);
        return true;
    }

    @Transactional
    public boolean unfollowUser(Long followerId, Long followedId) {
        User follower = getUserById(followerId);
        User followed = getUserById(followedId);
        if (!follower.getFollowing().contains(followed)) return false;
        follower.getFollowing().remove(followed);
        userRepository.save(follower);
        return true;
    }

    public boolean isFollowing(Long followerId, Long followedId) {
        return userRepository.isFollowing(followerId, followedId);
    }

    public long countFollowers(Long userId) {
        return userRepository.countFollowers(userId);
    }

    public java.util.List<User> getFollowers(Long userId) {
        return new java.util.ArrayList<>(getUserById(userId).getFollowers());
    }

    public long countFollowing(Long userId) {
        return userRepository.countFollowing(userId);
    }

    // XP level thresholds: level n requires sum of thresholds[0..n-1] total XP
    // Threshold for level n = 100 * n * (n+1)/2  (triangular, gets progressively harder)
    public static int levelFromXp(long xp) {
        int level = 0;
        long required = 0;
        int n = 1;
        while (true) {
            required += 100L * n;
            if (xp < required) return level;
            level++;
            n++;
        }
    }

    public static long xpForNextLevel(int level) {
        // total XP needed to reach level+1
        long total = 0;
        for (int i = 1; i <= level + 1; i++) total += 100L * i;
        return total;
    }
}
