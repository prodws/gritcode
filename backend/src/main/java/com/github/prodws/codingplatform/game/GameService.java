package com.github.prodws.codingplatform.game;

import com.github.prodws.codingplatform.problem.Problem;
import com.github.prodws.codingplatform.problem.ProblemRepository;
import com.github.prodws.codingplatform.problem.ProblemType;
import com.github.prodws.codingplatform.submission.ExecutionResult;
import com.github.prodws.codingplatform.submission.Submission;
import com.github.prodws.codingplatform.submission.SubmissionRepository;
import com.github.prodws.codingplatform.submission.SubmissionService;
import com.github.prodws.codingplatform.user.User;
import com.github.prodws.codingplatform.user.UserRepository;
import com.github.prodws.codingplatform.user.UserService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class GameService {

    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LEN = 6;
    private static final SecureRandom RNG = new SecureRandom();

    private final GameRepository gameRepository;
    private final GameTeamRepository teamRepository;
    private final GamePlayerRepository playerRepository;
    private final UserRepository userRepository;
    private final ProblemRepository problemRepository;
    private final SubmissionRepository submissionRepository;
    private final SubmissionService submissionService;
    private final GameEventPublisher eventPublisher;
    private final UserService userService;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public Game createGame(Long hostUserId, CreateGameInput input) {
        User host = userRepository.findById(hostUserId)
                .orElseThrow(() -> new IllegalArgumentException("Host user not found"));

        int maxTeams = clamp(input.maxTeams(), 2, 5, 2);
        int maxPlayers = clamp(input.maxPlayersPerTeam(), 1, 5, 2);
        int problemCount = clamp(input.problemCount(), 1, 10, 3);
        int timeLimit = clamp(input.timeLimitSeconds(), 60, 60 * 60, 5 * 60);

        List<Problem> codingProblems = problemRepository.findAll().stream()
                .filter(p -> p.getType() == ProblemType.CODING)
                .toList();
        if (codingProblems.size() < problemCount) {
            throw new IllegalStateException("Not enough coding problems available");
        }
        List<Problem> shuffled = new ArrayList<>(codingProblems);
        Collections.shuffle(shuffled);
        List<Problem> chosen = shuffled.subList(0, problemCount);

        Game game = Game.builder()
                .status(GameStatus.WAITING)
                .inviteCode(generateUniqueCode())
                .isPractice(false)
                .maxTeams(maxTeams)
                .maxPlayersPerTeam(maxPlayers)
                .timeLimitSeconds(timeLimit)
                .host(host)
                .build();

        for (int i = 0; i < maxTeams; i++) {
            GameTeam team = GameTeam.builder()
                    .game(game)
                    .teamName("Team " + i)
                    .build();
            game.getTeams().add(team);
        }

        for (int i = 0; i < chosen.size(); i++) {
            GameProblem gp = GameProblem.builder()
                    .game(game)
                    .problem(chosen.get(i))
                    .sortOrder(i)
                    .build();
            game.getProblems().add(gp);
        }

        Game saved = gameRepository.save(game);

        joinTeam(saved.getId(), saved.getTeams().get(0).getId(), hostUserId);

        return gameRepository.findById(saved.getId()).orElseThrow();
    }

    @Transactional
    public Game updateSettings(Long gameId, Long userId, Integer maxTeams, Integer maxPlayersPerTeam, Integer problemCount, Integer timeLimitSeconds) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new IllegalArgumentException("Game not found"));
        if (!game.getHost().getId().equals(userId)) {
            throw new IllegalStateException("Only host can update settings");
        }
        if (game.getStatus() != GameStatus.WAITING) {
            throw new IllegalStateException("Cannot change settings after the game has started");
        }

        int newMaxTeams = clamp(maxTeams, 2, 5, game.getMaxTeams());
        int newMaxPlayers = clamp(maxPlayersPerTeam, 1, 5, game.getMaxPlayersPerTeam());
        int newProblemCount = clamp(problemCount, 1, 10, game.getProblems().size());
        int newTimeLimit = clamp(timeLimitSeconds, 60, 60 * 60, game.getTimeLimitSeconds());

        game.setMaxPlayersPerTeam(newMaxPlayers);
        game.setTimeLimitSeconds(newTimeLimit);

        List<GameTeam> teams = new ArrayList<>(game.getTeams());
        teams.sort(Comparator.comparing(GameTeam::getId));
        if (newMaxTeams > teams.size()) {
            for (int i = teams.size(); i < newMaxTeams; i++) {
                GameTeam team = GameTeam.builder()
                        .game(game)
                        .teamName("Team " + i)
                        .build();
                game.getTeams().add(team);
            }
        } else if (newMaxTeams < teams.size()) {
            for (int i = teams.size() - 1; i >= newMaxTeams; i--) {
                GameTeam toRemove = teams.get(i);
                for (GamePlayer p : new ArrayList<>(toRemove.getPlayers())) {
                    playerRepository.delete(p);
                }
                game.getTeams().remove(toRemove);
                teamRepository.delete(toRemove);
            }
        }
        game.setMaxTeams(newMaxTeams);

        for (GameTeam team : game.getTeams()) {
            if (team.getPlayers().size() > newMaxPlayers) {
                List<GamePlayer> toRemove = new ArrayList<>();
                List<GamePlayer> players = new ArrayList<>(team.getPlayers());
                players.sort(Comparator.comparing(p -> p.getPlayer().getId().equals(game.getHost().getId())));
                
                int numToRemove = players.size() - newMaxPlayers;
                for (int i = 0; i < numToRemove; i++) {
                    toRemove.add(players.get(i));
                }
                
                for (GamePlayer p : toRemove) {
                    team.getPlayers().remove(p);
                    playerRepository.delete(p);
                }
            }
        }

        List<GameProblem> currentProblems = new ArrayList<>(game.getProblems());
        currentProblems.sort(Comparator.comparingInt(GameProblem::getSortOrder));
        if (newProblemCount < currentProblems.size()) {
            for (int i = currentProblems.size() - 1; i >= newProblemCount; i--) {
                GameProblem gp = currentProblems.get(i);
                game.getProblems().remove(gp);
            }
        } else if (newProblemCount > currentProblems.size()) {
            Set<Long> usedIds = currentProblems.stream()
                    .map(gp -> gp.getProblem().getId())
                    .collect(java.util.stream.Collectors.toSet());
            List<Problem> available = problemRepository.findAll().stream()
                    .filter(p -> p.getType() == ProblemType.CODING)
                    .filter(p -> !usedIds.contains(p.getId()))
                    .collect(java.util.stream.Collectors.toList());
            Collections.shuffle(available);
            int needed = newProblemCount - currentProblems.size();
            for (int i = 0; i < needed && i < available.size(); i++) {
                GameProblem gp = GameProblem.builder()
                        .game(game)
                        .problem(available.get(i))
                        .sortOrder(currentProblems.size() + i)
                        .build();
                game.getProblems().add(gp);
            }
        }

        gameRepository.saveAndFlush(game);
        eventPublisher.publishStateChanged(gameId);
        return gameRepository.findById(gameId).orElseThrow();
    }

    @Transactional
    public Game joinByCode(String code, Long userId) {
        Game game = gameRepository.findByInviteCode(code.toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("Game not found"));
        if (game.getStatus() != GameStatus.WAITING) {
            throw new IllegalStateException("Game has already started");
        }
        GameTeam target = null;
        for (GameTeam t : game.getTeams()) {
            boolean alreadyIn = playerRepository.findByTeamGameIdAndPlayerId(game.getId(), userId).isPresent();
            if (alreadyIn) return game;
            if (t.getPlayers().size() < game.getMaxPlayersPerTeam()) {
                target = t;
                break;
            }
        }
        if (target == null) {
            throw new IllegalStateException("Game is full");
        }
        joinTeam(game.getId(), target.getId(), userId);
        return gameRepository.findById(game.getId()).orElseThrow();
    }

    @Transactional
    public Game switchTeam(Long gameId, Long newTeamId, Long userId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new IllegalArgumentException("Game not found"));
        if (game.getStatus() != GameStatus.WAITING) {
            throw new IllegalStateException("Cannot switch teams after game has started");
        }
        GameTeam target = game.getTeams().stream()
                .filter(t -> t.getId().equals(newTeamId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Team not in this game"));
        if (target.getPlayers().size() >= game.getMaxPlayersPerTeam()) {
            throw new IllegalStateException("Target team is full");
        }
        Optional<GamePlayer> existing = playerRepository.findByTeamGameIdAndPlayerId(gameId, userId);
        if (existing.isPresent()) {
            GamePlayer gp = existing.get();
            GameTeam oldTeam = gp.getTeam();
            oldTeam.getPlayers().remove(gp);
            playerRepository.delete(gp);
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        GamePlayer fresh = GamePlayer.builder()
                .team(target)
                .player(user)
                .build();
        target.getPlayers().add(fresh);
        playerRepository.save(fresh);
        eventPublisher.publishStateChanged(gameId);
        return gameRepository.findById(gameId).orElseThrow();
    }

    private void joinTeam(Long gameId, Long teamId, Long userId) {
        GameTeam team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        GamePlayer gp = GamePlayer.builder()
                .team(team)
                .player(user)
                .build();
        playerRepository.save(gp);
        eventPublisher.publishStateChanged(gameId);
    }

    @Transactional
    public Game leaveGame(Long gameId, Long userId) {
        Game game = gameRepository.findById(gameId).orElseThrow();
        boolean isHost = game.getHost().getId().equals(userId);
        Optional<GamePlayer> player = playerRepository.findByTeamGameIdAndPlayerId(gameId, userId);
        player.ifPresent(playerRepository::delete);

        if (isHost) {
            if (game.getStatus() == GameStatus.WAITING) {
                game.setStatus(GameStatus.CANCELLED);
                game.setEndedAt(Instant.now());
                game = gameRepository.save(game);
            } else if (game.getStatus() == GameStatus.IN_PROGRESS) {
                game = finalizeGame(game);
            }
        }
        eventPublisher.publishStateChanged(gameId);
        return game;
    }

    @Transactional
    public Game startGame(Long gameId, Long userId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new IllegalArgumentException("Game not found"));
        if (!game.getHost().getId().equals(userId)) {
            throw new IllegalStateException("Only host can start the game");
        }
        if (game.getStatus() != GameStatus.WAITING) {
            throw new IllegalStateException("Game already started");
        }
        boolean everyTeamHasPlayer = game.getTeams().stream().allMatch(t -> !t.getPlayers().isEmpty());
        if (!everyTeamHasPlayer) {
            throw new IllegalStateException("Every team must have at least one player");
        }
        game.setStatus(GameStatus.IN_PROGRESS);
        game.setStartedAt(Instant.now());
        Game saved = gameRepository.save(game);
        eventPublisher.publishStateChanged(gameId);
        return saved;
    }

    @Transactional
    public Submission submitGameSolution(Long gameId, Long problemId, String code, Long userId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new IllegalArgumentException("Game not found"));
        if (game.getStatus() != GameStatus.IN_PROGRESS) {
            throw new IllegalStateException("Game is not in progress");
        }
        GamePlayer player = playerRepository.findByTeamGameIdAndPlayerId(gameId, userId)
                .orElseThrow(() -> new IllegalStateException("You are not in this game"));

        boolean validProblem = game.getProblems().stream()
                .anyMatch(gp -> gp.getProblem().getId().equals(problemId));
        if (!validProblem) {
            throw new IllegalArgumentException("Problem is not part of this game");
        }

        ExecutionResult result = submissionService.submitSolution(problemId, code);

        Submission submission = submissionService.saveSubmission(userId, problemId, code, result);
        submission.setGame(game);
        submission.setTeam(player.getTeam());
        Submission saved = submissionRepository.save(submission);

        int pointsAwarded = 0;
        if (result.passed()) {
            GameTeam team = teamRepository.findById(player.getTeam().getId())
                    .orElseThrow(() -> new IllegalStateException("Team not found"));
            entityManager.lock(team, LockModeType.PESSIMISTIC_WRITE);

            boolean alreadySolved = submissionRepository
                    .findAllByGameIdAndProblemIdAndTeamId(gameId, problemId, team.getId())
                    .stream()
                    .anyMatch(s -> s.isPassed() && !s.getId().equals(saved.getId()));

            if (!alreadySolved) {
                pointsAwarded = pointsForProblem(game, problemId);
                team.setScore(team.getScore() + pointsAwarded);
                teamRepository.save(team);
            }
            checkAndFinish(game);
        }

        // Find problem index (for "#N" reference) and team index (for color)
        List<GameProblem> sortedProblems = new ArrayList<>(game.getProblems());
        sortedProblems.sort(Comparator.comparingInt(GameProblem::getSortOrder));
        int problemIdx = 0;
        String problemTitle = "";
        for (int i = 0; i < sortedProblems.size(); i++) {
            if (sortedProblems.get(i).getProblem().getId().equals(problemId)) {
                problemIdx = i;
                problemTitle = sortedProblems.get(i).getProblem().getTitle();
                break;
            }
        }
        List<GameTeam> teams = new ArrayList<>(game.getTeams());
        teams.sort(Comparator.comparing(GameTeam::getId));
        int teamIdx = -1;
        for (int i = 0; i < teams.size(); i++) {
            if (teams.get(i).getId().equals(player.getTeam().getId())) {
                teamIdx = i;
                break;
            }
        }

        eventPublisher.publishSubmissionActivity(
                gameId,
                player.getPlayer().getUsername(),
                teamIdx,
                problemTitle,
                problemIdx,
                result.passed(),
                pointsAwarded
        );
        eventPublisher.publishStateChanged(gameId);
        return saved;
    }

    private int pointsForProblem(Game game, Long problemId) {
        Problem p = game.getProblems().stream()
                .map(GameProblem::getProblem)
                .filter(pr -> pr.getId().equals(problemId))
                .findFirst().orElseThrow();
        int base = switch (p.getDifficulty()) {
            case EASY   -> 100;
            case MEDIUM -> 200;
            case HARD   -> 400;
        };
        // Time bonus: up to 50% extra for solving quickly
        // Decay linearly over the time limit; minimum is the base score
        if (game.getStartedAt() != null) {
            long elapsedSeconds = java.time.Duration.between(game.getStartedAt(), Instant.now()).toSeconds();
            long timeLimit = game.getTimeLimitSeconds();
            double fraction = Math.max(0.0, 1.0 - (double) elapsedSeconds / timeLimit);
            int bonus = (int) (base * 0.5 * fraction);
            return base + bonus;
        }
        return base;
    }

    private void checkAndFinish(Game game) {
        int totalProblems = game.getProblems().size();
        boolean allTeamsDone = game.getTeams().stream().allMatch(team -> {
            long solved = submissionRepository
                    .findAllByGameIdAndTeamId(game.getId(), team.getId()).stream()
                    .filter(Submission::isPassed)
                    .map(s -> s.getProblem().getId())
                    .distinct().count();
            return solved >= totalProblems;
        });
        if (allTeamsDone || game.getTeams().stream().allMatch(t -> t.getPlayers().isEmpty())) {
            finalizeGame(game);
        }
    }

    @Transactional
    public Game finalizeGame(Game game) {
        if (game.getStatus() == GameStatus.FINISHED) return game;
        game.setStatus(GameStatus.FINISHED);
        game.setEndedAt(Instant.now());

        List<GameTeam> teams = new ArrayList<>(game.getTeams());
        teams.sort(Comparator.comparingInt(GameTeam::getScore).reversed());
        int rank = 1;
        Integer topScore = teams.isEmpty() ? null : teams.get(0).getScore();
        int numTeams = teams.size();
        for (GameTeam t : teams) {
            boolean isWinner = topScore != null && t.getScore().equals(topScore) && topScore > 0;
            t.setRank(rank);
            t.setWinner(isWinner);
            teamRepository.save(t);

            long xpPerPlayer = isWinner
                    ? (long) t.getScore() + 50L
                    : (long) t.getScore() / 2;
            if (xpPerPlayer > 0) {
                for (GamePlayer gp : t.getPlayers()) {
                    userService.addPoints(gp.getPlayer().getId(), xpPerPlayer);
                }
            }
            rank++;
        }
        Game saved = gameRepository.save(game);
        eventPublisher.publishStateChanged(game.getId());
        return saved;
    }

    @Transactional
    public Game finalizeGameById(Long gameId, Long userId) {
        Game game = gameRepository.findById(gameId).orElseThrow();
        if (!game.getHost().getId().equals(userId)) {
            throw new IllegalStateException("Only host can finalize");
        }
        return finalizeGame(game);
    }

    public Game getGame(Long gameId) {
        return gameRepository.findById(gameId)
                .orElseThrow(() -> new IllegalArgumentException("Game not found"));
    }

    public Optional<Game> getGameByCode(String code) {
        return gameRepository.findByInviteCode(code == null ? "" : code.toUpperCase());
    }

    public List<Game> activeGamesFor(Long userId) {
        return gameRepository.findActiveGamesForUser(userId);
    }

    public List<Game> finishedGamesFor(Long userId) {
        return gameRepository.findFinishedGamesForUser(userId);
    }

    public int teamScore(GameTeam team) {
        return team.getScore();
    }

    public List<Submission> teamSubmissions(Long gameId, Long teamId) {
        return submissionRepository.findAllByGameIdAndTeamId(gameId, teamId);
    }

    private String generateUniqueCode() {
        for (int attempt = 0; attempt < 50; attempt++) {
            StringBuilder sb = new StringBuilder(CODE_LEN);
            for (int i = 0; i < CODE_LEN; i++) {
                sb.append(ALPHABET.charAt(RNG.nextInt(ALPHABET.length())));
            }
            String code = sb.toString();
            if (gameRepository.findByInviteCode(code).isEmpty()) return code;
        }
        throw new IllegalStateException("Could not generate unique invite code");
    }

    private int clamp(Integer value, int min, int max, int fallback) {
        if (value == null) return fallback;
        return Math.max(min, Math.min(max, value));
    }

    public void sendChat(Long gameId, Long userId, String rawText) {
        String text = rawText == null ? "" : rawText.trim();
        if (text.isEmpty()) return;
        if (text.length() > 500) text = text.substring(0, 500);

        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new IllegalArgumentException("Game not found"));
        if (game.getStatus() == GameStatus.CANCELLED || game.getStatus() == GameStatus.FINISHED) {
            throw new IllegalStateException("Cannot chat in a finished game");
        }

        GamePlayer player = playerRepository.findByTeamGameIdAndPlayerId(gameId, userId)
                .orElseThrow(() -> new IllegalStateException("You are not in this game"));

        List<GameTeam> teams = new ArrayList<>(game.getTeams());
        teams.sort(Comparator.comparing(GameTeam::getId));
        int teamIndex = -1;
        for (int i = 0; i < teams.size(); i++) {
            if (teams.get(i).getId().equals(player.getTeam().getId())) {
                teamIndex = i;
                break;
            }
        }

        eventPublisher.publishChat(gameId, player.getPlayer().getUsername(), teamIndex, text);
    }
}
