import axios from 'axios';

const api = axios.create({
  baseURL: 'https://milliondollarmanclub.onrender.com', // Spring 서버 주소 (필요하면 변경)
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터로 bearerToken 자동 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bearerToken');
    if (token) {
      // Bearer 접두사를 포함한 토큰이 이미 저장되어 있으니 그대로 사용
      config.headers.Authorization = token; // "Bearer ..." 형식 그대로 사용
    }
    console.log('요청:', config.url, config.headers); // 요청 로그
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터로 에러 로그
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('응답 에러:', error);
    return Promise.reject(error);
  }
);

export default api;

//로그인 성공 시: localStorage.setItem('bearerToken', token);
//로그아웃 시: localStorage.removeItem('bearerToken');