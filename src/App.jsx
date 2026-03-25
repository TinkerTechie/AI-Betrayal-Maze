import { useState, useEffect, useCallback } from 'react';
import './index.css';
import { aStar, isSolvable, getBestBlock } from './utils';

const GRID_WIDTH = 12; // Adjusted to make slightly harder
const GRID_HEIGHT = 12;
const START_POS = { r: 0, c: 0 };
const GOAL_POS = { r: GRID_HEIGHT - 1, c: GRID_WIDTH - 1 };

function App() {
  const [grid, setGrid] = useState(() => {
    return Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill('EMPTY'));
  });
  const [playerPos, setPlayerPos] = useState(START_POS);
  const [status, setStatus] = useState('PLAYING');
  const [aiPath, setAiPath] = useState([]);

  const calculatePath = (start, g) => aStar(start, GOAL_POS, g, GRID_WIDTH, GRID_HEIGHT);

  const movePlayer = useCallback((direction) => {
    if (status !== 'PLAYING') return;

    let { r, c } = playerPos;
    if (direction === 'UP') r -= 1;
    else if (direction === 'DOWN') r += 1;
    else if (direction === 'LEFT') c -= 1;
    else if (direction === 'RIGHT') c += 1;
    else return;

    if (r >= 0 && r < GRID_HEIGHT && c >= 0 && c < GRID_WIDTH && grid[r][c] !== 'WALL') {
      const newPlayerPos = { r, c };
      setPlayerPos(newPlayerPos);

      if (newPlayerPos.r === GOAL_POS.r && newPlayerPos.c === GOAL_POS.c) {
        setStatus('WON');
        setAiPath([]);
        return;
      }

      // 🧠 S M A R T E R   A I   T U R N 🧠
      // First, get current shortest path
      let currentPath = calculatePath(newPlayerPos, grid);

      if (currentPath.length > 0) {
        let newGrid = grid.map(row => [...row]);

        // Find the absolute BEST block to maximize player path / trap them!
        const blockNode = getBestBlock(newPlayerPos, GOAL_POS, currentPath, newGrid, GRID_WIDTH, GRID_HEIGHT);

        if (blockNode) {
          // AI makes the block! This cell becomes a wall.
          newGrid[blockNode.r][blockNode.c] = 'WALL';
          setGrid(newGrid);
        }

        // Recalculate path after block to show UI
        const finalPath = calculatePath(newPlayerPos, newGrid);
        setAiPath(finalPath);

        // If they trapped us entirely
        if (!isSolvable(newPlayerPos, GOAL_POS, newGrid, GRID_WIDTH, GRID_HEIGHT)) {
          setStatus('LOST');
        }
      } else {
        setStatus('LOST');
      }
    }
  }, [grid, playerPos, status]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'w' || e.key === 'ArrowUp') movePlayer('UP');
    else if (e.key === 's' || e.key === 'ArrowDown') movePlayer('DOWN');
    else if (e.key === 'a' || e.key === 'ArrowLeft') movePlayer('LEFT');
    else if (e.key === 'd' || e.key === 'ArrowRight') movePlayer('RIGHT');
  }, [movePlayer]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const resetGame = () => {
    setGrid(Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill('EMPTY')));
    setPlayerPos(START_POS);
    setStatus('PLAYING');
    setAiPath([]);
  };

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchMove = (e) => setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const minSwipeDistance = 30;

    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (distanceX > minSwipeDistance) movePlayer('LEFT');
      if (distanceX < -minSwipeDistance) movePlayer('RIGHT');
    } else {
      if (distanceY > minSwipeDistance) movePlayer('UP');
      if (distanceY < -minSwipeDistance) movePlayer('DOWN');
    }
  };

  return (
    <div className="game-container">
      <header>
        <h1>AI Betrayal Maze</h1>
        <p className="subtitle">Dynamic A* Trapping AI! Outsmart the algorithm.</p>
        <div className={`status ${status.toLowerCase()}`}>
          {status === 'PLAYING' && "Reach the 🏆 before the AI traps you!"}
          {status === 'WON' && "🎉 Incredible! You Escaped the Maze!"}
          {status === 'LOST' && "💀 The AI Trapped You!"}
        </div>
      </header>

      <div
        className="grid-container"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndHandler}
      >
        {/* Floating Player Object for butter-smooth movement! */}
        <div
          className="floating-player"
          style={{
            top: `calc(var(--grid-padding) + ${playerPos.r} * (var(--cell-size) + var(--grid-gap)))`,
            left: `calc(var(--grid-padding) + ${playerPos.c} * (var(--cell-size) + var(--grid-gap)))`
          }}
        >
          {status === 'LOST' ? '💀' : '😎'}
        </div>

        {/* Floating Path Visualizers */}
        {aiPath.map(p => {
          if ((p.r === playerPos.r && p.c === playerPos.c) || (p.r === GOAL_POS.r && p.c === GOAL_POS.c)) return null;
          return (
            <div key={`path-${p.r}-${p.c}`} className="floating-path"
              style={{
                top: `calc(var(--grid-padding) + ${p.r} * (var(--cell-size) + var(--grid-gap)))`,
                left: `calc(var(--grid-padding) + ${p.c} * (var(--cell-size) + var(--grid-gap)))`
              }}
            />
          );
        })}

        {/* Background Grid Elements */}
        {grid.map((row, r) => (
          row.map((cellType, c) => {
            let className = 'cell';
            if (cellType === 'WALL') className += ' wall build-anim';
            if (r === START_POS.r && c === START_POS.c) className += ' start';
            if (r === GOAL_POS.r && c === GOAL_POS.c) className += ' goal';

            return (
              <div
                key={`${r}-${c}`}
                className={className}
                onClick={() => {
                  if (status === 'PLAYING') {
                    if (r === playerPos.r - 1 && c === playerPos.c) movePlayer('UP');
                    else if (r === playerPos.r + 1 && c === playerPos.c) movePlayer('DOWN');
                    else if (r === playerPos.r && c === playerPos.c - 1) movePlayer('LEFT');
                    else if (r === playerPos.r && c === playerPos.c + 1) movePlayer('RIGHT');
                  }
                }}
              >
                {r === GOAL_POS.r && c === GOAL_POS.c ? '🏆' : ''}
              </div>
            );
          })
        ))}
      </div>

      <div className="controls-panel">
        <p>Use W, A, S, D, Arrow Keys, swipe, or use touch controls below</p>
      </div>

      <div className="mobile-controls">
        <button className="btn-up" onClick={() => movePlayer('UP')}>⬆️</button>
        <button className="btn-left" onClick={() => movePlayer('LEFT')}>⬅️</button>
        <button className="btn-down" onClick={() => movePlayer('DOWN')}>⬇️</button>
        <button className="btn-right" onClick={() => movePlayer('RIGHT')}>➡️</button>
      </div>

      <button onClick={resetGame} className="reset-btn">Restart Journey</button>
    </div>
  );
}

export default App;
