import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spin, Empty, Progress, Typography } from 'antd';
import ReactEChartsCore from 'echarts-for-react';
import { statisticsApi } from '../api';
import type { Statistics } from '../api';

const { Text } = Typography;

const statCards = [
  { key: 'currentStreak', icon: '🔥', label: '当前连续天数', variant: 'pink' },
  { key: 'longestStreak', icon: '🏆', label: '最长连续天数', variant: 'orange' },
  { key: 'totalCheckInDays', icon: '📅', label: '累计打卡天数', variant: 'green' },
  { key: 'totalDurationMinutes', icon: '⏰', label: '总学习时长（分钟）', variant: 'purple' },
];

const colors = ['#ff6b81', '#a29bfe', '#2ed573', '#ffa502', '#ff4757', '#c8c4ff'];

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

  // 打卡日历热力图
  const heatmapOption = {
    tooltip: { trigger: 'item', formatter: '{b0}: {c} 分钟' },
    grid: { left: 0, right: 0, top: 0, bottom: 0 },
    calendar: {
      range: '2026',
      cellSize: ['auto', 16],
      itemStyle: {
        borderWidth: 3,
        borderColor: '#fff5f7',
        borderRadius: 4,
      },
      splitLine: { show: false },
      dayLabel: { show: false },
      monthLabel: { show: true, color: '#b8929e', fontSize: 11 },
      yearLabel: { position: 'top', color: '#b8929e', fontSize: 13 },
    },
    series: [
      {
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: stats.dailyStats.map((d) => [d.date, d.durationMinutes]),
        label: { show: false },
      },
    ],
    visualMap: {
      min: 0,
      max: Math.max(...stats.dailyStats.map((d) => d.durationMinutes), 60),
      calculable: false,
      inRange: {
        color: ['#fff0f6', '#ffb8c6', '#ff6b81', '#e8435b'],
      },
    },
  };

  // 学习时长趋势
  const lineOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: stats.dailyStats.map((d) => d.date.slice(5)).reverse(),
      axisLabel: { fontSize: 11, color: '#b8929e' },
      axisLine: { lineStyle: { color: '#ffe0e6' } },
    },
    yAxis: {
      type: 'value',
      name: '分钟',
      axisLabel: { fontSize: 11, color: '#b8929e' },
      splitLine: { lineStyle: { color: '#fff0f6' } },
    },
    series: [
      {
        type: 'bar',
        data: stats.dailyStats.map((d) => d.durationMinutes).reverse(),
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#ff6b81' },
              { offset: 1, color: '#ffb8c6' },
            ],
          },
        },
        barMaxWidth: 24,
      },
    ],
  };

  return (
    <div>
      <div className="page-header">
        <h2>📊 学习统计</h2>
        <p>你的学习成果总览</p>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((card) => {
          const value = stats[card.key as keyof Statistics] as number;
          const displayValue = card.key === 'totalDurationMinutes' ? formatDuration(value) : value;
          return (
            <Col span={6} key={card.key}>
              <Card className={`stat-card ${card.variant}`} styles={{ body: { padding: '20px' } }}>
                <div className="stat-top-bar" />
                <div className="stat-icon">{card.icon}</div>
                <div className="stat-value">{displayValue}</div>
                <div className="stat-label">{card.label}</div>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card className="cute-card" title={<span style={{ color: '#5a3d4a' }}>📆 学习日历</span>}>
            <ReactEChartsCore option={heatmapOption} style={{ height: 160 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={14}>
          <Card className="cute-card" style={{ height: '100%' }}
            title={<span style={{ color: '#5a3d4a' }}>📈 每日学习时长趋势</span>}>
            <ReactEChartsCore option={lineOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col span={10}>
          <Card className="cute-card" style={{ height: '100%' }}
            title={<span style={{ color: '#5a3d4a' }}>🎯 目标任务完成情况</span>}>
            {stats.goalStats.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: 300, overflow: 'auto', paddingRight: 4 }}>
                {stats.goalStats.map((goal, i) => {
                  const c = goal.color || colors[i % colors.length];
                  return (
                    <div key={goal.goalId} style={{
                      borderLeft: `3px solid ${c}`,
                      paddingLeft: 12,
                      background: '#fff5f7',
                      borderRadius: 10,
                      padding: '10px 12px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text strong style={{ color: '#5a3d4a', fontSize: 14 }}>{goal.goalName}</Text>
                        <Text style={{ color: '#b8929e', fontSize: 12 }}>
                          ⏱️ {formatDuration(goal.totalDurationMinutes)}
                        </Text>
                      </div>
                      <Progress
                        percent={goal.totalTasks > 0 ? Math.round((goal.completedTasks / goal.totalTasks) * 100) : 0}
                        size="small"
                        strokeColor={{ '0%': c, '100%': colors[(i + 1) % colors.length] }}
                        format={() => `${goal.completedTasks}/${goal.totalTasks}`}
                      />
                      <div style={{ textAlign: 'right', marginTop: 2 }}>
                        <Text style={{ color: '#8c6f7a', fontSize: 11 }}>
                          已完成 {goal.completedTasks} 个，共 {goal.totalTasks} 个任务
                        </Text>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StatisticsPage;
