package com.github.prodws.codingplatform.submission;

import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class SubmissionResolver {
    private final SubmissionService submissionService;

    @MutationMapping
    public Submission submitSolution(@Argument("input") SubmitSolutionInput input) {
        ExecutionResult executionResult =
                submissionService.submitSolution(input.problemId(), input.solutionCode());
        return submissionService.saveSubmission(
                input.userId(),
                input.problemId(),
                input.solutionCode(),
                executionResult
        );
    }

    @MutationMapping
    public ExecutionResult runSolution(@Argument("input") SubmitSolutionInput input) {
        return submissionService.submitSolution(input.problemId(), input.solutionCode());
    }
}
