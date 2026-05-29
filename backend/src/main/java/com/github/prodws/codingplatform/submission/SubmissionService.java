package com.github.prodws.codingplatform.submission;

import com.github.prodws.codingplatform.problem.*;
import com.github.prodws.codingplatform.user.User;
import com.github.prodws.codingplatform.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class SubmissionService {

    private final ProblemService problemService;
    private final SubmissionExecutor submissionExecutor;
    private final SubmissionEvaluator evaluator;
    private final SubmissionRequestFactory requestFactory;
    private final SolutionCodeValidator validator;
    private final Logger log = LoggerFactory.getLogger(SubmissionService.class);
    private final UserRepository userRepository;
    private final ProblemRepository problemRepository;
    private final SubmissionRepository submissionRepository;

    public SubmissionService(
            ProblemService problemService,
            SubmissionExecutor submissionExecutor,
            SubmissionEvaluator evaluator,
            SubmissionRequestFactory requestFactory,
            SolutionCodeValidator validator,
            UserRepository userRepository,
            ProblemRepository problemRepository,
            SubmissionRepository submissionRepository
    ) {
        this.problemService = problemService;
        this.submissionExecutor = submissionExecutor;
        this.evaluator = evaluator;
        this.requestFactory = requestFactory;
        this.validator = validator;

        this.userRepository = userRepository;
        this.problemRepository = problemRepository;
        this.submissionRepository = submissionRepository;
    }

    public ExecutionResult submitSolution(Long problemId, String solutionCode) {
        log.info("Submission started: problemId={}", problemId);
        try {
            validator.validate(solutionCode);
            CodingProblem problem = loadCodingProblem(problemId);
            SubmissionRequest request =
                    requestFactory.build(problem, solutionCode);
            RawExecutionResult raw = submissionExecutor.execute(request);
            ExecutionResult result = toExecutionResult(raw);

            log.info("Submission finished: problemId={}, status={}",
                    problemId, result.status());
            return result;
        } catch (IllegalArgumentException | IllegalStateException e) {
            log.warn("Submission rejected: problemId={}, reason={}",
                    problemId, e.getMessage());
            return new ExecutionResult(
                    ExecutionStatus.INVALID_SUBMISSION,
                    "",
                    e.getMessage(),
                    false
            );
        } catch (Exception e) {
            log.error("Submission failed (system error): problemId={}",
                    problemId, e);
            return new ExecutionResult(
                    ExecutionStatus.SYSTEM_ERROR,
                    "",
                    "Internal error: " + e.getMessage(),
                    false
            );
        }
    }

    public Submission saveSubmission(Long userId, Long problemId, String code, ExecutionResult result) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new RuntimeException("Problem not found"));

        Submission submission = Submission.builder()
                .user(user)
                .problem(problem)
                .code(code)
                .status(result.status())
                .stdout(result.stdout())
                .stderr(result.stderr())
                .passed(result.passed())
                .build();

        return submissionRepository.save(submission);
    }


    private CodingProblem loadCodingProblem(Long problemId) {
        Problem problem = problemService.getProblemById(problemId);
        if (!(problem instanceof CodingProblem codingProblem)) {
            throw new IllegalArgumentException("Problem is not a coding problem");
        }
        return codingProblem;
    }

    private ExecutionResult toExecutionResult(RawExecutionResult raw) {
        ExecutionStatus status = evaluator.interpretResult(raw);
        return new ExecutionResult(
                status,
                raw.stdout(),
                raw.stderr(),
                status == ExecutionStatus.PASSED
        );
    }
}
