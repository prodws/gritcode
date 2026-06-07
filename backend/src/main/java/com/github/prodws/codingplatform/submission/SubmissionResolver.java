package com.github.prodws.codingplatform.submission;

import com.github.prodws.codingplatform.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class SubmissionResolver {
    private final SubmissionService submissionService;
    private final UserService userService;

    @QueryMapping
    public List<Submission> mySubmissions(Authentication auth) {
        Long userId = Long.parseLong(auth.getName());
        return submissionService.getSubmissionsByUser(userId);
    }

    @QueryMapping
    public List<Submission> submissionsByUsername(@Argument String username) {
        Long userId = userService.getUserByUsername(username).getId();
        return submissionService.getSubmissionsByUser(userId);
    }

    @QueryMapping
    public List<Submission> submissionsByGame(@Argument Long gameId) {
        return submissionService.getSubmissionsByGame(gameId);
    }

    @MutationMapping
    public Submission submitSolution(@Argument("input") SubmitSolutionInput input) {
        ExecutionResult executionResult =
                submissionService.submitSolution(input.problemId(), input.solutionCode());
        Submission saved = submissionService.saveSubmission(
                input.userId(),
                input.problemId(),
                input.solutionCode(),
                executionResult
        );
        // Award XP for first-time practice solve
        if (executionResult.passed()) {
            userService.addPracticeXpIfFirstSolve(input.userId(), input.problemId());
        }
        return saved;
    }

    @MutationMapping
    public ExecutionResult runSolution(@Argument("input") SubmitSolutionInput input) {
        return submissionService.submitSolution(input.problemId(), input.solutionCode());
    }
}
