import React, { useEffect, useState } from 'react';
import { AuthService } from '../services/authService';
import { User } from '../types/auth';

interface UserWithStats extends User {
  stats?: {
    total_games: number;
    games_won: number;
    games_lost: number;
    total_score: number;
    highest_score: number;
    average_score: number;
  };
}

/**
 * Ranking Page Component
 *
 * Displays the user ranking/leaderboard.
 */
const Ranking: React.FC = () => {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    AuthService.getAllUsers()
      .then(async (userList) => {
        // Fetch stats for each user in parallel
        const usersWithStats: UserWithStats[] = await Promise.all(
          userList.map(async (user) => {
            try {
              const stats = await AuthService.getUserStatistics(user.id);
              return { ...user, stats };
            } catch (err) {
              return { ...user, stats: undefined };
            }
          })
        );
        // Sort by games_won desc, then total_score desc
        usersWithStats.sort((a, b) => {
          const aWins = a.stats?.games_won ?? 0;
          const bWins = b.stats?.games_won ?? 0;
          if (bWins !== aWins) return bWins - aWins;
          const aScore = a.stats?.total_score ?? 0;
          const bScore = b.stats?.total_score ?? 0;
          return bScore - aScore;
        });
        if (isMounted) setUsers(usersWithStats);
      })
      .catch(() => {
        if (isMounted) setError('Failed to load ranking.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return <div className="text-lg text-gray-400">Loading ranking...</div>;
  }
  if (error) {
    return <div className="text-red-400">{error}</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
      <h2 className="text-3xl font-bold mb-6">User Ranking</h2>
      <div className="overflow-x-auto w-full max-w-3xl">
        <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden">
          <thead>
            <tr>
              <th className="px-4 py-2">Rank</th>
              <th className="px-4 py-2">Username</th>
              <th className="px-4 py-2">Games Played</th>
              <th className="px-4 py-2">Wins</th>
              <th className="px-4 py-2">Win Rate</th>
              <th className="px-4 py-2">Total Score</th>
              <th className="px-4 py-2">Highest Score</th>
              <th className="px-4 py-2">Average Score</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => (
              <tr key={user.id} className={idx === 0 ? 'bg-yellow-900' : idx % 2 === 0 ? 'bg-gray-700' : 'bg-gray-800'}>
                <td className="px-4 py-2 text-center font-bold">{idx + 1}</td>
                <td className="px-4 py-2 text-center">{user.username}</td>
                <td className="px-4 py-2 text-center">{user.stats?.total_games ?? '-'}</td>
                <td className="px-4 py-2 text-center">{user.stats?.games_won ?? '-'}</td>
                <td className="px-4 py-2 text-center">
                  {user.stats && user.stats.total_games > 0
                    ? `${((user.stats.games_won / user.stats.total_games) * 100).toFixed(1)}%`
                    : '-'}
                </td>
                <td className="px-4 py-2 text-center">{user.stats?.total_score ?? '-'}</td>
                <td className="px-4 py-2 text-center">{user.stats?.highest_score ?? '-'}</td>
                <td className="px-4 py-2 text-center">{user.stats?.average_score?.toFixed(2) ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Ranking; 