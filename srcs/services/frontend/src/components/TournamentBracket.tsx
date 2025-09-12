/**
 * Tournament Bracket Component
 * 
 * Interactive tournament bracket visualization with support for different tournament types
 */

import React, { useState, useEffect, useMemo } from 'react';
import { BracketNode, TournamentParticipant, TournamentMatch } from '../services/tournamentService';

interface Props {
  bracket: BracketNode[];
  matches: TournamentMatch[];
  tournamentType: 'single_elimination' | 'double_elimination' | 'round_robin';
  onMatchClick?: (match: TournamentMatch) => void;
}

interface BracketPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MatchBoxProps {
  node: BracketNode;
  position: BracketPosition;
  onClick?: () => void;
}

const MatchBox: React.FC<MatchBoxProps> = ({ node, position, onClick }) => {
  const player1 = node.player1;
  const player2 = node.player2;
  const winner = node.winner;

  const getPlayerDisplayName = (participant?: TournamentParticipant) => {
    if (!participant) return 'TBD';
    return participant.display_name;
  };

  const getPlayerAvatar = (participant?: TournamentParticipant) => {
    if (!participant || !participant.avatar_url) {
      return (
        <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-xs font-medium text-gray-600">
            {participant ? participant.display_name.charAt(0).toUpperCase() : '?'}
          </span>
        </div>
      );
    }
    return (
      <img 
        src={participant.avatar_url} 
        alt={participant.display_name}
        className="w-6 h-6 rounded-full object-cover"
      />
    );
  };

  return (
    <div
      className="absolute bg-white border-2 border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      style={{
        left: position.x,
        top: position.y,
        width: position.width,
        height: position.height,
      }}
      onClick={onClick}
    >
      <div className="p-3 h-full flex flex-col justify-between">
        {/* Player 1 */}
        <div className={`flex items-center gap-2 ${winner?.id === player1?.id ? 'font-bold text-green-600' : ''}`}>
          {getPlayerAvatar(player1)}
          <span className="text-sm truncate">{getPlayerDisplayName(player1)}</span>
        </div>

        {/* VS separator */}
        <div className="flex justify-center">
          <div className="w-4 h-px bg-gray-300"></div>
        </div>

        {/* Player 2 */}
        <div className={`flex items-center gap-2 ${winner?.id === player2?.id ? 'font-bold text-green-600' : ''}`}>
          {getPlayerAvatar(player2)}
          <span className="text-sm truncate">{getPlayerDisplayName(player2)}</span>
        </div>
      </div>

      {/* Match status indicator */}
      {node.match_id && (
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-500"></div>
      )}
    </div>
  );
};

interface ConnectionLineProps {
  from: BracketPosition;
  to: BracketPosition;
  matchWidth: number;
  matchHeight: number;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ from, to, matchWidth, matchHeight }) => {
  const startX = from.x + matchWidth;
  const startY = from.y + matchHeight / 2;
  const endX = to.x;
  const endY = to.y + matchHeight / 2;

  return (
    <svg
      className="absolute pointer-events-none"
      style={{
        left: Math.min(startX, endX),
        top: Math.min(startY, endY),
        width: Math.abs(endX - startX),
        height: Math.abs(endY - startY) + 2,
      }}
    >
      <path
        d={`M ${startX - Math.min(startX, endX)} ${startY - Math.min(startY, endY)} 
            L ${endX - Math.min(startX, endX)} ${endY - Math.min(startY, endY)}`}
        stroke="#6B7280"
        strokeWidth="2"
        fill="none"
        markerEnd="url(#arrowhead)"
      />
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="#6B7280"
          />
        </marker>
      </defs>
    </svg>
  );
};

export const TournamentBracket: React.FC<Props> = ({ 
  bracket, 
  matches, 
  tournamentType,
  onMatchClick 
}) => {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Calculate bracket layout
  const bracketLayout = useMemo(() => {
    if (bracket.length === 0) return { positions: new Map<number, BracketPosition>(), connections: [], totalWidth: 0, totalHeight: 0 };

    const matchWidth = 200;
    const matchHeight = 80;
    const roundSpacing = 250;
    const matchSpacing = 100;

    // Group nodes by round
    const nodesByRound = new Map<number, BracketNode[]>();
    bracket.forEach(node => {
      if (!nodesByRound.has(node.round)) {
        nodesByRound.set(node.round, []);
      }
      nodesByRound.get(node.round)!.push(node);
    });

    const positions = new Map<number, BracketPosition>();
    const connections: Array<{ from: number; to: number }> = [];

    // Calculate positions for each round
    const rounds = Array.from(nodesByRound.keys()).sort((a, b) => a - b);
    let totalWidth = 0;
    let totalHeight = 0;

    rounds.forEach((round, roundIndex) => {
      const roundNodes = nodesByRound.get(round)!;
      const roundX = roundIndex * roundSpacing;
      
      // Calculate total height for this round
      const roundHeight = Math.max(roundNodes.length * matchSpacing, 200);
      totalHeight = Math.max(totalHeight, roundHeight);

      roundNodes.forEach((node, matchIndex) => {
        const y = (roundHeight - roundNodes.length * matchSpacing) / 2 + matchIndex * matchSpacing;
        
        positions.set(node.id, {
          x: roundX,
          y: y,
          width: matchWidth,
          height: matchHeight
        });

        // Calculate connections to next round
        if (roundIndex < rounds.length - 1) {
          const nextRound = rounds[roundIndex + 1];
          const nextRoundNodes = nodesByRound.get(nextRound)!;
          
          // Find the match in the next round that this winner would go to
          const nextMatchIndex = Math.floor(matchIndex / 2);
          if (nextMatchIndex < nextRoundNodes.length) {
            const nextNode = nextRoundNodes[nextMatchIndex];
            connections.push({ from: node.id, to: nextNode.id });
          }
        }
      });

      totalWidth = Math.max(totalWidth, roundX + matchWidth);
    });

    return { positions, connections, totalWidth, totalHeight };
  }, [bracket]);

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      const container = document.getElementById('bracket-container');
      if (container) {
        setContainerSize({
          width: container.clientWidth,
          height: container.clientHeight
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-fit zoom
  useEffect(() => {
    if (containerSize.width > 0 && containerSize.height > 0 && bracketLayout.totalWidth > 0) {
      const scaleX = (containerSize.width - 100) / bracketLayout.totalWidth;
      const scaleY = (containerSize.height - 100) / bracketLayout.totalHeight;
      const autoZoom = Math.min(scaleX, scaleY, 1);
      setZoom(autoZoom);
    }
  }, [containerSize, bracketLayout]);

  // Handle zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.1));
  const handleResetZoom = () => {
    if (containerSize.width > 0 && bracketLayout.totalWidth > 0) {
      const scaleX = (containerSize.width - 100) / bracketLayout.totalWidth;
      const scaleY = (containerSize.height - 100) / bracketLayout.totalHeight;
      const autoZoom = Math.min(scaleX, scaleY, 1);
      setZoom(autoZoom);
    }
    setPan({ x: 0, y: 0 });
  };

  // Handle panning
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (bracket.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center text-gray-500">
          <p className="text-lg">No bracket data available</p>
          <p className="text-sm mt-2">Tournament bracket will appear here once matches are generated</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
          >
            -
          </button>
          <span className="text-sm text-gray-600 min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
          >
            +
          </button>
          <button
            onClick={handleResetZoom}
            className="px-3 py-1 bg-blue-200 hover:bg-blue-300 rounded text-sm ml-2"
          >
            Reset
          </button>
        </div>
        
        <div className="text-sm text-gray-600">
          {tournamentType === 'single_elimination' && 'Single Elimination'}
          {tournamentType === 'double_elimination' && 'Double Elimination'}
          {tournamentType === 'round_robin' && 'Round Robin'}
        </div>
      </div>

      {/* Bracket container */}
      <div
        id="bracket-container"
        className="relative w-full h-96 bg-gray-50 rounded-lg border overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div
          className="absolute"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: bracketLayout.totalWidth,
            height: bracketLayout.totalHeight,
          }}
        >
          {/* Connection lines */}
          {bracketLayout.connections.map((connection, index) => {
            const fromPos = bracketLayout.positions.get(connection.from);
            const toPos = bracketLayout.positions.get(connection.to);
            
            if (!fromPos || !toPos) return null;
            
            return (
              <ConnectionLine
                key={index}
                from={fromPos}
                to={toPos}
                matchWidth={200}
                matchHeight={80}
              />
            );
          })}

          {/* Match boxes */}
          {bracket.map((node) => {
            const position = bracketLayout.positions.get(node.id);
            if (!position) return null;

            return (
              <MatchBox
                key={node.id}
                node={node}
                position={position}
                onClick={() => {
                  if (node.match_id && onMatchClick) {
                    const match = matches.find(m => m.id === node.match_id);
                    if (match) onMatchClick(match);
                  }
                }}
              />
            );
          })}
        </div>

        {/* Empty state overlay */}
        {bracketLayout.totalWidth === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-lg">Generating bracket...</p>
              <p className="text-sm mt-2">Please wait while the tournament bracket is being created</p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Active Match</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Winner</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
          <span>Pending</span>
        </div>
      </div>
    </div>
  );
};
