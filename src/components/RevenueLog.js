import React, { useEffect, useState } from 'react';
import api from '../api';

function RevenueLog() {
  const [logs, setLogs] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await api.get('/log/revenue');
        setLogs(response.data.content); // PAGE형
      } catch (error) {
        console.error('로그 오류:', error);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div>
      <h1>수익/저축 로그</h1>
      {logs ? (
        <ul>
          {logs.map((log, index) => (
            <li key={index}>
              {log.date}: 수익 {log.addedRevenueMoney}, 저축 {log.addedSaveMoney}
            </li>
          ))}
        </ul>
      ) : (
        '로딩 중...'
      )}
    </div>
  );
}

export default RevenueLog;