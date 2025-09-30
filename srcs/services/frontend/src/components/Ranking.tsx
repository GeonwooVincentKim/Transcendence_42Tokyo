import React, { useEffect, useState } from 'react';
import { GameStatsService } from '../services/gameStatsService';
import i18n from 'i18next';

interface UserWithStats {
  username: string;
  totalGames: number;
  gamesWon: number;
  gamesLost: number;
  totalScore: number;
  highestScore: number;
  averageScore: number;
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
    
    GameStatsService.getLeaderboard(10)
      .then((leaderboard) => {
        if (isMounted) setUsers(leaderboard);
      })
      .catch((err) => {
        console.error('Failed to load leaderboard:', err);
        if (isMounted) setError(i18n.t('error.leaderboardfailed'));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return <div className="text-lg text-gray-400">{i18n.t('label.loading')}</div>;
  }
  if (error) {
    return <div className="text-red-400">{error}</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
      <h2 className="text-3xl font-bold mb-6">{i18n.t('label.ranking')}</h2>
      <div className="overflow-x-auto w-full max-w-3xl">
        <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden">
          <thead>
            <tr>
              <th className="px-4 py-2">{i18n.t('rankinfo.rank')}</th>
              <th className="px-4 py-2">{i18n.t('rankinfo.usrnm')}</th>
              <th className="px-4 py-2">{i18n.t('rankinfo.gamesplayed')}</th>
              <th className="px-4 py-2">{i18n.t('rankinfo.gameswon')}</th>
              <th className="px-4 py-2">{i18n.t('rankinfo.winrate')}</th>
              <th className="px-4 py-2">{i18n.t('rankinfo.totalscore')}</th>
              <th className="px-4 py-2">{i18n.t('rankinfo.highscore')}</th>
              <th className="px-4 py-2">{i18n.t('rankinfo.avgscore')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => (
              <tr key={user.username} className={idx === 0 ? 'bg-yellow-900' : idx % 2 === 0 ? 'bg-gray-700' : 'bg-gray-800'}>
                <td className="px-4 py-2 text-center font-bold">{idx + 1}</td>
                <td className="px-4 py-2 text-center">{user.username}</td>
                <td className="px-4 py-2 text-center">{user.totalGames}</td>
                <td className="px-4 py-2 text-center">{user.gamesWon}</td>
                <td className="px-4 py-2 text-center">
                  {user.totalGames > 0
                    ? `${((user.gamesWon / user.totalGames) * 100).toFixed(1)}%`
                    : '-'}
                </td>
                <td className="px-4 py-2 text-center">{user.totalScore}</td>
                <td className="px-4 py-2 text-center">{user.highestScore}</td>
                <td className="px-4 py-2 text-center">{user.averageScore.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Ranking; 