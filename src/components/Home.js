import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { jwtDecode } from 'jwt-decode';
import './Home.css';

// Date 객체로 변환하는 헬퍼 함수
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
  const [currentYear, setCurrentYear] = useState(new Date().getUTCFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getUTCMonth() + 1);
  const [inputMode, setInputMode] = useState('revenue'); // 'revenue' 또는 'save'
  const [inputValue, setInputValue] = useState(''); // 입력 값

  const currentDateObj = new Date();
  const currentDate = currentDateObj.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC'
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

  const fetchMonthlyQuest = useCallback(async (year, month) => {
    try {
      const response = await api.get('/calendar', { params: { year, month: month.toString().padStart(2, '0') } });
      console.log('월별 quest 응답:', response.data);
      const parsedQuest = Object.fromEntries(
        Object.entries(response.data).map(([key, value]) => [parseDate(key).toISOString().split('T')[0], value])
      );
      setMonthlyQuest(parsedQuest);
    } catch (error) {
      console.error('월별 quest 상태 오류:', error);
      setError('월별 quest 상태를 가져오지 못했습니다: ' + error.message);
    }
  }, []);

  const fetchMonthlyRevenue = useCallback(async (year, month) => {
    try {
      const response = await api.get('/calendar/detail', { params: { year, month: month.toString().padStart(2, '0') } });
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
  }, []);

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

  const handlePrevMonth = () => {
    setCurrentMonth(prev => {
      if (prev === 1) {
        setCurrentYear(prevYear => prevYear - 1);
        return 12;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      if (prev === 12) {
        setCurrentYear(prevYear => prevYear + 1);
        return 1;
      }
      return prev + 1;
    });
  };

  // 입력 값 변경 핸들러
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  // 토글 저장 API 호출
  const handleToggleSubmit = async () => {
    if (!inputValue || isNaN(inputValue) || parseFloat(inputValue) < 0) {
      setError('유효한 금액을 입력해주세요 (0 이상의 숫자).');
      return;
    }
    try {
      if (inputMode === 'revenue') {
        await api.post('/log/revenue', { dailyRevenue: parseFloat(inputValue) });
      } else {
        await api.post('/log/save-money', { dailySaveMoney: parseFloat(inputValue) });
      }
      setInputValue(''); // 입력 초기화
      setError(null); // 에러 초기화
      // 데이터 새로고침 (필요 시)
      await fetchMonthlyRevenue(currentYear, currentMonth);
    } catch (error) {
      console.error(`${inputMode === 'revenue' ? '수익' : '저축'} 등록 오류:`, error);
      setError(`${inputMode === 'revenue' ? '수익' : '저축'} 등록에 실패했습니다: ` + (error.response?.data?.message || error.message));
    }
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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchMonthlyQuest(currentYear, currentMonth), fetchMonthlyRevenue(currentYear, currentMonth), fetchAssetData()]);
      } catch (error) {
        setError('데이터를 가져오지 못했습니다: ' + error.message);
      }
      setLoading(false);
    };
    loadData();
  }, [currentYear, currentMonth, fetchMonthlyQuest, fetchMonthlyRevenue, fetchAssetData]);

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div>{error}</div>;

  const daysInMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 0)).getUTCDate();
  const firstDayOfMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 1)).getUTCDay();

  const calendarGrid = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarGrid.push({ day: null, status: 'empty' });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(Date.UTC(currentYear, currentMonth - 1, i));
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
    calendarGrid.push({
      day: i,
      status: quest ? 'green' : 'red',
      data: revenueData,
      isToday: yearMonthDay === currentDateObj.toISOString().split('T')[0],
    });
  }

  const handleDateClick = (day) => {
    if (!day) return;
    const date = new Date(Date.UTC(currentYear, currentMonth - 1, day));
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

  return (
    <div className="home-container">
      <aside className="sidebar">
        <ul>
          <li>🏠 홈</li>
          <li>👤 실시간차트</li>
          <li>💰 뉴스/라이브</li>
          <li>💸 자산설정</li>
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
            {selectedDate ? (
              <div className="assets-details">
                <div className="date-display">
                  <span className="date-value">{new Date(selectedDate.date).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  }).replace(/\./g, '.').slice(0, -1)}</span>
                </div>
                <div className="asset-item">
                  <span className="asset-label">전체 자산</span>
                  <span className="asset-value">{Number(selectedDate.todayTotal).toLocaleString()}원</span>
                </div>
                <div className="asset-item">
                  <span className="asset-label">수익</span>
                  <span className="asset-value">{Number(selectedDate.addedRevenueMoney).toLocaleString()}원</span>
                </div>
                <div className="asset-item">
                  <span className="asset-label">저축</span>
                  <span className="asset-value">{Number(selectedDate.addedSaveMoney).toLocaleString()}원</span>
                </div>
                <div className="asset-item">
                  <span className="asset-label">수익률</span>
                  <span className="asset-value">{Number(selectedDate.addedRevenuePercent).toFixed(2)}%</span>
                </div>
                <div className="asset-item">
                  <span className="asset-label">일일퀘스트</span>
                  <span className="asset-value">{selectedDate.quest ? '완료' : '미완료'}</span>
                </div>
                <hr className="divider" /> {/* 구분선 유지 */}
                <div className="input-section">
                  <div className="toggle-row">
                    <button
                      className={`toggle-button ${inputMode === 'revenue' ? 'active' : ''}`}
                      onClick={() => setInputMode('revenue')}
                    >
                      수익
                    </button>
                    <button
                      className={`toggle-button ${inputMode === 'save' ? 'active' : ''}`}
                      onClick={() => setInputMode('save')}
                    >
                      저축
                    </button>
                    <input
                      type="number"
                      value={inputValue}
                      onChange={handleInputChange}
                      placeholder={inputMode === 'revenue' ? '수익 입력' : '저축 입력'}
                      className="toggle-input"
                    />
                    <button className="save-button" onClick={handleToggleSubmit}>저장</button>
                  </div>
                </div>
              </div>
            ) : (
              <p>날짜를 선택해주세요.</p>
            )}
          </div>

          <div className="calendar-section">
            <div className="calendar-header">
              <button onClick={handlePrevMonth}>&lt;</button>
              <h2>{currentYear}년 {currentMonth}월</h2>
              <button onClick={handleNextMonth}>&gt;</button>
            </div>
            <div className="calendar-grid">
              {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                <div key={day} className="calendar-day-header">
                  {day}
                </div>
              ))}
              {calendarGrid.map((item, index) => (
                <div
                  key={index}
                  className={`calendar-day ${item.status === 'empty' ? 'empty' : item.status} ${item.isToday ? 'today' : ''}`}
                  onClick={() => handleDateClick(item.day)}
                >
                  {item.day || ''}
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