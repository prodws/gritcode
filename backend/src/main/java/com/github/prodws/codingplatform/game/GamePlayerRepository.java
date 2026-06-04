package com.github.prodws.codingplatform.game;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GamePlayerRepository extends JpaRepository<GamePlayer, Long> {
    Optional<GamePlayer> findByTeamGameIdAndPlayerId(Long gameId, Long playerId);
}
