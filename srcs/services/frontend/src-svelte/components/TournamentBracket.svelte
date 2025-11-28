<!--
  TournamentBracket.svelte - Tournament Bracket Visualization
  Interactive tournament bracket with support for different tournament types
-->

<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import type { BracketNode, TournamentParticipant, TournamentMatch } from '../shared/services/tournamentService';

  // Props
  export let bracket: BracketNode[];
  export let matches: TournamentMatch[];
  export let tournamentType: 'single_elimination' | 'double_elimination' | 'round_robin';
  export let tournamentId: number | undefined = undefined;
  export let onMatchClick: ((match: TournamentMatch) => void) | undefined = undefined;

  const dispatch = createEventDispatcher();

  // State
  let containerSize = { width: 0, height: 0 };
  let zoom = 1;
  let pan = { x: 0, y: 0 };
  let container: HTMLDivElement;

  // Bracket positioning
  interface BracketPosition {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  const matchWidth = 200;
  const matchHeight = 120; // Increased from 80 to 120 to prevent overlap
  const matchSpacing = 80; // Increased from 50 to 80 to add more space between matches
  const roundSpacing = 300;

  onMount(() => {
    updateContainerSize();
    window.addEventListener('resize', updateContainerSize);
    return () => window.removeEventListener('resize', updateContainerSize);
  });

  function updateContainerSize() {
    if (container) {
      containerSize = {
        width: container.clientWidth,
        height: container.clientHeight
      };
    }
  }

  function getPlayerDisplayName(participant?: TournamentParticipant): string {
    if (!participant) return 'TBD';
    // Try display_name first, then user.username, then guest_alias, finally fallback
    return participant.display_name || 
           participant.user?.username || 
           participant.guest_alias || 
           'Unknown Player';
  }

  function getPlayerAvatar(participant?: TournamentParticipant): string {
    if (!participant || !participant.avatar_url) {
      return '';
    }
    return participant.avatar_url;
  }

  function getBracketTypeStyling(node: BracketNode): string {
    // Ensure text is visible on white background
    const bracketPos = node.position.x;
    switch (bracketPos) {
      case 1: // Main bracket
        return 'border-blue-500 bg-blue-50 text-gray-900';
      case 2: // Losers bracket
        return 'border-red-500 bg-red-50 text-gray-900';
      case 3: // Grand final
        return 'border-yellow-500 bg-yellow-50 text-gray-900';
      default:
        return 'border-gray-300 bg-white text-gray-900';
    }
  }

  function calculateBracketPositions(): BracketPosition[] {
    const positions: BracketPosition[] = [];
    
    if (tournamentType === 'round_robin') {
      return positions; // Round robin doesn't use bracket positions
    }

    // Calculate positions for elimination brackets
    const rounds = Math.ceil(Math.log2(bracket.length));
    
    bracket.forEach((node, index) => {
      const round = Math.floor(index / Math.pow(2, Math.floor(Math.log2(index + 1))));
      const positionInRound = index % Math.pow(2, round);
      
      const x = round * roundSpacing + 50;
      const y = positionInRound * (matchHeight + matchSpacing) + 50;
      
      positions.push({
        x,
        y,
        width: matchWidth,
        height: matchHeight
      });
    });

    return positions;
  }

  function handleMatchClick(node: BracketNode) {
    console.log('🔍 handleMatchClick called:', {
      nodeMatchId: node.match_id,
      matchesCount: matches.length,
      matchIds: matches.map(m => m.id),
      onMatchClick: !!onMatchClick
    });
    
    if (node.match_id && onMatchClick) {
      const match = matches.find(m => m.id === node.match_id);
      if (match) {
        // Don't allow starting completed matches
        if (match.status === 'completed') {
          console.log('⚠️ Match is already completed, cannot start again:', match.id);
          return;
        }
        
        console.log('✅ Bracket match clicked:', {
          node: node,
          match: match,
          matchId: match.id,
          player1_id: match.player1_id,
          player2_id: match.player2_id,
          tournamentId: tournamentId
        });
        onMatchClick(match);
      } else {
        console.error('❌ Match not found in matches array:', {
          nodeMatchId: node.match_id,
          matchesCount: matches.length,
          matchIds: matches.map(m => m.id)
        });
      }
    } else {
      console.warn('⚠️ Match click handler not available:', {
        match_id: node.match_id,
        onMatchClick: !!onMatchClick
      });
    }
  }
  
  function canPlayMatch(node: BracketNode): boolean {
    if (!node.match_id || !node.player1 || !node.player2) {
      return false;
    }
    
    const match = matches.find(m => m.id === node.match_id);
    if (!match) {
      return false;
    }
    
    // Only allow playing if match is pending or active (not completed)
    return match.status === 'pending' || match.status === 'active';
  }

  function handlePlayMatch(match: TournamentMatch) {
    if (onMatchClick) {
      console.log('Play match clicked:', {
        match: match,
        tournamentId: tournamentId
      });
      onMatchClick(match);
    } else {
      console.warn('Match click handler not available for match:', match.id);
    }
  }

  function handleZoomIn() {
    setZoom(Math.min(zoom * 1.2, 3));
  }

  function handleZoomOut() {
    setZoom(Math.max(zoom / 1.2, 0.3));
  }

  function handleReset() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function setZoom(newZoom: number) {
    zoom = newZoom;
  }

  function setPan(newPan: { x: number; y: number }) {
    pan = newPan;
  }

  // Round Robin specific functions
  function getRoundRobinStandings() {
    const participants = bracket.map(node => node.player1).filter(Boolean);
    const standings = participants.map(participant => ({
      participant,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0
    }));

    // Calculate standings from matches
    matches.forEach(match => {
      if (match.winner_id && match.player1_id && match.player2_id) {
        const winnerStanding = standings.find(s => s.participant.id === match.winner_id);
        const loserStanding = standings.find(s => 
          s.participant.id === (match.winner_id === match.player1_id ? match.player2_id : match.player1_id)
        );

        if (winnerStanding) {
          winnerStanding.wins++;
          winnerStanding.pointsFor += match.player1_score || 0;
          winnerStanding.pointsAgainst += match.player2_score || 0;
        }
        if (loserStanding) {
          loserStanding.losses++;
          loserStanding.pointsFor += match.player2_score || 0;
          loserStanding.pointsAgainst += match.player1_score || 0;
        }
      }
    });

    // Sort by wins, then by win percentage
    return standings.sort((a, b) => {
      const aWinPct = a.wins / (a.wins + a.losses) || 0;
      const bWinPct = b.wins / (b.wins + b.losses) || 0;
      if (a.wins !== b.wins) return b.wins - a.wins;
      return bWinPct - aWinPct;
    });
  }

  function getWinPercentage(wins: number, losses: number): number {
    const total = wins + losses;
    return total > 0 ? Math.round((wins / total) * 100) : 0;
  }

  const positions = calculateBracketPositions();
  const standings = getRoundRobinStandings();
</script>

<div class="tournament-bracket-container">
  {#if tournamentType === 'round_robin'}
    <!-- Round Robin Table -->
    <div class="w-full max-w-6xl mx-auto space-y-6">
      <!-- Standings Table -->
      <div class="bg-white rounded-lg shadow-lg overflow-hidden">
        <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
          <h3 class="text-xl font-bold">Round Robin Standings</h3>
          <p class="text-blue-100 text-sm">All participants play against each other</p>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">W</th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">L</th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Win%</th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">PF</th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">PA</th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Diff</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each standings as standing, index}
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {index + 1}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span class="text-blue-600 font-medium text-sm">
                          {standing.participant.display_name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div class="text-sm font-medium text-gray-900">
                        {standing.participant.display_name || 'Unknown Player'}
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {standing.wins}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {standing.losses}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {getWinPercentage(standing.wins, standing.losses)}%
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {standing.pointsFor}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {standing.pointsAgainst}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {standing.pointsFor - standing.pointsAgainst}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Matches Grid -->
      <div class="bg-white rounded-lg shadow-lg overflow-hidden">
        <div class="bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-4">
          <h3 class="text-xl font-bold">Matches</h3>
          <p class="text-green-100 text-sm">All matches in this tournament</p>
        </div>
        
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each matches as match (match.id)}
              <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm font-medium text-gray-600">Match #{match.id}</span>
                  <span class="px-2 py-1 rounded text-xs font-medium {match.status === 'completed' ? 'bg-green-100 text-green-800' : match.status === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}">
                    {match.status === 'completed' ? 'Completed' : match.status === 'active' ? 'Active' : 'Pending'}
                  </span>
                </div>
                
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-900 {match.winner_id === match.player1_id ? 'font-bold text-green-600' : ''}">
                      {match.player1?.display_name || 'TBD'}
                    </span>
                    <span class="text-sm font-medium text-gray-900">{match.player1_score || 0}</span>
                  </div>
                  
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-900 {match.winner_id === match.player2_id ? 'font-bold text-green-600' : ''}">
                      {match.player2?.display_name || 'TBD'}
                    </span>
                    <span class="text-sm font-medium text-gray-900">{match.player2_score || 0}</span>
                  </div>
                </div>

                <!-- Play/Join Button -->
                {#if match.status === 'pending' && match.player1_id && match.player2_id}
                  <div class="mt-3">
                    <button 
                      on:click={() => handlePlayMatch(match)}
                      class="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                    >
                      Play Match
                    </button>
                  </div>
                {:else if match.status === 'active'}
                  <div class="mt-3">
                    <button 
                      on:click={() => handlePlayMatch(match)}
                      class="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                    >
                      Join Match
                    </button>
                  </div>
                {:else if match.status === 'completed'}
                  <div class="mt-3">
                    <div class="w-full px-3 py-2 bg-gray-100 text-gray-600 rounded text-sm text-center">
                      Match Completed
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {:else}
    <!-- Elimination Bracket -->
    <div class="bracket-controls mb-4">
      <div class="flex space-x-2">
        <button 
          on:click={handleZoomIn}
          class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Zoom In
        </button>
        <button 
          on:click={handleZoomOut}
          class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Zoom Out
        </button>
        <button 
          on:click={handleReset}
          class="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Reset
        </button>
      </div>
    </div>

    <div 
      bind:this={container}
      class="bracket-container relative overflow-auto border border-gray-300 rounded-lg"
      style="height: 600px;"
    >
      <div 
        class="bracket-content relative"
        style="transform: scale({zoom}) translate({pan.x}px, {pan.y}px); transform-origin: 0 0; min-width: 1200px; min-height: 400px;"
      >
        {#each bracket as node, index (node.id)}
          {@const position = positions[index]}
          {#if position}
            <!-- Match Box -->
            <div
              class="absolute border-2 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer {getBracketTypeStyling(node)}"
              style="left: {position.x}px; top: {position.y}px; width: {position.width}px; height: {position.height}px; color: #111827;"
              on:click={() => handleMatchClick(node)}
            >
              <div class="p-3 h-full flex flex-col justify-between" style="color: #111827;">
                <!-- Player 1 -->
                <div class="flex items-center gap-2 {node.winner?.id === node.player1?.id ? 'font-bold text-green-600' : 'text-gray-900'}">
                  {#if getPlayerAvatar(node.player1)}
                    <img 
                      src={getPlayerAvatar(node.player1)} 
                      alt={getPlayerDisplayName(node.player1)}
                      class="w-6 h-6 rounded-full object-cover"
                    />
                  {:else}
                    <div class="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                      <span class="text-xs font-medium text-gray-700">
                        {node.player1?.display_name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                  {/if}
                  <div class="flex flex-col">
                    <span class="text-sm truncate text-gray-900">{getPlayerDisplayName(node.player1)}</span>
                    <span class="text-xs text-blue-600 font-medium">Left</span>
                  </div>
                </div>

                <!-- VS separator -->
                <div class="flex justify-center">
                  <div class="w-4 h-px bg-gray-300"></div>
                </div>

                <!-- Player 2 -->
                <div class="flex items-center gap-2 {node.winner?.id === node.player2?.id ? 'font-bold text-green-600' : 'text-gray-900'}">
                  {#if getPlayerAvatar(node.player2)}
                    <img 
                      src={getPlayerAvatar(node.player2)} 
                      alt={getPlayerDisplayName(node.player2)}
                      class="w-6 h-6 rounded-full object-cover"
                    />
                  {:else}
                    <div class="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                      <span class="text-xs font-medium text-gray-700">
                        {node.player2?.display_name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                  {/if}
                  <div class="flex flex-col">
                    <span class="text-sm truncate text-gray-900">{getPlayerDisplayName(node.player2)}</span>
                    <span class="text-xs text-red-600 font-medium">Right</span>
                  </div>
                </div>
              </div>

              <!-- Match status indicator and Play button -->
              {#if node.match_id}
                {@const match = matches.find(m => m.id === node.match_id)}
                {#if match}
                  {#if match.status === 'completed'}
                    <div class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500"></div>
                    <div class="absolute bottom-2 left-1 right-1 mt-2">
                      <div class="w-full px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded text-center">
                        Completed
                      </div>
                      {#if node.winner}
                        <div class="w-full px-2 py-0.5 mt-1 text-xs text-green-600 font-semibold text-center truncate">
                          Winner: {getPlayerDisplayName(node.winner)}
                        </div>
                      {/if}
                    </div>
                  {:else if canPlayMatch(node)}
                    <div class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-500"></div>
                    <div class="absolute bottom-2 left-1 right-1 mt-2">
                      <button 
                        on:click={() => handleMatchClick(node)}
                        class="w-full px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                      >
                        Play
                      </button>
                    </div>
                  {:else}
                    <div class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div class="absolute bottom-2 left-1 right-1 mt-2">
                      <div class="w-full px-2 py-1 bg-gray-100 text-gray-400 text-xs rounded text-center">
                        Waiting
                      </div>
                    </div>
                  {/if}
                {/if}
              {/if}
            </div>
          {/if}
        {/each}

        <!-- Connection Lines -->
        {#each bracket as node, index}
          {@const position = positions[index]}
          {#if position && node.parent}
            {@const parentIndex = bracket.findIndex(n => n.id === node.parent?.id)}
            {@const parentPosition = positions[parentIndex]}
            {#if parentPosition}
              <svg
                class="absolute pointer-events-none"
                style="left: {Math.min(position.x + matchWidth, parentPosition.x)}px; top: {Math.min(position.y + matchHeight / 2, parentPosition.y + matchHeight / 2)}px; width: {Math.abs(parentPosition.x - (position.x + matchWidth))}px; height: {Math.abs(parentPosition.y + matchHeight / 2 - (position.y + matchHeight / 2)) + 2}px;"
              >
                <path
                  d="M {position.x + matchWidth - Math.min(position.x + matchWidth, parentPosition.x)} {position.y + matchHeight / 2 - Math.min(position.y + matchHeight / 2, parentPosition.y + matchHeight / 2)} 
                      L {parentPosition.x - Math.min(position.x + matchWidth, parentPosition.x)} {parentPosition.y + matchHeight / 2 - Math.min(position.y + matchHeight / 2, parentPosition.y + matchHeight / 2)}"
                  stroke="#6B7280"
                  stroke-width="2"
                  fill="none"
                  marker-end="url(#arrowhead)"
                />
                <defs>
                  <marker
                    id="arrowhead"
                    marker-width="10"
                    marker-height="7"
                    ref-x="9"
                    ref-y="3.5"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 3.5, 0 7"
                      fill="#6B7280"
                    />
                  </marker>
                </defs>
              </svg>
            {/if}
          {/if}
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .tournament-bracket-container {
    width: 100%;
    height: 100%;
  }

  .bracket-controls {
    display: flex;
    justify-content: center;
    padding: 1rem;
  }

  .bracket-container {
    background: #f8fafc;
    color: #111827; /* Ensure text is black */
  }

  .bracket-content {
    transition: transform 0.2s ease;
    color: #111827; /* Ensure text is black */
  }
  
  .bracket-content * {
    color: inherit; /* Inherit text color from parent */
  }
</style>
