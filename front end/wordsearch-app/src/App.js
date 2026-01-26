import React, { useState, useRef, useEffect, useCallback } from 'react';

const CELL_SIZE = 40;
const CHUNK_SIZE = 12;
const CHUNK_OVERLAP = 1;
const CHUNK_RENDER_SIZE = CHUNK_SIZE - CHUNK_OVERLAP; // 11 cells rendered per chunk

// Flask API call
const fetchChunk = async (seed, chunkX, chunkY) => {
  const response = await fetch(
    `http://localhost:5000/api/data?seed=${seed}&chunkX=${chunkX}&chunkY=${chunkY}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch chunk: ${response.status}`);
  }
  
  const data = await response.json();
  return data; // { letters: [[...]], words: [...] }
};

const getChunkKey = (x, y) => `${x},${y}`;

const worldToChunk = (worldRow, worldCol) => {
  const chunkX = Math.floor(worldCol / CHUNK_RENDER_SIZE);
  const chunkY = Math.floor(worldRow / CHUNK_RENDER_SIZE);
  const localCol = worldCol - (chunkX * CHUNK_RENDER_SIZE);
  const localRow = worldRow - (chunkY * CHUNK_RENDER_SIZE);
  return { chunkX, chunkY, localRow, localCol };
};

const App = () => {
  const [seed, setSeed] = useState('seed');
  const [chunks, setChunks] = useState({});
  const [foundWords, setFoundWords] = useState([]);
  const [showWordList, setShowWordList] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [showMenu, setShowMenu] = useState(false);
  const [seedInput, setSeedInput] = useState('seed');
  
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const panStartRef = useRef(null);
  const loadedChunksRef = useRef(new Set());

  const loadChunk = useCallback(async (chunkX, chunkY) => {
    const key = getChunkKey(chunkX, chunkY);
    if (loadedChunksRef.current.has(key)) return;
    
    loadedChunksRef.current.add(key);
    try {
      const data = await fetchChunk(seed, chunkX, chunkY);
      setChunks(prev => ({
        ...prev,
        [key]: data
      }));
    } catch (error) {
      console.error('Failed to load chunk:', error);
      loadedChunksRef.current.delete(key);
    }
  }, [seed]);

  const getVisibleChunks = useCallback(() => {
    if (!canvasRef.current) return [];
    
    const canvas = canvasRef.current;
    const startCol = Math.floor(-offset.x / (CHUNK_RENDER_SIZE * CELL_SIZE));
    const endCol = Math.ceil((canvas.width - offset.x) / (CHUNK_RENDER_SIZE * CELL_SIZE));
    const startRow = Math.floor(-offset.y / (CHUNK_RENDER_SIZE * CELL_SIZE));
    const endRow = Math.ceil((canvas.height - offset.y) / (CHUNK_RENDER_SIZE * CELL_SIZE));
    
    // Increased buffer from 1 to 3 chunks in each direction for smoother scrolling
    const buffer = 3;
    const visible = [];
    for (let x = startCol - buffer; x <= endCol + buffer; x++) {
      for (let y = startRow - buffer; y <= endRow + buffer; y++) {
        visible.push({ x, y });
      }
    }
    return visible;
  }, [offset]);

  useEffect(() => {
    const visible = getVisibleChunks();
    visible.forEach(({ x, y }) => loadChunk(x, y));
  }, [offset, getVisibleChunks, loadChunk]);

  const screenToWorld = useCallback((screenX, screenY) => {
    const worldX = screenX - offset.x;
    const worldY = screenY - offset.y;
    const col = Math.floor(worldX / CELL_SIZE);
    const row = Math.floor(worldY / CELL_SIZE);
    return { row, col };
  }, [offset]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    const visible = getVisibleChunks();
    
    visible.forEach(({ x: chunkX, y: chunkY }) => {
      const key = getChunkKey(chunkX, chunkY);
      const chunk = chunks[key];
      
      if (!chunk) return;
      
      const baseX = chunkX * CHUNK_RENDER_SIZE * CELL_SIZE + offset.x;
      const baseY = chunkY * CHUNK_RENDER_SIZE * CELL_SIZE + offset.y;
      
      // Draw cells (skip last row/col to avoid overlap)
      for (let row = 0; row < CHUNK_RENDER_SIZE; row++) {
        for (let col = 0; col < CHUNK_RENDER_SIZE; col++) {
          const x = baseX + col * CELL_SIZE;
          const y = baseY + row * CELL_SIZE;
          
          // Draw cell border
          ctx.strokeStyle = '#ddd';
          ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
          
          // Draw letter
          ctx.fillStyle = '#000';
          ctx.font = '20px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(chunk.letters[row][col], x + CELL_SIZE / 2, y + CELL_SIZE / 2);
        }
      }
    });
    
    // Draw found words
    foundWords.forEach(fw => {
      const { start, end } = fw;
      const startX = start.col * CELL_SIZE + CELL_SIZE / 2 + offset.x;
      const startY = start.row * CELL_SIZE + CELL_SIZE / 2 + offset.y;
      const endX = end.col * CELL_SIZE + CELL_SIZE / 2 + offset.x;
      const endY = end.row * CELL_SIZE + CELL_SIZE / 2 + offset.y;
      
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    });
    
    // Draw selection line
    if (isDragging && dragStart && dragEnd) {
      const startX = dragStart.col * CELL_SIZE + CELL_SIZE / 2 + offset.x;
      const startY = dragStart.row * CELL_SIZE + CELL_SIZE / 2 + offset.y;
      const endX = dragEnd.col * CELL_SIZE + CELL_SIZE / 2 + offset.x;
      const endY = dragEnd.row * CELL_SIZE + CELL_SIZE / 2 + offset.y;
      
      ctx.strokeStyle = 'blue';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  }, [chunks, offset, getVisibleChunks, foundWords, isDragging, dragStart, dragEnd]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      draw();
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [draw]);

  const getLetterAt = useCallback((row, col) => {
    const { chunkX, chunkY, localRow, localCol } = worldToChunk(row, col);
    const key = getChunkKey(chunkX, chunkY);
    const chunk = chunks[key];
    
    if (!chunk || localRow < 0 || localRow >= CHUNK_SIZE || localCol < 0 || localCol >= CHUNK_SIZE) {
      return null;
    }
    
    return chunk.letters[localRow][localCol];
  }, [chunks]);

  const collectLettersAlongPath = useCallback((start, end) => {
    const letters = [];
    const positions = [];
    
    // Calculate direction
    const rowDiff = end.row - start.row;
    const colDiff = end.col - start.col;
    
    // Get length of path
    const length = Math.max(Math.abs(rowDiff), Math.abs(colDiff)) + 1;
    
    // Determine step direction (0, 1, or -1 for each axis)
    const rowStep = rowDiff === 0 ? 0 : rowDiff / Math.abs(rowDiff);
    const colStep = colDiff === 0 ? 0 : colDiff / Math.abs(colDiff);
    
    // Collect letters along the path
    for (let i = 0; i < length; i++) {
      const row = start.row + (i * rowStep);
      const col = start.col + (i * colStep);
      const letter = getLetterAt(row, col);
      
      if (letter === null) return null; // Path goes through unloaded chunk
      
      letters.push(letter);
      positions.push({ row, col });
    }
    
    return { word: letters.join(''), positions };
  }, [getLetterAt]);

  const checkWordInDictionary = async (word) => {
    try {
      // Using Free Dictionary API
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
      return response.ok;
    } catch (error) {
      console.error('Dictionary API error:', error);
      return false;
    }
  };

  const checkWord = useCallback(async (start, end) => {
    const result = collectLettersAlongPath(start, end);
    
    if (!result) return null;
    
    const { word, positions } = result;
    
    // Require at least 3 letters
    if (word.length < 3) return null;
    
    // Check if word is in dictionary
    const isValid = await checkWordInDictionary(word);
    
    if (isValid) {
      return {
        word: word.toUpperCase(),
        start: positions[0],
        end: positions[positions.length - 1]
      };
    }
    
    return null;
  }, [collectLettersAlongPath]);

  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left click
      const rect = canvasRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const pos = screenToWorld(screenX, screenY);
      
      setIsDragging(true);
      setDragStart(pos);
      setDragEnd(pos);
    } else if (e.button === 2) { // Right click
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const rect = canvasRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const pos = screenToWorld(screenX, screenY);
      setDragEnd(pos);
    } else if (isPanning && panStartRef.current) {
      setOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
    }
  };

  const handleMouseUp = (e) => {
    if (isDragging && dragStart && dragEnd) {
      setIsDragging(false);
      setIsValidating(true);
      
      // Async word checking
      checkWord(dragStart, dragEnd).then(found => {
        if (found) {
          // Check if this exact word at this position was already found
          const alreadyFound = foundWords.some(fw => 
            fw.word === found.word && 
            fw.start.row === found.start.row && 
            fw.start.col === found.start.col &&
            fw.end.row === found.end.row && 
            fw.end.col === found.end.col
          );
          
          if (!alreadyFound) {
            setFoundWords(prev => [...prev, found]);
          }
        }
        setIsValidating(false);
      });
      
      setDragStart(null);
      setDragEnd(null);
    } else if (isPanning) {
      setIsPanning(false);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
  };

  const handleNewSeed = () => {
    setSeed(seedInput);
    setChunks({});
    setFoundWords([]);
    loadedChunksRef.current.clear();
    setShowMenu(false);
  };

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        style={{ 
          display: 'block', 
          cursor: isPanning ? 'grabbing' : isValidating ? 'wait' : 'crosshair' 
        }}
      />
      
      {/* Found words counter */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'white',
          padding: '10px 20px',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          userSelect: 'none'
        }}
        onClick={() => setShowWordList(!showWordList)}
      >
        <div style={{ fontWeight: 'bold', fontSize: 18 }}>
          Words Found: {foundWords.length}
          {isValidating && <span style={{ marginLeft: 10, fontSize: 14 }}>⏳</span>}
        </div>
        {showWordList && (
          <div style={{ marginTop: 10, borderTop: '1px solid #ddd', paddingTop: 10 }}>
            {foundWords.map((fw, i) => (
              <div key={i} style={{ padding: '4px 0' }}>{fw.word}</div>
            ))}
          </div>
        )}
      </div>
      
      {/* Menu button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          padding: '10px 20px',
          borderRadius: 8,
          border: 'none',
          background: 'white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        ☰ Menu
      </button>
      
      {/* Menu */}
      {showMenu && (
        <div
          style={{
            position: 'absolute',
            top: 70,
            left: 20,
            background: 'white',
            padding: 20,
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            minWidth: 250
          }}
        >
          <div style={{ marginBottom: 10, fontWeight: 'bold' }}>Change Seed</div>
          <input
            type="text"
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
            style={{
              width: '100%',
              padding: 8,
              marginBottom: 10,
              borderRadius: 4,
              border: '1px solid #ddd'
            }}
          />
          <button
            onClick={handleNewSeed}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 4,
              border: 'none',
              background: '#007bff',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Generate New Puzzle
          </button>
        </div>
      )}
      
      {/* Instructions */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          background: 'white',
          padding: 15,
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          fontSize: 14
        }}
      >
        <div><strong>Left Click + Drag:</strong> Select word</div>
        <div><strong>Right Click + Drag:</strong> Pan view</div>
      </div>
    </div>
  );
};

export default App;