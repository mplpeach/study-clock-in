import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spin, Empty, Progress, Typography } from 'antd';
import {
  FireOutlined, CalendarOutlined, ClockCircleOutlined, TrophyOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react';
import { statisticsApi } from '../api';
import type { Statistics } from '../api';

const { Text } = Typography;

const brightColors = ['#9DC8C8', '#F7DC9C', '#A8D8B9', '#B5D0E2', '#F4A7A7', '#C9B8E8', '#FAC8A0'];

const StatisticsPage: React.FC = () => {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await statisticsApi.get();
        setStats(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (!stats) return <Empty description="暂无数据" />;

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}小时${m}分钟`;
  };

  // 打卡日历热力图数据
  const heatmapOption = {
    tooltip: { trigger: 'item' },
    calendar: {
      range: '2026',
      cellSize: ['auto', 16],
      itemStyle: { borderWidth: 3, borderColor: '#F5F0EB' },
      splitLine: { show: false },
      dayLabel: { show: false },
      monthLabel: { show: true, color: '#999' },
    },
    series: [
      {
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: stats.dailyStats.map((d) => [d.date, d.durationMinutes]),
        label: { show: false },
        itemStyle: {
          borderRadius: 3,
        },
      },
    ],
    visualMap: {
      min: 0,
      max: Math.max(...stats.dailyStats.map((d) => d.durationMinutes), 60),
      calculable: false,
      inRange: {
        color: ['#F5F0EB', '#D4E8E8', '#9DC8C8', '#6BA8A8'],
      },
    },
  };

  // 各目标时长饼图
  const pieOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} 分钟 ({d}%)' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}\n{d}%', fontSize: 12 },
        data: stats.goalStats
          .filter((g) => g.totalDurationMinutes > 0)
          .map((g, i) => ({
            name: g.goalName,
            value: g.totalDurationMinutes,
            itemStyle: { color: g.color || brightColors[i % brightColors.length] },
          })),
      },
    ],
  };

  // 学习时长趋势
  const lineOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: stats.dailyStats.map((d) => d.date.slice(5)).reverse(),
      axisLabel: { fontSize: 11, color: '#999' },
    },
    yAxis: {
      type: 'value',
      name: '分钟',
      axisLabel: { fontSize: 11, color: '#999' },
    },
    series: [
      {
        type: 'bar',
        data: stats.dailyStats.map((d) => d.durationMinutes).reverse(),
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: '#9DC8C8',
        },
        barMaxWidth: 24,
      },
    ],
  };

  return (
    <div>
      <div className="page-header">
        <h2>学习统计</h2>
        <p>你的学习成果总览</p>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card className="stat-card" style={{ borderRadius: 16 }}>
            <FireOutlined style={{ fontSize: 28, color: '#F7DC9C' }} />
            <div className="stat-value">{stats.currentStreak}</div>
            <div className="stat-label">当前连续天数</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" style={{ borderRadius: 16 }}>
            <TrophyOutlined style={{ fontSize: 28, color: '#F7DC9C' }} />
            <div className="stat-value">{stats.longestStreak}</div>
            <div className="stat-label">最长连续天数</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" style={{ borderRadius: 16 }}>
            <CalendarOutlined style={{ fontSize: 28, color: '#9DC8C8' }} />
            <div className="stat-value">{stats.totalCheckInDays}</div>
            <div className="stat-label">累计打卡天数</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" style={{ borderRadius: 16 }}>
            <ClockCircleOutlined style={{ fontSize: 28, color: '#A8D8B9' }} />
            <div className="stat-value">{formatDuration(stats.totalDurationMinutes)}</div>
            <div className="stat-label">总学习时长</div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="学习日历" style={{ borderRadius: 16 }}>
            <ReactEChartsCore option={heatmapOption} style={{ height: 160 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={14}>
          <Card title="每日学习时长趋势" style={{ borderRadius: 16 }}>
            <ReactEChartsCore option={lineOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col span={10}>
          <Card title="各目标学习时长分布" style={{ borderRadius: 16 }}>
            {stats.goalStats.filter((g) => g.totalDurationMinutes > 0).length > 0 ? (
              <ReactEChartsCore option={pieOption} style={{ height: 300 }} />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="各目标任务完成情况" style={{ borderRadius: 16 }}>
            <Row gutter={[16, 16]}>
              {stats.goalStats.map((goal, i) => (
                <Col span={8} key={goal.goalId}>
                  <Card size="small" style={{ borderRadius: 12, borderLeft: `3px solid ${goal.color || brightColors[i % brightColors.length]}` }}>
                    <Text strong>{goal.goalName}</Text>
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>总学习时长：{formatDuration(goal.totalDurationMinutes)}</Text>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <Progress
                        percent={goal.totalTasks > 0 ? Math.round((goal.completedTasks / goal.totalTasks) * 100) : 0}
                        size="small"
                        strokeColor={goal.color || brightColors[i % brightColors.length]}
                        format={() => `${goal.completedTasks}/${goal.totalTasks}`}
                      />
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StatisticsPage;
