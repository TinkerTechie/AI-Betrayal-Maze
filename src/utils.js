export const manhattanDistance = (p1, p2) => Math.abs(p1.r - p2.r) + Math.abs(p1.c - p2.c);

export const getNeighbors = (r, c, grid, width, height) => {
    const neighbors = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < height && nc >= 0 && nc < width && grid[nr][nc] !== 'WALL') {
            neighbors.push({ r: nr, c: nc });
        }
    }
    return neighbors;
};

export const aStar = (start, goal, grid, width, height) => {
    const openSet = [start];
    const cameFrom = new Map();
    const gScore = new Map();
    gScore.set(`${start.r},${start.c}`, 0);

    const fScore = new Map();
    fScore.set(`${start.r},${start.c}`, manhattanDistance(start, goal));

    while (openSet.length > 0) {
        let minIdx = 0;
        for (let i = 1; i < openSet.length; i++) {
            const node = openSet[i];
            const currentMin = openSet[minIdx];
            if (fScore.get(`${node.r},${node.c}`) < fScore.get(`${currentMin.r},${currentMin.c}`)) {
                minIdx = i;
            }
        }

        const current = openSet[minIdx];

        if (current.r === goal.r && current.c === goal.c) {
            const path = [];
            let curr = current;
            while (cameFrom.has(`${curr.r},${curr.c}`)) {
                path.push(curr);
                curr = cameFrom.get(`${curr.r},${curr.c}`);
            }
            path.reverse();
            return path;
        }

        openSet.splice(minIdx, 1);

        const neighbors = getNeighbors(current.r, current.c, grid, width, height);
        for (const neighbor of neighbors) {
            const tentativeGScore = gScore.get(`${current.r},${current.c}`) + 1;
            const neighborKey = `${neighbor.r},${neighbor.c}`;

            if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
                cameFrom.set(neighborKey, current);
                gScore.set(neighborKey, tentativeGScore);
                fScore.set(neighborKey, tentativeGScore + manhattanDistance(neighbor, goal));

                if (!openSet.some(n => n.r === neighbor.r && n.c === neighbor.c)) {
                    openSet.push(neighbor);
                }
            }
        }
    }
    return [];
};

export const isSolvable = (start, goal, grid, width, height) => {
    return aStar(start, goal, grid, width, height).length > 0;
};

export const getBestBlock = (playerPos, goalPos, currentPath, grid, width, height) => {
    let bestCell = null;
    let maxPathLength = -1;

    // The AI evaluates blocking each cell on the player's SHORTEST path
    // aiming to MAXIMIZE the player's new shortest path.
    for (let i = 0; i < currentPath.length; i++) {
        const cell = currentPath[i];
        if ((cell.r === playerPos.r && cell.c === playerPos.c) ||
            (cell.r === goalPos.r && cell.c === goalPos.c)) {
            continue;
        }

        grid[cell.r][cell.c] = 'WALL'; // simulate block
        const newPath = aStar(playerPos, goalPos, grid, width, height);
        grid[cell.r][cell.c] = 'EMPTY'; // revert

        if (newPath.length > 0) { // must remain solvable
            if (newPath.length > maxPathLength) {
                maxPathLength = newPath.length;
                bestCell = cell;
            } else if (newPath.length === maxPathLength) {
                // Tied? Prefer blocking closer to player to force immediate reroute
                if (Math.random() > 0.5) bestCell = cell;
            }
        }
    }

    // If blocking anything on the shortest path makes it unsolvable,
    // we try blocking a random cell elsewhere to slowly restrict the board.
    if (!bestCell) {
        const emptyCells = [];
        for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
                if (grid[r][c] === 'EMPTY' && !(r === playerPos.r && c === playerPos.c) && !(r === goalPos.r && c === goalPos.c)) {
                    emptyCells.push({ r, c });
                }
            }
        }

        // Shuffle
        for (let i = emptyCells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [emptyCells[i], emptyCells[j]] = [emptyCells[j], emptyCells[i]];
        }

        for (let cell of emptyCells) {
            grid[cell.r][cell.c] = 'WALL';
            const newPath = aStar(playerPos, goalPos, grid, width, height);
            grid[cell.r][cell.c] = 'EMPTY';
            if (newPath.length > 0) {
                return cell;
            }
        }
    }

    return bestCell;
};
