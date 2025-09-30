/**
 * Leaderboard Component
 * 
 * Displays top players and their game statistics.
 * Shows rankings based on games won and total score.
 */

import React, { useEffect, useState } from 'react';
import { GameStatsService, UserStatistics } from '../services/gameStatsService';
import i18n from 'i18next';

interface LeaderboardProps {
  onBack: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ onBack }) => {
  const [leaderboard, setLeaderboard] = useState<UserStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch leaderboard data on component mount
   */
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const data = await GameStatsService.getLeaderboard(10);
        setLeaderboard(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : i18n.t('error.lbfailed'));
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  /**
   * Calculate win rate percentage
   * @param won - Number of games won
   * @param total - Total number of games
   * @returns string - Win rate percentage
   */
  const calculateWinRate = (won: number, total: number): string => {
    if (total === 0) return '0%';
    return `${Math.round((won / total) * 100)}%`;
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">{i18n.t('label.leaderboard')}</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          {i18n.t('button.back')}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">{i18n.t('label.loading')}</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-600 text-lg">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {i18n.t('button.retry')}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">{i18n.t('rankinfo.rank')}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">{i18n.t('rankinfo.player')}</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">{i18n.t('rankinfo.gameswon')}</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">{i18n.t('rankinfo.gamesplayed')}</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">{i18n.t('rankinfo.winrate')}</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">{i18n.t('rankinfo.totalscore')}</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">{i18n.t('rankinfo.highscore')}</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">{i18n.t('rankinfo.avgscore')}</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    {i18n.t('label.noplayers')}
                  </td>
                </tr>
              ) : (
                leaderboard.map((player, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        {index === 0 && (
                          <span className="text-yellow-500 text-lg mr-2">🥇</span>
                        )}
                        {index === 1 && (
                          <span className="text-gray-400 text-lg mr-2">🥈</span>
                        )}
                        {index === 2 && (
                          <span className="text-orange-500 text-lg mr-2">🥉</span>
                        )}
                        <span className="font-semibold text-gray-800">
                          #{index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-bold text-blue-600">
                            {player.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-800">{player.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold text-green-600">{player.gamesWon}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {player.totalGames}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium">
                        {calculateWinRate(player.gamesWon, player.totalGames)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {player.totalScore}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold text-yellow-600">{player.highestScore}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {player.averageScore.toFixed(1)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 text-center text-sm text-gray-500">
        <p>{i18n.t('msg.leaderboard')}</p>
      </div>
    </div>
  );
}; 