package com.github.prodws.codingplatform.submission;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    @Query("SELECT s FROM Submission s JOIN FETCH s.problem WHERE s.user.id = :userId ORDER BY s.createdAt DESC")
    List<Submission> findAllByUserId(@Param("userId") Long userId);
    List<Submission> findAllByUserIdAndProblemId(Long userId, String problemId);
    List<Submission> findAllByGameIdAndTeamId(Long gameId, Long teamId);
    List<Submission> findAllByGameIdAndProblemIdAndTeamId(Long gameId, Long problemId, Long teamId);
}