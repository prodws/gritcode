package com.github.prodws.codingplatform.game;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GameTeamRepository extends JpaRepository<GameTeam, Long> {
    List<GameTeam> findAllByGameId(Long gameId);
}
