package com.github.prodws.codingplatform.user;

import com.github.prodws.codingplatform.config.JwtTokenProvider;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private BCryptPasswordEncoder passwordEncoder;
    @Mock
    private JwtTokenProvider jwtTokenProvider;
    @Mock
    private Validator validator;

    @InjectMocks
    private UserService userService;

    // Common test data
    private final String username = "alice";
    private final String email = "alice@example.com";
    private final String password = "password123";
    private final String hashedPassword = "hashed";
    private User alice;

    @BeforeEach
    void setUp() {
        alice = new User(username, email, hashedPassword);
    }

    @Test
    void register_success() {
        when(userRepository.existsByEmail(email)).thenReturn(false);
        when(userRepository.existsByUsername(username)).thenReturn(false);
        when(passwordEncoder.encode(password)).thenReturn(hashedPassword);
        when(validator.validate(any(User.class))).thenReturn(Collections.emptySet());
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User result = userService.register(username, email, password);

        assertThat(result.getUsername()).isEqualTo(username);
        assertThat(result.getEmail()).isEqualTo(email);
        assertThat(result.getPasswordHash()).isEqualTo(hashedPassword);
        assertThat(result.getTotalPoints()).isEqualTo(0L);
        assertThat(result.getRole()).isEqualTo(Role.PLAYER);
    }

    @Test
    void register_emailTaken_throwsException() {
        when(userRepository.existsByEmail(email)).thenReturn(true);

        assertThatThrownBy(() -> userService.register(username, email, password))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Email already taken");
    }

    @Test
    void register_usernameTaken_throwsException() {
        when(userRepository.existsByEmail(email)).thenReturn(false);
        when(userRepository.existsByUsername(username)).thenReturn(true);

        assertThatThrownBy(() -> userService.register(username, email, password))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Username already taken");
    }

    @Test
    void login_byUsername_success() {
        when(userRepository.findByEmail(username)).thenReturn(Optional.empty());
        when(userRepository.findByUsername(username)).thenReturn(Optional.of(alice));
        when(passwordEncoder.matches(password, hashedPassword)).thenReturn(true);
        when(jwtTokenProvider.generateToken(alice)).thenReturn("jwt-token");

        String result = userService.login(username, password);

        assertThat(result).isEqualTo("jwt-token");
    }

    @Test
    void login_byEmail_success() {
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(alice));
        when(passwordEncoder.matches(password, hashedPassword)).thenReturn(true);
        when(jwtTokenProvider.generateToken(alice)).thenReturn("jwt-token");

        String result = userService.login(email, password);

        assertThat(result).isEqualTo("jwt-token");
    }

    @Test
    void login_noSuchUsername_throwsException() {
        when(userRepository.findByEmail(username)).thenReturn(Optional.empty());
        when(userRepository.findByUsername(username)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.login(username, password))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("User not found");
    }

    @Test
    void login_noSuchEmail_throwsException() {
        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());
        when(userRepository.findByUsername(email)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.login(email, password))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("User not found");
    }

    @Test
    void login_invalidCredentials_throwsException() {
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(alice));
        when(passwordEncoder.matches(password, hashedPassword)).thenReturn(false);

        assertThatThrownBy(() -> userService.login(email, password))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Invalid credentials");
    }

    @Test
    void getUsers_returnsAllUsers() {
        List<User> users = List.of(alice, new User("bob", "bob@example.com", "hashed"));
        when(userRepository.findAll()).thenReturn(users);

        List<User> result = userService.getUsers();

        assertThat(result).hasSize(users.size());
    }

    @Test
    void getUserById_success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(alice));

        User result = userService.getUserById(1L);

        assertThat(result.getUsername()).isEqualTo(username);
        assertThat(result.getEmail()).isEqualTo(email);
    }

    @Test
    void getUserById_notFound_throwsException() {
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getUserById(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("User not found");
    }

    @Test
    void getUserByEmail_success() {
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(alice));

        User result = userService.getUserByEmail(email);

        assertThat(result.getEmail()).isEqualTo(email);
    }

    @Test
    void getUserByEmail_notFound_throwsException() {
        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getUserByEmail(email))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("User not found");
    }

    @Test
    void getUserByUsername_success() {
        when(userRepository.findByUsername(username)).thenReturn(Optional.of(alice));

        User result = userService.getUserByUsername(username);

        assertThat(result.getUsername()).isEqualTo(username);
    }

    @Test
    void getUserByUsername_notFound_throwsException() {
        when(userRepository.findByUsername(username)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getUserByUsername(username))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("User not found");
    }

    @Test
    void updateUsername_success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(alice));
        when(userRepository.existsByUsername("bob")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User result = userService.updateUsername(1L, "bob");

        assertThat(result.getUsername()).isEqualTo("bob");
    }

    @Test
    void updateUsername_usernameTaken_throwsException() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(alice));
        when(userRepository.existsByUsername("bob")).thenReturn(true);

        assertThatThrownBy(() -> userService.updateUsername(1L, "bob"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Username already taken");
    }

    @Test
    void updatePassword_success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(alice));
        when(passwordEncoder.matches(password, hashedPassword)).thenReturn(true);
        when(passwordEncoder.encode("newpass!")).thenReturn("newHashed");
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User result = userService.updatePassword(1L, password, "newpass!");

        assertThat(result.getPasswordHash()).isEqualTo("newHashed");
    }

    @Test
    void addPoints_success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(alice));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User result = userService.addPoints(1L, 100L);

        assertThat(result.getTotalPoints()).isEqualTo(100L);
    }

    @Test
    void deleteUser_success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(alice));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        userService.deleteUser(1L);

        verify(userRepository).deleteById(1L);
    }

    @Test
    void deleteUser_notFound_throwsException() {
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.deleteUser(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("User not found");
    }

    @Test
    void addPoints_accumulatesOnExistingPoints() {
        alice.setTotalPoints(50L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(alice));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User result = userService.addPoints(1L, 100L);

        assertThat(result.getTotalPoints()).isEqualTo(150L);
    }
}