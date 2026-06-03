import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:8080/api',
  timeout: 10000,
});

client.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (res.code !== 200) {
      return Promise.reject(new Error(res.message || '请求失败'));
    }
    return res.data;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default client;
