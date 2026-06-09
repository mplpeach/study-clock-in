import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spin, Empty } from 'antd';
import ReactEChartsCore from 'echarts-for-react';
import dayjs from 'dayjs';
import { getEffectiveToday } from '../utils/date';
import { statisticsApi } from '../api';
import type { Statistics } from '../api';

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

  // 本周概览
  const today = getEffectiveToday();
  const monday = today.startOf('week').add(1, 'day'); // dayjs startOf('week') = Sunday
  const sunday = monday.add(6, 'day');
  const weekStats = (() => {
    const thisWeek = stats.dailyStats.filter((d) => {
      const date = dayjs(d.date);
      return date.isAfter(monday.subtract(1, 'day')) && date.isBefore(sunday.add(1, 'day'));
    });

    const weekDays = thisWeek.length;
    const weekDuration = thisWeek.reduce((sum, d) => sum + d.durationMinutes, 0);
    const avgPerDay = weekDays > 0 ? Math.round(weekDuration / weekDays) : 0;

    return { weekDays, weekDuration, avgPerDay };
  })();

  // 打卡日历热力图
  const heatmapOption = {
    tooltip: { trigger: 'item', formatter: (params: any) => `${params.value[0]}: ${params.value[1]} 分钟` },
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
      yearLabel: { position: 'top', color: '#b8929e', fontSize: 30 },
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
        type: 'line',
        data: stats.dailyStats.map((d) => d.durationMinutes).reverse(),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#ff6b81', width: 2 },
        itemStyle: { color: '#ff6b81' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 107, 129, 0.3)' },
              { offset: 1, color: 'rgba(255, 107, 129, 0.02)' },
            ],
          },
        },
      },
    ],
  };

  return (
    <div>
      <div className="page-header">
        <h2>📊 学习统计</h2>
        <p>你的学习成果总览</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 36, flexShrink: 0,
          background: '#fff', borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          writingMode: 'vertical-rl', fontSize: 13, fontWeight: 600,
          color: '#b8929e', letterSpacing: 4,
          boxShadow: '0 4px 16px rgba(255, 107, 129, 0.08)',
          border: '2px solid #ffe0e6',
        }}>
          累计概览
        </div>
        <Row gutter={[16, 16]} style={{ flex: 1, marginBottom: 0 }}>
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
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{
          width: 36, flexShrink: 0,
          background: '#fff', borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          writingMode: 'vertical-rl', fontSize: 13, fontWeight: 600,
          color: '#b8929e', letterSpacing: 4,
          boxShadow: '0 4px 16px rgba(255, 107, 129, 0.08)',
          border: '2px solid #ffe0e6',
        }}>
          本周概览
        </div>
        <Row gutter={[16, 16]} style={{ flex: 1, marginBottom: 0 }}>
        {[
          { icon: '📅', label: '本周学习天数', value: `${weekStats.weekDays} 天`, variant: 'pink' as const },
          { icon: '⏱️', label: '本周总时长', value: formatDuration(weekStats.weekDuration), variant: 'orange' as const },
          { icon: '📊', label: '日均学习时长', value: formatDuration(weekStats.avgPerDay), variant: 'green' as const },
          { icon: '✅', label: '本周完成任务', value: `${stats.weeklyCompletedTasks} 个`, variant: 'purple' as const },
        ].map((card) => (
          <Col span={6} key={card.label}>
            <Card className={`stat-card ${card.variant}`} styles={{ body: { padding: '20px' } }}>
              <div className="stat-top-bar" />
              <div className="stat-icon">{card.icon}</div>
              <div className="stat-value">{card.value}</div>
              <div className="stat-label">{card.label}</div>
            </Card>
          </Col>
        ))}
        </Row>
      </div>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card className="cute-card" title={<span style={{ color: '#5a3d4a' }}>📆 学习日历</span>}>
            <ReactEChartsCore option={heatmapOption} style={{ height: 200 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card className="cute-card"
            title={<span style={{ color: '#5a3d4a' }}>📈 每日学习时长趋势</span>}>
            <ReactEChartsCore option={lineOption} style={{ height: 220 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StatisticsPage;
