package com.github.prodws.codingplatform.game;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GameRepository extends JpaRepository<Game, Long> {
    Optional<Game> findByInviteCode(String inviteCode);

    @Query("SELECT DISTINCT g FROM Game g " +
           "JOIN g.teams t JOIN t.players p " +
           "WHERE p.player.id = :userId AND g.status IN ('WAITING','IN_PROGRESS') " +
           "ORDER BY g.createdAt DESC")
    List<Game> findActiveGamesForUser(@Param("userId") Long userId);

    @Query("SELECT DISTINCT g FROM Game g " +
           "JOIN g.teams t JOIN t.players p " +
           "WHERE p.player.id = :userId AND g.status = 'FINISHED' " +
           "ORDER BY g.endedAt DESC")
    List<Game> findFinishedGamesForUser(@Param("userId") Long userId);

    @Query("SELECT g FROM Game g " +
           "LEFT JOIN FETCH g.host " +
           "WHERE g.id = :id")
    Optional<Game> findByIdEager(@Param("id") Long id);
}
