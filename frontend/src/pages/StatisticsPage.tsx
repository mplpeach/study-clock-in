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
    tooltip: { trigger: 'item', formatter: '{b0}: {c} 分钟' },
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
        label: { show: true, formatter: '{b}\n{d}%', fontSize: 12, color: '#8c6f7a' },
        data: stats.goalStats
          .filter((g) => g.totalDurationMinutes > 0)
          .map((g, i) => {
            const colors = ['#ff6b81', '#a29bfe', '#2ed573', '#ffa502', '#ff4757', '#c8c4ff'];
            return {
              name: g.goalName,
              value: g.totalDurationMinutes,
              itemStyle: { color: g.color || colors[i % colors.length] },
            };
          }),
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
          <Card className="cute-card" title={<span style={{ color: '#5a3d4a' }}>📈 每日学习时长趋势</span>}>
            <ReactEChartsCore option={lineOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col span={10}>
          <Card className="cute-card" title={<span style={{ color: '#5a3d4a' }}>🎯 各目标学习时长</span>}>
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
          <Card className="cute-card" title={<span style={{ color: '#5a3d4a' }}>📋 各目标任务完成情况</span>}>
            <Row gutter={[16, 16]}>
              {stats.goalStats.map((goal, i) => {
                const colors = ['#ff6b81', '#a29bfe', '#2ed573', '#ffa502', '#ff4757', '#c8c4ff'];
                return (
                  <Col span={8} key={goal.goalId}>
                    <Card size="small" className="cute-card" style={{
                      borderTop: `3px solid ${goal.color || colors[i % colors.length]}`,
                    }}>
                      <Text strong style={{ color: '#5a3d4a' }}>{goal.goalName}</Text>
                      <div style={{ marginTop: 8 }}>
                        <Text style={{ color: '#8c6f7a', fontSize: 12 }}>
                          ⏱️ 总时长：{formatDuration(goal.totalDurationMinutes)}
                        </Text>
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <Progress
                          percent={goal.totalTasks > 0 ? Math.round((goal.completedTasks / goal.totalTasks) * 100) : 0}
                          size="small"
                          strokeColor={{
                            '0%': goal.color || colors[i % colors.length],
                            '100%': colors[(i + 1) % colors.length],
                          }}
                          format={() => `✅ ${goal.completedTasks}/${goal.totalTasks}`}
                        />
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StatisticsPage;
