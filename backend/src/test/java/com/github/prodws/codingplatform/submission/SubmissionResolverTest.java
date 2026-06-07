package com.github.prodws.codingplatform.submission;

import com.github.prodws.codingplatform.user.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubmissionResolverTest {

    @Mock
    private SubmissionService submissionService;
    @Mock
    private UserService userService;

    private SubmissionResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new SubmissionResolver(submissionService, userService);
    }

    @Test
    void submitSolution_success() {
        Long problemId = 1L;
        String solutionCode = "class Solution {}";
        SubmitSolutionInput input = new SubmitSolutionInput(99L, problemId, solutionCode);
        ExecutionResult expectedResult = new ExecutionResult(ExecutionStatus.PASSED, "ok", "", true);
        Submission expectedSubmission = Submission.builder().build();

        when(submissionService.submitSolution(problemId, solutionCode)).thenReturn(expectedResult);
        when(submissionService.saveSubmission(99L, problemId, solutionCode, expectedResult)).thenReturn(expectedSubmission);

        Submission result = resolver.submitSolution(input);

        assertEquals(expectedSubmission, result);
        verify(submissionService).submitSolution(problemId, solutionCode);
        verify(submissionService).saveSubmission(99L, problemId, solutionCode, expectedResult);
    }
}
