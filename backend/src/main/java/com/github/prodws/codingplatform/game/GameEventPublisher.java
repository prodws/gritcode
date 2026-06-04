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
}
