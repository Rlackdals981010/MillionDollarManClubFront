import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import moment from 'moment-timezone';
import './RevenueLog.css';

// moment를 Asia/Seoul 시간대로 설정
moment.tz.setDefault('Asia/Seoul');

function RevenueLog() {
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // 페이지당 항목 수, 스크린샷과 동일
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRevenueLog = async () => {
      try {
        const response = await api.get('/log/revenue');
        setRevenueData(response.data.data.content || []);
      } catch (error) {
        setError('수익 로그를 가져오지 못했습니다: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    };

    fetchRevenueLog();
  }, []);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '₩';
  };

  const handleHome = () => {
    console.log('Clicked Home'); // 디버깅용 로그
    navigate('/home');
  };

  const handleLogout = () => {
    console.log('Clicked Logout'); // 디버깅용 로그
    localStorage.removeItem('bearerToken');
    navigate('/');
  };

  const formatPercent = (value) => {
    return (value >= 0 ? '+ ' : '') + Number(value).toFixed(2) + '%'; // 음수와 양수 모두 올바르게 처리
  };

  // 페이지네이션 로직
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = revenueData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(revenueData.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  if (loading) return (
    <div className="home-container">
      <aside className="sidebar">
        <ul>
        <li onClick={handleHome} style={{ cursor: 'pointer', color: 'blue' }}>🏠 홈</li>
          <li>👤 실시간차트</li>
          <li>💰 뉴스/라이브</li>
          <li>💸 자산설정</li>
          <li style={{ cursor: 'pointer', color: 'red' }}>로그아웃</li>
        </ul>
      </aside>
      <div className="main-content">
        <div className="loading-state">로딩 중...</div>
      </div>
    </div>
  );

  if (error) return (
    <div className="home-container">
      <aside className="sidebar">
        <ul>
          <li onClick={handleHome} style={{ cursor: 'pointer', color: 'blue' }}>🏠 홈</li>
          <li>👤 실시간차트</li>
          <li>💰 뉴스/라이브</li>
          <li>💸 자산설정</li>
          <li onClick={handleLogout} style={{ cursor: 'pointer', color: 'red' }}>로그아웃</li>
        </ul>
      </aside>
      <div className="main-content">
        <div className="error-state">{error}</div>
      </div>
    </div>
  );

  return (
    <div className="home-container">
      <aside className="sidebar">
        <ul>
        <li onClick={handleHome} style={{ cursor: 'pointer', color: 'blue' }}>🏠 홈</li>
          <li>👤 실시간차트</li>
          <li>💰 뉴스/라이브</li>
          <li>💸 자산설정</li>
          <li onClick={handleLogout} style={{ cursor: 'pointer', color: 'red' }}>로그아웃</li>
        </ul>
      </aside>

      <div className="main-content">
        <div className="content-wrapper">
          <div className="page-header">
            <h1 className="page-title">수익/저축 전체 내역</h1>
          </div>

          <div className="revenue-table-container">
            <table className="revenue-table">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>수익</th>
                  <th>저축</th>
                  <th>수익률</th>
                  <th>일일 퀘스트</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item, index) => (
                  <tr key={index}>
                    <td className="revenue-table td">{moment(item.date).format('YYYY-MM-DD')}</td>
                    <td className="revenue-table td">{formatMoney(item.addedRevenueMoney)}</td>
                    <td className="revenue-table td">{formatMoney(item.addedSaveMoney)}</td>
                    <td className="revenue-table td">{formatPercent(item.addedRevenuePercent)}</td>
                    <td className="revenue-table td">
                      <span className={`quest-status ${item.quest ? 'complete' : 'incomplete'}`}>
                        {item.quest ? 'O' : 'X'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-button"
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => paginate(i + 1)}
                  className={currentPage === i + 1 ? 'pagination-button active' : 'pagination-button'}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-button"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RevenueLog;