import React, { useState } from 'react';
import api from '../api'; // api.js 경로 맞춰주기
import './Login.css'; // CSS 파일 import
import { useNavigate } from 'react-router-dom';

function Login() {
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    try {
      localStorage.removeItem('bearerToken');
      console.log('로그인 요청 시작:', { name }); // 요청 데이터 로그
      const response = await api.post('/signin', { name }); // 백엔드가 객체를 기대한다고 가정
      console.log('로그인 응답:', response.data); // 응답 데이터 로그
      const token = response.data.data.bearerToken; // 중첩된 data 구조에서 bearerToken 추출
      localStorage.setItem('bearerToken', token); // Bearer 접두사 포함 토큰 저장
      alert('로그인 성공!');
      navigate('/home'); // 로그인 성공 시 홈으로 리다이렉트
    } catch (error) {
      console.error('로그인 실패:', {
        message: error.message,
        response: error.response ? error.response.data : null,
        config: error.config,
      });
      alert('로그인 실패: ' + (error.response ? error.response.data : error.message));
    }
  };

  return (
    <div className="login-container">
      <h1 className="app-title">백만🔥의 사나이들</h1>
      <div className="login-card">
        <h2>로그인</h2>
        <form onSubmit={handleLogin}>
          <label className="label-text">이름</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="input-field"
          />
          <button type="submit" className="login-button">
            Log In
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;