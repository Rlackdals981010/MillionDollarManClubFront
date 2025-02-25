import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { jwtDecode } from 'jwt-decode';
import './Home.css';

const parseDate = (date) => {
  if (date instanceof Date) return date;
  if (typeof date === 'string') return new Date(date);
  return new Date();
};

function Home() {
  const [monthlyQuest, setMonthlyQuest] = useState(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState(null);
  const [assetData, setAssetData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [per, setPer] = useState('');
  const [dailyQuest, setDailyQuest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UTC 기준으로 현재 날짜 설정
  const currentDateObj = new Date(); // 시스템 시간 (KST)
  const year = currentDateObj.getUTCFullYear().toString(); // UTC 연도
  const month = (currentDateObj.getUTCMonth() + 1).toString().padStart(2, '0'); // UTC 월

  const currentDate = currentDateObj.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC' // UTC 기준으로 표시
  }).replace(/\./g, '.').slice(0, -1);

  const getUserNameFromToken = () => {
    const token = localStorage.getItem('bearerToken');
    if (!token) return '사용자';
    try {
      const decoded = jwtDecode(token);
      return decoded.name || decoded.sub || '사용자';
    } catch (error) {
      console.error('토큰 디코딩 오류:', error);
      return '사용자';
    }
  };

  const userName = getUserNameFromToken();

  const fetchMonthlyQuest = useCallback(async () => {
    try {
      const response = await api.get('/calendar', { params: { year, month } });
      console.log('월별 quest 응답:', response.data);
      const parsedQuest = Object.fromEntries(
        Object.entries(response.data).map(([key, value]) => [parseDate(key).toISOString().split('T')[0], value])
      );
      setMonthlyQuest(parsedQuest);
    } catch (error) {
      console.error('월별 quest 상태 오류:', error);
      setError('월별 quest 상태를 가져오지 못했습니다: ' + error.message);
    }
  }, [year, month]);

  const fetchMonthlyRevenue = useCallback(async () => {
    try {
      const response = await api.get('/calendar/detail', { params: { year, month } });
      console.log('월별 상세 데이터 응답:', response.data);
      const parsedRevenue = response.data.map(item => ({
        ...item,
        date: parseDate(item.date),
      }));
      setMonthlyRevenue(parsedRevenue);
    } catch (error) {
      console.error('월별 상세 데이터 오류:', error);
      setError('월별 상세 데이터를 가져오지 못했습니다: ' + error.message);
    }
  }, [year, month]);

  const fetchAssetData = useCallback(async () => {
    try {
      const response = await api.get('/asset');
      console.log('자산 그래프 응답:', response.data);
      const data = Array.isArray(response.data.data) ? response.data.data : (response.data.data || []);
      setAssetData(data);
    } catch (error) {
      console.error('자산 그래프 오류:', error);
      setError('자산 데이터를 가져오지 못했습니다: ' + (error.response ? error.response.data : error.message));
    }
  }, []);

  const fetchDailyQuest = async (perValue) => {
    try {
      const response = await api.post('/money/upcoming', { per: perValue });
      console.log('Daily Quest 응답:', response.data);
      setDailyQuest(response.data.data.dailyQuest);
      setPer('');
    } catch (error) {
      console.error('Daily Quest 오류:', error);
      setError('일퀘 데이터를 가져오지 못했습니다: ' + (error.response?.data?.message || error.message));
      setDailyQuest(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('bearerToken');
    window.location.href = '/auth';
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchMonthlyQuest(), fetchMonthlyRevenue(), fetchAssetData()]);
      } catch (error) {
        setError('데이터를 가져오지 못했습니다: ' + error.message);
      }
      setLoading(false);
    };
    loadData();
  }, [fetchMonthlyQuest, fetchMonthlyRevenue, fetchAssetData]);

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div>{error}</div>;

  const daysInMonth = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  const calendarGrid = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const date = new Date(Date.UTC(year, month - 1, day));
    const yearMonthDay = date.toISOString().split('T')[0];
    const quest = monthlyQuest?.[yearMonthDay] !== undefined ? monthlyQuest[yearMonthDay] : false;

    const revenueData = monthlyRevenue?.find(r => {
      const revenueDate = parseDate(r.date).toISOString().split('T')[0];
      return revenueDate === yearMonthDay;
    }) || {
      date: new Date(yearMonthDay),
      addedRevenueMoney: 0.0,
      addedSaveMoney: 0.0,
      addedRevenuePercent: 0.0,
      todayTotal: 0.0,
      quest: false,
    };
    return {
      day,
      status: quest ? 'green' : 'red',
      data: revenueData,
    };
  });

  const handleDateClick = (day) => {
    const date = new Date(Date.UTC(year, month - 1, day));
    const yearMonthDay = date.toISOString().split('T')[0];
    const selected = monthlyRevenue?.find(r => parseDate(r.date).toISOString().split('T')[0] === yearMonthDay);
    setSelectedDate(selected || {
      date: new Date(yearMonthDay),
      addedRevenueMoney: 0.0,
      addedSaveMoney: 0.0,
      addedRevenuePercent: 0.0,
      todayTotal: 0.0,
      quest: false,
    });
  };

  const chartData = {
    labels: (Array.isArray(assetData) ? assetData : []).map(item => parseDate(item.date).toISOString().split('T')[0]) || [],
    datasets: [
      {
        label: '나',
        data: (Array.isArray(assetData) ? assetData.filter(item => item.isCurrentUser).map(item => item.todayTotal) : []) || [],
        borderColor: 'blue',
        borderWidth: 2,
        fill: false,
      },
      {
        label: '황',
        data: (Array.isArray(assetData) ? assetData.filter(item => item.name === '황').map(item => item.todayTotal) : []) || [],
        borderColor: 'orange',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
      },
      {
        label: '오',
        data: (Array.isArray(assetData) ? assetData.filter(item => item.name === '오').map(item => item.todayTotal) : []) || [],
        borderColor: 'green',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
      },
      {
        label: '흰',
        data: (Array.isArray(assetData) ? assetData.filter(item => item.name === '흰').map(item => item.todayTotal) : []) || [],
        borderColor: 'gray',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true, ticks: { color: '#666' } },
      x: { ticks: { color: '#666' } },
    },
    plugins: {
      legend: { position: 'top', labels: { color: '#666' } },
    },
  };

  const handlePerChange = (e) => {
    setPer(e.target.value);
  };

  const handleSubmit = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      const perValue = parseInt(per, 10);
      if (isNaN(perValue) || perValue < 0) {
        setError('유효한 per 값을 입력해주세요 (0 이상의 숫자).');
        return;
      }
      fetchDailyQuest(perValue);
    }
  };

  return (
    <div className="home-container">
      <aside className="sidebar">
        <ul>
          <li>🏠 홈</li>
          <li>👤 나 설정</li>
          <li>💰 투자</li>
          <li>💸 자산 관리</li>
          <li onClick={handleLogout} style={{ cursor: 'pointer', color: 'red' }}>로그아웃</li>
        </ul>
      </aside>

      <main className="main-content">
        <header className="header">
          <span>{currentDate}</span>
        </header>

        <section className="dashboard">
          <div className="challenge-section">
            <div className="challenge-user">
              <span className="user-name">{userName}</span>
            </div>
            <div className="challenge-row">
              <div className="challenge-content">
                <span>100만불까지 </span>
                {dailyQuest !== null && <span className="result-days" style={{ color: '#0A83FF' }}>{dailyQuest}일</span>}
              </div>
              <div className="challenge-stats">
                <span>저축률</span>
                <input
                  type="number"
                  value={per}
                  onChange={handlePerChange}
                  placeholder="per 입력"
                  className="per-input"
                />
                <button className="action-button" onClick={handleSubmit}>확인</button>
              </div>
            </div>
          </div>

          <div className="assets-section">
            <h3>상세</h3>
            {selectedDate ? (
              <>
                <p>전체 자산: {selectedDate.todayTotal}원</p>
                <p>수익: {selectedDate.addedRevenueMoney}원</p>
                <p>저축: {selectedDate.addedSaveMoney}원</p>
                <p>수익률: {selectedDate.addedRevenuePercent}%</p>
                <p>일일퀘스트: {selectedDate.quest ? '완료' : '미완료'}</p>
              </>
            ) : (
              <p>날짜를 선택해주세요.</p>
            )}
          </div>

          <div className="calendar-section">
            <h2>{year}년 {month}월</h2>
            <div className="calendar-grid">
              {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                <div key={day} className="calendar-day-header">
                  {day}
                </div>
              ))}
              {calendarGrid.map((item, index) => (
                <div
                  key={index}
                  className={`calendar-day ${item.status === 'gray' ? 'gray' : item.status}`}
                  onClick={() => handleDateClick(item.day)}
                >
                  {item.day}
                </div>
              ))}
            </div>
          </div>

          <div className="graph-section">
            <h2>자산 그래프</h2>
            <div className="chart-container">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Home;