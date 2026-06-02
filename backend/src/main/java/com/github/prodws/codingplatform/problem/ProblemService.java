package com.github.prodws.codingplatform.problem;

import com.github.prodws.codingplatform.problem.registration.ProblemCreationStrategy;
import com.github.prodws.codingplatform.problem.registration.CreateProblemRequest;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

@Service
public class ProblemService {
    private final ProblemRepository problemRepository;

    public List<Problem> getProblems() {
        return problemRepository.findAllWithFiles();
    }

    public Problem getProblemById(Long id) {
        return problemRepository.findByIdWithFiles(id)
                .orElseThrow(() -> new IllegalStateException("Problem not found"));
    }

    public Problem getProblemByTitle(String title) {
        return problemRepository.findByTitleWithFiles(title)
                .orElseThrow(() -> new IllegalStateException("Problem not found"));
    }

    private final Map<ProblemType, ProblemCreationStrategy> strategyByType;

    public ProblemService(ProblemRepository problemRepository, List<ProblemCreationStrategy> strategies) {
        this.problemRepository = problemRepository;

        Map<ProblemType, ProblemCreationStrategy> map = new EnumMap<>(ProblemType.class);
        for (ProblemCreationStrategy s : strategies) {
            ProblemCreationStrategy previous = map.put(s.supports(), s);
            if (previous != null) {
                throw new IllegalStateException("Duplicate strategy for type: " + s.supports());
            }
        }
        this.strategyByType = Map.copyOf(map);
    }


    @Transactional
    public Problem createProblem(CreateProblemRequest request) {
        validateRequest(request);
        checkIfProblemExists(request.title());

        ProblemCreationStrategy strategy = strategyByType.get(request.type());
        if (strategy == null) {
            throw new IllegalStateException("No strategy available for type: " + request.type());
        }

        Problem problem = strategy.create(request);

        return problemRepository.save(problem);
    }

    public Problem getRandomProblemByDifficulty(ProblemDifficulty difficulty) {
        List<Problem> problems = problemRepository.findByDifficultyWithFiles(difficulty);
        if (problems.isEmpty()) throw new IllegalStateException("No problems found");
        return problems.get(new Random().nextInt(problems.size()));
    }

    private void validateRequest(CreateProblemRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request cannot be null");
        }
        if (request.type() == null) {
            throw new IllegalArgumentException("Problem type cannot be null");
        }
        if (request.title() == null || request.title().isBlank()) {
            throw new IllegalArgumentException("Problem title cannot be blank");
        }
        if (request.difficulty() == null) {
            throw new IllegalArgumentException("Problem difficulty cannot be null");
        }
    }

    private void checkIfProblemExists(String title) {
        if (problemRepository.existsByTitle(title))
            throw new IllegalStateException("Problem title already exists");
    }

}
