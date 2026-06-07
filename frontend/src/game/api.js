export const GRAPHQL_URL = 'http://localhost:8080/graphql';

const GAME_FRAGMENT = `
    id
    status
    inviteCode
    isPractice
    maxTeams
    maxPlayersPerTeam
    timeLimitSeconds
    startedAt
    endedAt
    createdAt
    host { id username }
    teams {
        id
        teamName
        score
        rank
        isWinner
        players {
            id
            joinedAt
            status
            player { id username avatarBase64 }
        }
    }
    problems {
        id
        sortOrder
        problem { id title difficulty }
    }
`;

export const gql = async (token, query, variables) => {
    const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ query, variables }),
    });
    const data = await res.json();
    if (data.errors) throw new Error(data.errors[0].message);
    if (!data.data) throw new Error('No data returned (backend may be out of date — restart it)');
    return data.data;
};

export const createGame = (token, input) =>
    gql(token, `mutation($i: CreateGameInput!) { createGame(input: $i) { ${GAME_FRAGMENT} } }`, { i: input })
        .then(d => d.createGame);

export const joinGameByCode = (token, code) =>
    gql(token, `mutation($c: String!) { joinGameByCode(code: $c) { ${GAME_FRAGMENT} } }`, { c: code })
        .then(d => d.joinGameByCode);

export const updateGameSettings = (token, gameId, settings) =>
    gql(
        token,
        `mutation($g: ID!, $mt: Int, $mp: Int, $pc: Int, $tl: Int) {
            updateGameSettings(gameId: $g, maxTeams: $mt, maxPlayersPerTeam: $mp, problemCount: $pc, timeLimitSeconds: $tl) {
                ${GAME_FRAGMENT}
            }
        }`,
        { g: gameId, mt: settings.maxTeams, mp: settings.maxPlayersPerTeam, pc: settings.problemCount, tl: settings.timeLimitSeconds }
    ).then(d => d.updateGameSettings);

export const switchTeam = (token, gameId, teamId) =>
    gql(token, `mutation($g: ID!, $t: ID!) { switchGameTeam(gameId: $g, teamId: $t) { ${GAME_FRAGMENT} } }`, { g: gameId, t: teamId })
        .then(d => d.switchGameTeam);

export const leaveGame = (token, gameId) =>
    gql(token, `mutation($g: ID!) { leaveGame(gameId: $g) { ${GAME_FRAGMENT} } }`, { g: gameId })
        .then(d => d.leaveGame);

export const startGame = (token, gameId) =>
    gql(token, `mutation($g: ID!) { startGame(gameId: $g) { ${GAME_FRAGMENT} } }`, { g: gameId })
        .then(d => d.startGame);

export const finishGame = (token, gameId) =>
    gql(token, `mutation($g: ID!) { finishGame(gameId: $g) { ${GAME_FRAGMENT} } }`, { g: gameId })
        .then(d => d.finishGame);

export const sendChatMessage = (token, gameId, text) =>
    gql(token, `mutation($g: ID!, $t: String!) { sendChatMessage(gameId: $g, text: $t) }`, { g: gameId, t: text })
        .then(d => d.sendChatMessage);

export const submitGameSolution = (token, gameId, problemId, code) =>
    gql(token, `mutation($g: ID!, $p: ID!, $c: String!) { submitGameSolution(gameId: $g, problemId: $p, code: $c) { id status passed stdout stderr } }`,
        { g: gameId, p: problemId, c: code })
        .then(d => d.submitGameSolution);

export const fetchGame = (token, id) =>
    gql(token, `query($id: ID!) { gameById(id: $id) { ${GAME_FRAGMENT} } }`, { id })
        .then(d => d.gameById);

export const myActiveGames = (token) =>
    gql(token, `{ myActiveGames { ${GAME_FRAGMENT} } }`)
        .then(d => d.myActiveGames);

export const myFinishedGames = (token) =>
    gql(token, `{ myFinishedGames { ${GAME_FRAGMENT} } }`)
        .then(d => d.myFinishedGames);

export const fetchGameSubmissions = (token, gameId) =>
    gql(token, `query($id: ID!) { submissionsByGame(gameId: $id) {
        id code status passed createdAt
        user { id username }
        problem { id title }
        team { id teamName }
    } }`, { id: gameId })
        .then(d => d.submissionsByGame);
