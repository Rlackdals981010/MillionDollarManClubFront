import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import moment from 'moment-timezone';
import './SeedLog.css';

// moment를 Asia/Seoul 시간대로 설정
moment.tz.setDefault('Asia/Seoul');

function SeedLog() {
    const [seedData, setSeedData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10); // 페이지당 항목 수, 스크린샷과 동일
    const [seedInput, setSeedInput] = useState(''); // 시드 입력값
    const navigate = useNavigate();

    // 시드 로그를 가져오는 함수
    const fetchSeedLog = async () => {
        setLoading(true); // 로딩 상태 시작
        try {
            const response = await api.get('/log/seed');
            setSeedData(response.data.data.content || []);
        } catch (error) {
            setError('시드 로그를 가져오지 못했습니다: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false); // 로딩 상태 종료
        }
    };

    useEffect(() => {
        fetchSeedLog(); // 컴포넌트 마운트 시 시드 로그 가져오기
    }, []); // 빈 배열로 설정하여 마운트 시 한 번만 호출

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('ko-KR').format(amount) + '₩';
    };

    const handleHome = () => {
        console.log('Clicked Home');
        navigate('/home');
    };
    const handleSeed = () => {
        console.log("Seed clicked");
        navigate('/seed');
    };
    const handleLogout = () => {
        console.log('Clicked Logout');
        localStorage.removeItem('bearerToken');
        navigate('/');
    };

    // 시드 설정 저장 함수
    const handleSetSeed = async () => {
        try {
            const seedMoney = parseFloat(seedInput);
            if (isNaN(seedMoney) || seedMoney <= 0) {
                setError('유효한 시드 금액을 입력해주세요 (0보다 큰 숫자).');
                return;
            }

            setLoading(true); // 시드 설정 시작 시 로딩 상태
            await api.post('/log/seed', { seedMoney });
            setSeedInput(''); // 입력 초기화
            setError(null); // 에러 초기화
            await fetchSeedLog(); // 시드 로그 새로고침
        } catch (error) {
            setError('시드 설정에 실패했습니다: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false); // 로딩 상태 종료
        }
    };

    // 페이지네이션 로직
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = seedData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(seedData.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // 가장 최근 및 가장 과거의 총 시드 계산
    const latestSeed = seedData.length > 0 ? seedData[0].totalSeedMoney : 0;
    const earliestSeed = seedData.length > 0 ? seedData[seedData.length - 1].totalSeedMoney : 0;
    const addedSeed = latestSeed - earliestSeed;
    const initialSeed = earliestSeed;

    if (loading) return (
        <div className="home-container">
            <aside className="sidebar">
                <ul>
                    <li onClick={handleHome} style={{ cursor: 'pointer' }}>🏠 홈</li>
                    <li onClick={handleSeed} style={{ cursor: 'pointer' }}>💸 자산설정</li>
                    <li onClick={handleLogout} style={{ cursor: 'pointer' }}>👋 로그아웃</li>
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
                    <li onClick={handleHome} style={{ cursor: 'pointer' }}>🏠 홈</li>
                    <li onClick={handleSeed} style={{ cursor: 'pointer' }}>💸 자산설정</li>
                    <li onClick={handleLogout} style={{ cursor: 'pointer' }}>👋 로그아웃</li>
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
                    <li onClick={handleHome} style={{ cursor: 'pointer' }}>🏠 홈</li>
                    <li onClick={handleSeed} style={{ cursor: 'pointer' }}>💸 자산설정</li>
                    <li onClick={handleLogout} style={{ cursor: 'pointer' }}>👋 로그아웃</li>
                </ul>
            </aside>

            <div className="main-content">
                <div className="content-wrapper">
                    <div className="page-header">
                        <h1 className="page-title">시드 설정</h1>
                    </div>

                    {/* 시드 설정 입력란 및 추가된 시드/최초 시드 표시 */}
                    <div className="seed-input-row">
                        <div className="seed-input-container">
                            <input
                                type="number"
                                value={seedInput}
                                onChange={(e) => setSeedInput(e.target.value)}
                                placeholder="시드 금액 입력 ($)"
                                className="seed-input"
                            />
                            <button onClick={handleSetSeed} className="seed-button">설정</button>
                        </div>
                        <div className="seed-summary">
                            <span>추가된 시드: {formatMoney(addedSeed)}</span>
                            <span>내 최초 시드: {formatMoney(initialSeed)}</span>
                        </div>
                    </div>

                    {/* 자금 설정 내역 테이블 헤더 */}
                    <div className="table-header">
                        <h1 className="page-title">자금 설정 내역</h1>
                    </div>

                    {/* 시드 로그 테이블 */}
                    <div className="seed-table-container">
                        <table className="seed-table">
                            <thead>
                                <tr>
                                    <th>날짜</th>
                                    <th>추가된 시드</th>
                                    <th>총 시드</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentItems.map((item, index) => (
                                    <tr key={index}>
                                        <td className="seed-table td">{moment(item.date).format('YYYY-MM-DD')}</td>
                                        <td className="seed-table td">{formatMoney(item.addedSeedMoney)}</td>
                                        <td className="seed-table td">{formatMoney(item.totalSeedMoney)}</td>
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

export default SeedLog;