package com.github.prodws.codingplatform.problem;

import com.github.prodws.codingplatform.problem.registration.CreateProblemRequest;
import com.github.prodws.codingplatform.problem.registration.FileInput;
import com.github.prodws.codingplatform.problem.registration.OptionInput;
import com.github.prodws.codingplatform.problem.registration.ProblemCreationStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProblemServiceTest {

    @Mock
    private ProblemRepository problemRepository;
    @Mock
    private ProblemCreationStrategy codingStrategy;
    @Mock
    private ProblemCreationStrategy selectionStrategy;

    private ProblemService problemService;

    @BeforeEach
    void setUp() {
        when(codingStrategy.supports()).thenReturn(ProblemType.CODING);
        when(selectionStrategy.supports()).thenReturn(ProblemType.SELECTION);

        problemService = new ProblemService(
                problemRepository,
                List.of(codingStrategy, selectionStrategy)
        );
    }

    @Test
    void getProblems_returnsAllProblems() {
        Problem p1 = mock(Problem.class);
        Problem p2 = mock(Problem.class);
        when(problemRepository.findAllWithFiles()).thenReturn(List.of(p1, p2));

        List<Problem> result = problemService.getProblems();

        assertThat(result).hasSize(2);
    }

    @Test
    void getProblemById_success() {
        Problem problem = mock(Problem.class);
        when(problemRepository.findByIdWithFiles(1L)).thenReturn(Optional.of(problem));

        Problem result = problemService.getProblemById(1L);

        assertThat(result).isSameAs(problem);
    }

    @Test
    void getProblemById_notFound_throwsException() {
        when(problemRepository.findByIdWithFiles(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> problemService.getProblemById(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Problem not found");
    }

    @Test
    void getProblemByTitle_success() {
        Problem problem = mock(Problem.class);
        when(problemRepository.findByTitleWithFiles("Two Sum")).thenReturn(Optional.of(problem));

        Problem result = problemService.getProblemByTitle("Two Sum");

        assertThat(result).isSameAs(problem);
    }

    @Test
    void getProblemByTitle_notFound_throwsException() {
        when(problemRepository.findByTitleWithFiles("Two Sum")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> problemService.getProblemByTitle("Two Sum"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Problem not found");
    }

    @Test
    void createProblem_success_coding() {
        CreateProblemRequest request = new CreateProblemRequest(
                ProblemType.CODING,
                "Two Sum",
                ProblemDifficulty.EASY,
                List.of(new FileInput("problems/two-sum/description.md", "description.md", FileRole.DESCRIPTION)),
                List.of()
        );

        Problem created = mock(Problem.class);
        Problem saved = mock(Problem.class);

        when(problemRepository.existsByTitle("Two Sum")).thenReturn(false);
        when(codingStrategy.create(request)).thenReturn(created);
        when(problemRepository.save(created)).thenReturn(saved);

        Problem result = problemService.createProblem(request);

        assertThat(result).isSameAs(saved);
        verify(codingStrategy).create(request);
        verify(problemRepository).save(created);
    }

    @Test
    void createProblem_duplicateTitle_throwsException() {
        CreateProblemRequest request = validCodingRequest();

        when(problemRepository.existsByTitle(request.title())).thenReturn(true);

        assertThatThrownBy(() -> problemService.createProblem(request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Problem title already exists");
    }

    @Test
    void createProblem_nullRequest_throwsException() {
        assertThatThrownBy(() -> problemService.createProblem(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Request cannot be null");
    }

    @Test
    void createProblem_nullType_throwsException() {
        CreateProblemRequest request = new CreateProblemRequest(
                null,
                "Two Sum",
                ProblemDifficulty.EASY,
                List.of(),
                List.of()
        );

        assertThatThrownBy(() -> problemService.createProblem(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Problem type cannot be null");
    }

    @Test
    void createProblem_blankTitle_throwsException() {
        CreateProblemRequest request = new CreateProblemRequest(
                ProblemType.CODING,
                "   ",
                ProblemDifficulty.EASY,
                List.of(),
                List.of()
        );

        assertThatThrownBy(() -> problemService.createProblem(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Problem title cannot be blank");
    }

    @Test
    void createProblem_nullDifficulty_throwsException() {
        CreateProblemRequest request = new CreateProblemRequest(
                ProblemType.CODING,
                "Two Sum",
                null,
                List.of(),
                List.of()
        );

        assertThatThrownBy(() -> problemService.createProblem(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Problem difficulty cannot be null");
    }

    @Test
    void createProblem_noStrategyForType_throwsException() {
        ProblemService onlyCodingService = new ProblemService(problemRepository, List.of(codingStrategy));

        CreateProblemRequest selectionRequest = new CreateProblemRequest(
                ProblemType.SELECTION,
                "Stack Basics",
                ProblemDifficulty.EASY,
                List.of(new FileInput("problems/.stack-basics/description.md", "description.md", FileRole.DESCRIPTION)),
                List.of(new OptionInput("LIFO", true))
        );

        when(problemRepository.existsByTitle("Stack Basics")).thenReturn(false);

        assertThatThrownBy(() -> onlyCodingService.createProblem(selectionRequest))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("No strategy available for type: SELECTION");
    }

    @Test
    void constructor_duplicateStrategiesForSameType_throwsException() {
        ProblemCreationStrategy anotherCoding = mock(ProblemCreationStrategy.class);
        when(anotherCoding.supports()).thenReturn(ProblemType.CODING);

        assertThatThrownBy(() -> new ProblemService(
                problemRepository,
                List.of(codingStrategy, anotherCoding)
        ))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Duplicate strategy for type: CODING");
    }

    @Test
    void getRandomProblemByDifficulty_success() {
        Problem p1 = mock(Problem.class);
        Problem p2 = mock(Problem.class);
        when(problemRepository.findByDifficultyWithFiles(ProblemDifficulty.EASY))
                .thenReturn(List.of(p1, p2));

        Problem result = problemService.getRandomProblemByDifficulty(ProblemDifficulty.EASY);

        assertThat(result).isIn(p1, p2);
    }

    @Test
    void getRandomProblemByDifficulty_noProblemsFound_throwsException() {
        when(problemRepository.findByDifficultyWithFiles(ProblemDifficulty.HARD))
                .thenReturn(List.of());

        assertThatThrownBy(() -> problemService.getRandomProblemByDifficulty(ProblemDifficulty.HARD))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("No problems found");
    }


    private CreateProblemRequest validCodingRequest() {
        return new CreateProblemRequest(
                ProblemType.CODING,
                "Dummy",
                ProblemDifficulty.EASY,
                List.of(new FileInput("problems/dummy/description.md", "description.md", FileRole.DESCRIPTION)),
                List.of()
        );
    }
}
