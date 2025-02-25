import React, { useEffect, useState } from 'react';
import api from '../api'; // api.js 경로 맞춰주기
import { Line } from 'react-chartjs-2'; // Chart.js 사용
import 'chart.js/auto'; // Chart.js 자동 설정
import './Home.css'; // CSS 파일 (나중에 추가)

function Home() {
  const [calendarData, setCalendarData] = useState(null);
  const [assetData, setAssetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\./g, '.').slice(0, -1); // 2025.02.20 형식

  // 월별 캘린더 데이터 (GET /calendar)
  const fetchCalendar = async () => {
    try {
      const response = await api.get('/calendar', {
        params: { year: '2025', month: '02' }, // 캡처 기준으로 2025년 2월
      });
      setCalendarData(response.data.content); // PAGE형 데이터
    } catch (error) {
      console.error('캘린더 오류:', error);
      setError('캘린더 데이터를 가져오지 못했습니다.');
    }
  };

  // 전체 자산 그래프 (GET /asset)
  const fetchAssetData = async () => {
    try {
      const response = await api.get('/asset');
      setAssetData(response.data);
    } catch (error) {
      console.error('자산 그래프 오류:', error);
      setError('자산 데이터를 가져오지 못했습니다.');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCalendar(), fetchAssetData()]);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div>{error}</div>;

  // 캘린더 데이터 처리
  const calendarDays = calendarData || [];
  const calendarGrid = Array.from({ length: 35 }, (_, i) => {
    const day = i + 1;
    const item = calendarDays.find(d => {
      const date = new Date(d.date);
      return date.getDate() === day && date.getMonth() === 1 && date.getFullYear() === 2025;
    });
    return { day, status: item ? (item.quest ? 'green' : 'red') : 'gray' };
  });

  // 그래프 데이터 처리
  const chartData = {
    labels: assetData?.map(item => item.date) || [],
    datasets: [
      {
        label: '나',
        data: assetData?.map(item => item.todayTotal) || [],
        borderColor: 'blue',
        borderWidth: 2,
        fill: false,
      },
      {
        label: '황',
        data: assetData?.map(() => Math.random() * 100) || [], // 더미 데이터, 실제 데이터로 교체 필요
        borderColor: 'orange',
        borderWidth: 2,
        borderDash: [5, 5], // 점선
        fill: false,
      },
      {
        label: '오',
        data: assetData?.map(() => Math.random() * 80) || [], // 더미 데이터
        borderColor: 'green',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
      },
      {
        label: '흰',
        data: assetData?.map(() => Math.random() * 60) || [], // 더미 데이터
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
      y: {
        beginAtZero: true,
        ticks: { color: '#666' },
      },
      x: {
        ticks: { color: '#666' },
      },
    },
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#666' },
      },
    },
  };

  return (
    <div className="home-container">
      <aside className="sidebar">
        <ul>
          <li>🏠 홈</li>
          <li>👤 나 설정</li>
          <li>💰 투자</li>
          <li>💸 자산 관리</li>
        </ul>
      </aside>

      <main className="main-content">
        <header className="header">
          <span>{currentDate}</span>
        </header>

        <section className="dashboard">
          <div className="challenge-section">
            <h2>100만챌린지 29일</h2>
            <div className="challenge-stats">
              <span>재촉률</span>
              <span>9,999%</span>
              <button className="action-button">임의</button>
            </div>
          </div>

          <div className="assets-section">
            <h3>현재 자산</h3>
            <ul>
              <li>수익: 9,999,999원</li>
              <li>저축: 9,999,999원</li>
              <li>재촉: 9,999,999원</li>
              <li>수익률: 9,999,999%</li>
            </ul>
          </div>

          <div className="calendar-section">
            <h2>2025년 2월</h2>
            <div className="calendar-grid">
              {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                <div key={day} className="calendar-day-header">
                  {day}
                </div>
              ))}
              {calendarGrid.map((item, index) => (
                <div key={index} className={`calendar-day ${item.status}`}>
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