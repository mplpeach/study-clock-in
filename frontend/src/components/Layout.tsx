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
      {/* 浮动背景气泡 */}
      <div className="floating-balls">
        <div className="ball ball-1" />
        <div className="ball ball-2" />
        <div className="ball ball-3" />
        <div className="ball ball-4" />
      </div>

      <Layout style={{ minHeight: '100vh', background: 'transparent', position: 'relative' }}>
        <Sider
          width={200}
          className="cute-sider"
          style={{
            borderRadius: '0 20px 20px 0',
            padding: '20px 0',
            position: 'fixed',
            left: 0,
            height: '100vh',
            zIndex: 10,
          }}
        >
          <div style={{ textAlign: 'center', padding: '24px 16px 32px', position: 'relative' }}>
            <Typography.Title level={4} style={{
              margin: 0,
              color: '#fff',
              fontSize: 20,
              textShadow: '0 2px 8px rgba(0,0,0,0.15)',
              letterSpacing: 2,
            }}>
              🎀 学习打卡
            </Typography.Title>
            <Typography.Text style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: 12,
              display: 'block',
              marginTop: 4,
            }}>
              每天进步一点点
            </Typography.Text>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ fontSize: 15 }}
          />
        </Sider>
        <Layout style={{ marginLeft: 200, background: 'transparent', position: 'relative' }}>
          <Content className="cute-content" style={{ padding: '24px 32px', maxWidth: 900, margin: '0 auto', width: '100%', minHeight: '100vh' }}>
            {children}
          </Content>
        </Layout>
      </Layout>
    </AppProvider>
  );
};

export default AppLayout;
