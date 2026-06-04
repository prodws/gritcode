package com.github.prodws.codingplatform.game;

public record CreateGameInput(
        Integer maxTeams,
        Integer maxPlayersPerTeam,
        Integer problemCount,
        Integer timeLimitSeconds
) {}
