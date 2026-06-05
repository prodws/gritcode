package com.github.prodws.codingplatform.game;

import com.github.prodws.codingplatform.config.AuthUtils;
import com.github.prodws.codingplatform.submission.Submission;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class GameResolver {

    private final GameService gameService;

    @MutationMapping
    public Game createGame(@Argument("input") CreateGameInput input, Authentication auth) {
        Long userId = AuthUtils.extractUserId(auth);
        return gameService.createGame(userId, input);
    }

    @MutationMapping
    public Game joinGameByCode(@Argument String code, Authentication auth) {
        Long userId = AuthUtils.extractUserId(auth);
        return gameService.joinByCode(code, userId);
    }

    @MutationMapping
    public Game updateGameSettings(
            @Argument Long gameId,
            @Argument Integer maxTeams,
            @Argument Integer maxPlayersPerTeam,
            @Argument Integer problemCount,
            @Argument Integer timeLimitSeconds,
            Authentication auth) {
        Long userId = AuthUtils.extractUserId(auth);
        return gameService.updateSettings(gameId, userId, maxTeams, maxPlayersPerTeam, problemCount, timeLimitSeconds);
    }

    @MutationMapping
    public Game switchGameTeam(@Argument Long gameId, @Argument Long teamId, Authentication auth) {
        Long userId = AuthUtils.extractUserId(auth);
        return gameService.switchTeam(gameId, teamId, userId);
    }

    @MutationMapping
    public Game leaveGame(@Argument Long gameId, Authentication auth) {
        Long userId = AuthUtils.extractUserId(auth);
        return gameService.leaveGame(gameId, userId);
    }

    @MutationMapping
    public Game startGame(@Argument Long gameId, Authentication auth) {
        Long userId = AuthUtils.extractUserId(auth);
        return gameService.startGame(gameId, userId);
    }

    @MutationMapping
    public Submission submitGameSolution(
            @Argument Long gameId,
            @Argument Long problemId,
            @Argument String code,
            Authentication auth) {
        Long userId = AuthUtils.extractUserId(auth);
        return gameService.submitGameSolution(gameId, problemId, code, userId);
    }

    @MutationMapping
    public Game finishGame(@Argument Long gameId, Authentication auth) {
        Long userId = AuthUtils.extractUserId(auth);
        return gameService.finalizeGameById(gameId, userId);
    }

    @MutationMapping
    public Boolean sendChatMessage(@Argument Long gameId, @Argument String text, Authentication auth) {
        Long userId = AuthUtils.extractUserId(auth);
        gameService.sendChat(gameId, userId, text);
        return true;
    }

    @QueryMapping
    public Game gameById(@Argument Long id) {
        return gameService.getGame(id);
    }

    @QueryMapping
    public Game gameByCode(@Argument String code) {
        return gameService.getGameByCode(code).orElse(null);
    }

    @QueryMapping
    public List<Game> myActiveGames(Authentication auth) {
        Long userId = AuthUtils.extractUserId(auth);
        return gameService.activeGamesFor(userId);
    }

    @QueryMapping
    public List<Game> myFinishedGames(Authentication auth) {
        Long userId = AuthUtils.extractUserId(auth);
        return gameService.finishedGamesFor(userId);
    }
}
