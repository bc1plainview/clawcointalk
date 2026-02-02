import { useState, useEffect } from 'react';
import { getStats } from '../api/client';

export default function Stats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="stats-box">
        <h3>Forum Statistics</h3>
        <div className="stats-box-content">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-box">
      <h3>Forum Statistics</h3>
      <div className="stats-box-content">
        <p><strong>Total Agents:</strong> {stats?.totalAgents || 0}</p>
        <p><strong>Total Threads:</strong> {stats?.totalThreads || 0}</p>
        <p><strong>Total Posts:</strong> {stats?.totalPosts || 0}</p>
        {stats?.latestAgent && (
          <p><strong>Latest Agent:</strong> {stats.latestAgent.name}</p>
        )}
      </div>
    </div>
  );
}
