package com.github.prodws.codingplatform.user;

import com.github.prodws.codingplatform.config.JwtTokenProvider;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final Validator validator;

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
        if (!violations.isEmpty()) {
            throw new ConstraintViolationException(violations);
        }
        return userRepository.save(user);
    }

    private void checkIfEmailExists(String email) {
        if (userRepository.existsByEmail(email))
            throw new IllegalStateException("Email already taken");
    }

    private void checkIfUsernameExists(String username) {
        if (userRepository.existsByUsername(username))
            throw new IllegalStateException("Username already taken");
    }

    public void deleteUser(Long id) {
        if (!userRepository.existsById(id))
            throw new IllegalStateException("User not found");
        userRepository.deleteById(id);
    }

    private boolean verifyPassword(String rawPassword, String storedHash) {
        return passwordEncoder.matches(rawPassword, storedHash);
    }

    public User updateUsername(Long id, String newUsername) {
        User user = getUserById(id);
        checkIfUsernameExists(newUsername);
        user.setUsername(newUsername);
        return userRepository.save(user);
    }

    public User updatePassword(Long id, String newPassword) {
        User user = getUserById(id);
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
}
