import React from 'react';
import { Layout, Menu, Typography } from 'antd';
import {
  EditOutlined,
  FlagOutlined,
  UnorderedListOutlined,
  CalendarOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import AppProvider from './ThemeProvider';

const { Content, Sider } = Layout;

const menuItems = [
  { key: '/checkin', icon: <EditOutlined />, label: '打卡' },
  { key: '/goals', icon: <FlagOutlined />, label: '目标' },
  { key: '/tasks', icon: <UnorderedListOutlined />, label: '任务' },
  { key: '/calendar', icon: <CalendarOutlined />, label: '日历' },
  { key: '/statistics', icon: <BarChartOutlined />, label: '统计' },
];

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <AppProvider>
      <Layout style={{ minHeight: '100vh', background: '#F5F0EB' }}>
        <Sider
          width={200}
          style={{
            background: '#FFFFFF',
            borderRadius: '0 20px 20px 0',
            boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
            padding: '20px 0',
          }}
        >
          <div style={{ textAlign: 'center', padding: '20px 0 24px' }}>
            <Typography.Title level={4} style={{ margin: 0, color: '#9DC8C8' }}>
              🌱 学习打卡
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              每天进步一点点
            </Typography.Text>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ border: 'none', fontSize: 15 }}
          />
        </Sider>
        <Layout style={{ background: '#F5F0EB' }}>
          <Content style={{ padding: '24px 32px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
            {children}
          </Content>
        </Layout>
      </Layout>
    </AppProvider>
  );
};

export default AppLayout;
