package com.github.prodws.codingplatform.game;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "game_teams")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameTeam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @Column(nullable = false, length = 50)
    private String teamName;

    @Column(nullable = false)
    @Builder.Default
    private Integer score = 0;

    private Integer rank;

    @Column(nullable = false)
    @Builder.Default
    private boolean isWinner = false;

    @OneToMany(mappedBy = "team", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<GamePlayer> players = new ArrayList<>();
}
