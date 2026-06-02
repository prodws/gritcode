package com.github.prodws.codingplatform.problem;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProblemRepository extends JpaRepository<Problem, Long> {
    
    @Query("SELECT DISTINCT p FROM Problem p LEFT JOIN FETCH p.files")
    List<Problem> findAllWithFiles();

    @Query("SELECT p FROM Problem p LEFT JOIN FETCH p.files WHERE p.id = :id")
    Optional<Problem> findByIdWithFiles(@Param("id") Long id);
    
    @Query("SELECT p FROM Problem p LEFT JOIN FETCH p.files WHERE p.title = :title")
    Optional<Problem> findByTitleWithFiles(@Param("title") String title);
    
    @Query("SELECT p FROM Problem p LEFT JOIN FETCH p.files WHERE p.difficulty = :difficulty")
    List<Problem> findByDifficultyWithFiles(@Param("difficulty") ProblemDifficulty difficulty);

    Optional<Problem> findByTitle(String title);
    boolean existsByTitle(String title);
    List<Problem> findByDifficulty(ProblemDifficulty difficulty);
}
