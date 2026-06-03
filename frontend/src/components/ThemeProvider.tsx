import React from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

const theme = {
  token: {
    colorPrimary: '#9DC8C8',
    colorSuccess: '#A8D8B9',
    colorWarning: '#F7DC9C',
    colorError: '#F4A7A7',
    colorInfo: '#B5D0E2',
    borderRadius: 12,
    colorBgContainer: '#FFFFFF',
    colorBgLayout: '#F5F0EB',
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
  },
  components: {
    Card: {
      borderRadius: 16,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    },
    Button: {
      borderRadius: 20,
      controlHeight: 40,
    },
    Tag: {
      borderRadius: 10,
    },
  },
};

interface Props {
  children: React.ReactNode;
}

const AppProvider: React.FC<Props> = ({ children }) => {
  return (
    <ConfigProvider theme={theme} locale={zhCN}>
      {children}
    </ConfigProvider>
  );
};

export default AppProvider;
