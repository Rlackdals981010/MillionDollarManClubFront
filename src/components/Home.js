import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { jwtDecode } from 'jwt-decode';
import './Common.css'; // 공통 스타일 import
import './Home.css';
import moment from 'moment-timezone'; // moment-timezone 임포트
import { useNavigate } from 'react-router-dom';



// moment를 Asia/Seoul 시간대로 설정
moment.tz.setDefault('Asia/Seoul');

// Date 객체로 변환하는 헬퍼 함수 (Asia/Seoul 시간대 적용)

function Home() {
  const [monthlyQuest, setMonthlyQuest] = useState(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState(null);
  const [assetData, setAssetData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [per, setPer] = useState('');
  const [dailyQuest, setDailyQuest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentYear, setCurrentYear] = useState(moment().year()); // Asia/Seoul 기준
  const [currentMonth, setCurrentMonth] = useState(moment().month() + 1); // Asia/Seoul 기준 (0~11 → 1~12)
  const [inputMode, setInputMode] = useState('revenue'); // 'revenue' 또는 'save'
  const [inputValue, setInputValue] = useState(''); // 입력 값

  const currentDateObj = moment().toDate(); // Asia/Seoul 기준 Date 객체
  const currentDate = moment(currentDateObj).format('YYYY.MM.DD'); // 한국 형식으로 포매팅
  const navigate = useNavigate();
  const getUserNameFromToken = () => {
    const token = localStorage.getItem('bearerToken');
    if (!token) return '사용자';
    try {
      const decoded = jwtDecode(token);
      return decoded.name || decoded.sub || '사용자';
    } catch (error) {
      return '사용자';
    }
  };

  const userName = getUserNameFromToken();

  const fetchMonthlyQuest = useCallback(async (year, month) => {
    try {
      const response = await api.get('/calendar', { params: { year, month: month.toString().padStart(2, '0') } });
      const parsedQuest = Object.fromEntries(
        Object.entries(response.data).map(([key, value]) => [
          moment(key).format('YYYY-MM-DD'), // Asia/Seoul로 파싱 후 포매팅
          value
        ])
      );
      setMonthlyQuest(parsedQuest);
    } catch (error) {
      setError('월별 quest 상태를 가져오지 못했습니다: ' + error.message);
    }
  }, []);

  const fetchMonthlyRevenue = useCallback(async (year, month) => {
    try {
      const response = await api.get('/calendar/detail', { params: { year, month: month.toString().padStart(2, '0') } });
      const parsedRevenue = response.data.map(item => ({
        ...item,
        date: moment(item.date).toDate(), // Asia/Seoul로 파싱된 Date 객체
      }));
      setMonthlyRevenue(parsedRevenue);
    } catch (error) {
      setError('월별 상세 데이터를 가져오지 못했습니다: ' + error.message);
    }
  }, []);

  const fetchAssetData = useCallback(async () => {
    try {
      const token = localStorage.getItem('bearerToken');
      if (!token) {
        setError('인증 토큰이 필요합니다.');
        setAssetData([]); // 기본 빈 배열 설정
        return;
      }

      const response = await api.get('/asset', {
        headers: { Authorization: `Bearer ${token}` }, // 인증 헤더 추가
      });

      // API 응답 구조 점검
      let assets = [];
      if (response.data && response.data.data && Array.isArray(response.data.data.assets)) {
        assets = response.data.data.assets; // 중첩된 data.assets 접근
      } else if (Array.isArray(response.data.assets)) {
        assets = response.data.assets; // 직접 assets 접근
      } else {
        assets = response.data.assets || []; // 기본값 설정
      }

      setAssetData(assets.map(item => ({
        ...item,
        date: moment(item.date).toDate(), // Asia/Seoul로 파싱된 Date 객체
      })));
    } catch (error) {
      setError('자산 데이터를 가져오지 못했습니다: ' + (error.response ? error.response.data : error.message));
      setAssetData([]); // API 호출 실패 시 빈 배열 설정
    }
  }, []);

  const fetchDailyQuest = async (perValue) => {
    try {
      const response = await api.post('/money/upcoming', { per: perValue });
      setDailyQuest(response.data.data.dailyQuest);
      setPer('');
    } catch (error) {
      setError('일퀘 데이터를 가져오지 못했습니다: ' + (error.response?.data?.message || error.message));
      setDailyQuest(null);
    }
  };
  const handleHome = () => {
    console.log("Home clicked");
    navigate('/home');
  };
  const handleSeed = () => {
    console.log("Seed clicked");
    navigate('/seed');
  };
  const handleLogout = () => {
    console.log("Logout clicked");
    localStorage.removeItem('bearerToken');
    navigate('/');
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

  const handleTotalLog = () => {
    window.location.href = '/revenue';
  };

  // 입력 값 변경 핸들러
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  // 토글 저장 API 호출
  const handleToggleSubmit = async () => {
    try {
      const newValue = parseFloat(inputValue);
      if (isNaN(newValue)) {
        setError('유효한 숫자를 입력해주세요.');
        return;
      }
      if (!selectedDate) {
        setError('날짜를 선택해주세요.');
        return;
      }

      const formattedDate = moment(selectedDate.date).format('YYYY-MM-DD'); // 선택한 날짜를 YYYY-MM-DD 형식으로 변환
      const token = localStorage.getItem('bearerToken');

      if (inputMode === 'revenue') {
        await api.post(
          '/log/revenue',
          { dailyRevenue: newValue, date: formattedDate },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await api.post(
          '/log/save-money',
          { dailySaveMoney: newValue, date: formattedDate },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      setInputValue(''); // 입력 초기화
      setError(null); // 에러 초기화
      // 데이터 새로고침
      await Promise.all([
        fetchMonthlyQuest(currentYear, currentMonth),
        fetchMonthlyRevenue(currentYear, currentMonth),
        fetchAssetData(),
      ]);
      // 선택된 날짜 동기화
      const updatedRevenue = monthlyRevenue.find(r =>
        moment(r.date).format('YYYY-MM-DD') === formattedDate
      );
      setSelectedDate(updatedRevenue || { ...selectedDate });
    } catch (error) {
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
    const loadInitialData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchMonthlyQuest(currentYear, currentMonth),
          fetchMonthlyRevenue(currentYear, currentMonth),
          fetchAssetData(),
          fetchDailyQuest(null), // 페이지 로드 시 per를 null로 호출
        ]);
      } catch (error) {
        setError('데이터를 가져오지 못했습니다: ' + error.message);
      }
      setLoading(false);
    };
    loadInitialData();
  }, [currentYear, currentMonth, fetchMonthlyQuest, fetchMonthlyRevenue, fetchAssetData]);

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div>{error}</div>;

  // 달력 생성 (Asia/Seoul 기준)
  const daysInMonth = moment([currentYear, currentMonth - 1]).daysInMonth(); // Asia/Seoul 기준
  const firstDayOfMonth = moment([currentYear, currentMonth - 1, 1]).day(); // Asia/Seoul 기준

  // 달력의 행 수 계산 (7일씩 나누고, 첫째 날의 요일로 시작)
  const totalDays = daysInMonth + firstDayOfMonth; // 총 셀 수 (빈 셀 포함)
  const rows = Math.ceil(totalDays / 7); // 7일(요일)로 나누어 행 수 계산

  const calendarGrid = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarGrid.push({ day: null, status: 'empty' });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const date = moment([currentYear, currentMonth - 1, i]).toDate(); // Asia/Seoul 기준
    const yearMonthDay = moment(date).format('YYYY-MM-DD');
    const todayFormatted = moment(currentDateObj).format('YYYY-MM-DD');
    const quest = monthlyQuest?.[yearMonthDay] !== undefined ? monthlyQuest[yearMonthDay] : false;

    const revenueData = monthlyRevenue?.find(r => {
      const revenueDate = moment(r.date).format('YYYY-MM-DD');
      return revenueDate === yearMonthDay;
    }) || {
      date: date,
      addedRevenueMoney: 0.0,
      addedSaveMoney: 0.0,
      addedRevenuePercent: 0.0,
      todayTotal: 0.0,
      quest: false,
    };

    // 요일 계산 (0: 일요일, 6: 토요일)
    const dayOfWeek = moment(date).day();

    // 상태 결정 로직
    let status;
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // 토요일(6) 또는 일요일(0)인 경우 색상 없음
      status = 'weekend'; // 새로운 상태 추가
    } else if (yearMonthDay === todayFormatted) {
      status = 'today'; // 오늘은 노란색
    } else if (moment(date).isAfter(currentDateObj)) {
      status = 'future'; // 오늘 이후는 회색
    } else {
      status = quest ? 'green' : 'red'; // 과거 날짜는 퀘스트 여부로 초록/빨강
    }

    calendarGrid.push({
      day: i,
      status: status,
      data: revenueData,
      isToday: yearMonthDay === todayFormatted,
    });
  }

  const handleDateClick = (day) => {
    if (!day) return;
    const date = moment([currentYear, currentMonth - 1, day]).toDate(); // Asia/Seoul 기준
    const yearMonthDay = moment(date).format('YYYY-MM-DD');
    const selected = monthlyRevenue?.find(r => moment(r.date).format('YYYY-MM-DD') === yearMonthDay);
    setSelectedDate(selected || {
      date: date,
      addedRevenueMoney: 0.0,
      addedSaveMoney: 0.0,
      addedRevenuePercent: 0.0,
      todayTotal: 0.0,
      quest: false,
    });
  };

  // 자산 그래프 데이터 생성 (Asia/Seoul 기준)
  const chartData = assetData && assetData.length > 0 ? (() => {
    const uniqueDates = [...new Set(assetData.map(item => moment(item.date).format('YYYY-MM-DD')))]
      .sort((a, b) => moment(a).valueOf() - moment(b).valueOf());
  
    const getUserData = (name) => {
      const userData = assetData.filter(item => item.name === name);
      return uniqueDates.map(date => {
        const entry = userData.find(item => moment(item.date).format('YYYY-MM-DD') === date);
        if (entry && entry.todayTotal > 0) {
          return (entry.todayTotal / 1000).toFixed(2); // 🔥 1000으로 나눠서 K 단위 변환
        } else {
          const previousEntries = userData
            .filter(item => moment(item.date).isBefore(moment(date)) && item.todayTotal > 0)
            .sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf());
          return previousEntries.length > 0 ? previousEntries[0].todayTotal / 1000 : 0;
        }
      });
    };
  
    const allUsers = [...new Set(assetData.map(item => item.name))];
    const currentUserName = userName;
    const datasets = allUsers.map((name, index) => ({
      label: name,
      data: getUserData(name),
      borderColor: name === currentUserName ? 'blue' : ['orange', 'green', 'purple', 'red'][index % 4],
      borderWidth: 2,
      borderDash: name === currentUserName ? [] : [5, 5],
      fill: false,
      spanGaps: true,
      pointRadius: 5,
      pointHoverRadius: 7,
    }));
  
    return {
      labels: uniqueDates,
      datasets,
    };
  })() : {
    labels: [],
    datasets: [],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: false,
        min: 0,
        max: 30,
        ticks: {
          color: '#666',
          stepSize: 1,
          callback: function (value) {
            return value.toFixed(2) + 'K'; // ✅ Y축에서도 소수점 2자리 적용
          },
        },
        title: { display: true, text: '자산 (K$)', color: '#666' },
      },
      x: {
        ticks: {
          display: true,
          color: '#666',
          autoSkip: true,
          maxRotation: 30,
          minRotation: 30,
          callback: function (value, index, values) {
            return chartData.labels[index];
          },
        },
        title: { display: true, text: '날짜', color: '#666' },
      },
    },
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#666' },
      },
      title: {
        display: true,
        text: '자산 변동 그래프',
        color: '#333',
        font: { size: 16, weight: 'bold' },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function (context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            const date = chartData.labels[context.dataIndex] || '';
            return `${label}: ${value.toFixed(1)}K$ (${date})`; // 툴팁에서도 K 단위 적용
          },
        },
      },
    },
    elements: {
      line: {
        tension: 0,
      },
    },
  };

  console.log('Asset Data:', assetData);
  console.log('Chart Data:', chartData);
  return (
    <div className="home-container">
      <aside className="sidebar">
        <ul>
          <li onClick={handleHome} style={{ cursor: 'pointer' }}>🏠 홈</li>
          <li onClick={handleSeed} style={{ cursor: 'pointer' }}>💸 자산설정</li>
          <li onClick={handleLogout} style={{ cursor: 'pointer' }}>👋 로그아웃</li>
        </ul>
      </aside>

      <main className="main-content">


        <section className="dashboard">
          <header className="header">
            <span>{currentDate}</span>
          </header>
          <div className="left-column">
            <div className="challenge-assets-column">
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
                      placeholder="n%?"
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
                      <span className="date-value">{moment(selectedDate.date).format('YYYY.MM.DD')}</span>
                    </div>
                    <div className="asset-item">
                      <span className="asset-label">전체 자산</span>
                      <span className="asset-value">{Number(selectedDate.todayTotal).toLocaleString()}$</span>
                    </div>
                    <div className="asset-item">
                      <span className="asset-label">수익</span>
                      <span className="asset-value">{Number(selectedDate.addedRevenueMoney).toLocaleString()}$</span>
                    </div>
                    <div className="asset-item">
                      <span className="asset-label">저축</span>
                      <span className="asset-value">{Number(selectedDate.addedSaveMoney).toLocaleString()}$</span>
                    </div>
                    <div className="asset-item">
                      <span className="asset-label">수익률</span>
                      <span className="asset-value">{Number(selectedDate.addedRevenuePercent).toFixed(2)}%</span>
                    </div>
                    <div className="asset-item">
                      <span className="asset-label">일일퀘스트</span>
                      <span className="asset-value">{selectedDate.quest ? '완료' : '미완료'}</span>
                    </div>
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
            </div>

            <div className={`calendar-section calendar-section-rows-${rows}`}>
              <div className="calendar-header">
                <div className="calendar-title-controls">
                  <h2>{currentYear}년 {currentMonth}월</h2>
                  <div className="calendar-controls">
                    <button onClick={handlePrevMonth}>{"<"}</button>
                    <button onClick={handleNextMonth}>{">"}</button>
                  </div>
                </div>
                <div className="TotalLogButton">
                  <button onClick={handleTotalLog}>
                    <span>전체 내역보기</span>
                    <span>{">"}</span>
                  </button>
                </div>
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