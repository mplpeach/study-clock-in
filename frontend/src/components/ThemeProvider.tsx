import React from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import '../styles/cute.css';

const cuteTheme = {
  token: {
    colorPrimary: '#ff6b81',
    colorSuccess: '#2ed573',
    colorWarning: '#ffa502',
    colorError: '#ff4757',
    colorInfo: '#a29bfe',
    borderRadius: 12,
    colorBgContainer: '#ffffff',
    colorBgLayout: '#fff5f7',
    colorText: '#5a3d4a',
    colorTextSecondary: '#8c6f7a',
    colorTextTertiary: '#b8929e',
    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: 14,
    boxShadow: '0 4px 16px rgba(255, 107, 129, 0.08)',
  },
  components: {
    Card: {
      borderRadius: 16,
    },
    Button: {
      borderRadius: 20,
      controlHeight: 40,
      primaryShadow: '0 4px 12px rgba(255, 107, 129, 0.3)',
    },
    Tag: {
      borderRadius: 8,
    },
    Input: {
      borderRadius: 12,
    },
    Modal: {
      borderRadius: 20,
    },
    Menu: {
      borderRadius: 10,
    },
    Table: {
      borderRadius: 16,
    },
  },
};

interface Props {
  children: React.ReactNode;
}

const AppProvider: React.FC<Props> = ({ children }) => {
  return (
    <ConfigProvider theme={cuteTheme} locale={zhCN}>
      {children}
    </ConfigProvider>
  );
};

export default AppProvider;
