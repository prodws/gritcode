package com.github.prodws.codingplatform.problem;

import com.github.prodws.codingplatform.problem.registration.CreateProblemRequest;
import com.github.prodws.codingplatform.problem.registration.FileInput;
import com.github.prodws.codingplatform.problem.registration.OptionInput;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Controller
@RequiredArgsConstructor
public class ProblemResolver {

    private final ProblemService problemService;

    @QueryMapping
    public Problem problemByTitle(@Argument String title) {
        return problemService.getProblemByTitle(title);
    }

    @QueryMapping
    public Problem randomProblem(@Argument ProblemDifficulty difficulty) {
        return problemService.getRandomProblemByDifficulty(difficulty);
    }


    // TODO: restrict createProblem to ADMIN role only
    @MutationMapping
    public Problem createProblem(
            @Argument ProblemType type,
            @Argument String title,
            @Argument ProblemDifficulty difficulty,
            @Argument List<FileInput> files,
            @Argument List<OptionInput> options
    ) {
        CreateProblemRequest request = new CreateProblemRequest(type, title, difficulty, files, options);
        return problemService.createProblem(request);
    }

    @QueryMapping
    public List<Problem> problems() {
        return problemService.getProblems();
    }

    @QueryMapping
    public String fileContent(@Argument String path) {
        try {
            Resource resource = new ClassPathResource(path);
            return new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            return "";
        }
    }

}
