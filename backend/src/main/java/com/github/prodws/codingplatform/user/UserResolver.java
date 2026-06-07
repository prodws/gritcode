package com.github.prodws.codingplatform.user;

import com.github.prodws.codingplatform.config.AuthUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class UserResolver {

    private final UserService userService;

    @QueryMapping
    public User userByUsername(@Argument String username) {
        return userService.getUserByUsername(username);
    }

    @MutationMapping
    public User register(@Argument String username,
                         @Argument String email,
                         @Argument String password) {
        return userService.register(username, email, password);
    }

    @MutationMapping
    public String login(@Argument String emailOrUsername,
                        @Argument String password) {
        return userService.login(emailOrUsername, password);
    }

    @MutationMapping
    public User updateUsername(@Argument String newUsername, Authentication auth) {
        return userService.updateUsername(AuthUtils.extractUserId(auth), newUsername);
    }

    @MutationMapping
    public User updatePassword(@Argument String currentPassword, @Argument String newPassword, Authentication auth) {
        return userService.updatePassword(AuthUtils.extractUserId(auth), currentPassword, newPassword);
    }

    @MutationMapping
    public User updateAvatar(@Argument String base64Data, Authentication auth) {
        return userService.updateAvatar(AuthUtils.extractUserId(auth), base64Data);
    }

    @MutationMapping
    public boolean followUser(@Argument String username, Authentication auth) {
        Long followedId = userService.getUserByUsername(username).getId();
        return userService.followUser(AuthUtils.extractUserId(auth), followedId);
    }

    @MutationMapping
    public boolean unfollowUser(@Argument String username, Authentication auth) {
        Long followedId = userService.getUserByUsername(username).getId();
        return userService.unfollowUser(AuthUtils.extractUserId(auth), followedId);
    }

    @QueryMapping
    public boolean isFollowing(@Argument String targetUsername, Authentication auth) {
        Long followedId = userService.getUserByUsername(targetUsername).getId();
        return userService.isFollowing(AuthUtils.extractUserId(auth), followedId);
    }

    @QueryMapping
    public int followerCount(@Argument String username) {
        Long userId = userService.getUserByUsername(username).getId();
        return (int) userService.countFollowers(userId);
    }

    @QueryMapping
    public int followingCount(@Argument String username) {
        Long userId = userService.getUserByUsername(username).getId();
        return (int) userService.countFollowing(userId);
    }

    @QueryMapping
    public boolean checkAvailability(@Argument String field, @Argument String value) {
        return userService.checkAvailability(field, value);
    }

    @QueryMapping
    public User me(Authentication authentication) {
        if (authentication == null) throw new RuntimeException("Not authenticated");
        return userService.getUserById(Long.parseLong(authentication.getName()));
    }

    // Computed fields on User type
    @SchemaMapping(typeName = "User", field = "level")
    public int level(User user) {
        return UserService.levelFromXp(user.getTotalPoints());
    }

    @SchemaMapping(typeName = "User", field = "xpForNextLevel")
    public int xpForNextLevel(User user) {
        int currentLevel = UserService.levelFromXp(user.getTotalPoints());
        return (int) UserService.xpForNextLevel(currentLevel);
    }
}
