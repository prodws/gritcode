package com.github.prodws.codingplatform.game;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;

@Component
public class GameEventPublisher {

    @Autowired(required = false)
    private SimpMessagingTemplate messaging;

    public void publishStateChanged(Long gameId) {
        if (messaging == null) return;
        Map<String, Object> payload = Map.of("type", "STATE_CHANGED", "gameId", gameId, "ts", Instant.now().toString());
        messaging.convertAndSend("/topic/game/" + gameId, (Object) payload);
    }

    public void publishChat(Long gameId, String username, int teamIndex, String text) {
        if (messaging == null) return;
        Map<String, Object> payload = Map.of(
                "type", "CHAT",
                "gameId", gameId,
                "username", username,
                "teamIndex", teamIndex,
                "text", text,
                "ts", Instant.now().toString()
        );
        messaging.convertAndSend("/topic/game/" + gameId, (Object) payload);
    }

    public void publishSubmissionActivity(Long gameId, String username, int teamIndex,
                                          String problemTitle, int problemIndex,
                                          boolean passed, Integer pointsAwarded) {
        if (messaging == null) return;
        java.util.HashMap<String, Object> payload = new java.util.HashMap<>();
        payload.put("type", "ACTIVITY");
        payload.put("gameId", gameId);
        payload.put("username", username);
        payload.put("teamIndex", teamIndex);
        payload.put("problemTitle", problemTitle);
        payload.put("problemIndex", problemIndex);
        payload.put("passed", passed);
        payload.put("points", pointsAwarded == null ? 0 : pointsAwarded);
        payload.put("ts", Instant.now().toString());
        messaging.convertAndSend("/topic/game/" + gameId, (Object) payload);
    }
}
