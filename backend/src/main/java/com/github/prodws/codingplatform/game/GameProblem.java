package com.github.prodws.codingplatform.game;

import com.github.prodws.codingplatform.problem.Problem;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "game_problems",
       uniqueConstraints = @UniqueConstraint(columnNames = {"game_id", "problem_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameProblem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id", nullable = false)
    private Problem problem;

    @Column(nullable = false)
    private Integer sortOrder;
}
