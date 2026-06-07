import React, { useState, useEffect, useRef } from 'react';
import {
  Card, Calendar, Badge, Modal, Tag, Button, message, Empty, Row, Col, Popover,
} from 'antd';
import { DeleteOutlined, LeftOutlined, RightOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { instanceApi, checkInApi } from '../api';
import type { TaskInstance, TimelineEntry } from '../api';

const CalendarPage: React.FC = () => {
  const [monthData, setMonthData] = useState<Record<string, TaskInstance[]>>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const panelChanging = useRef(false);

  const fetchMonthData = async (date: Dayjs) => {
    try {
      const data = await instanceApi.getCalendar(date.year(), date.month() + 1);
      setMonthData(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMonthData(currentMonth);
  }, [currentMonth]);

  const handleDateSelect = async (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    setSelectedDate(dateStr);
    try {
      const entries = await checkInApi.getTimeline(dateStr);
      setTimelineEntries(entries);
      setDetailModalOpen(true);
    } catch (e) {
      console.error(e);
      message.error('加载时间线数据失败');
    }
  };

  const handleDeleteInstance = async (id: number) => {
    try {
      await instanceApi.delete(id);
      message.success('已删除');
      fetchMonthData(currentMonth);
      if (detailModalOpen) {
        const entries = await checkInApi.getTimeline(selectedDate);
        setTimelineEntries(entries);
      }
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const dateCellRender = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    const instances = monthData[dateStr];
    if (!instances || instances.length === 0) return null;

    const completed = instances.filter((i) => i.status === 'COMPLETED').length;

    return (
      <div>
        {completed > 0 ? (
          <Badge count={completed} style={{
            backgroundColor: '#ff6b81',
            boxShadow: '0 2px 8px rgba(255, 107, 129, 0.3)',
          }} />
        ) : (
          <span style={{
            display: 'inline-block',
            width: 8, height: 8,
            borderRadius: '50%',
            background: '#ff6b81',
            opacity: 0.4,
          }} />
        )}
      </div>
    );
  };

  const formatMinutes = (mins: number) => {
    if (mins < 60) return `${mins}分钟`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}小时${m}分钟` : `${h}小时`;
  };

  const headerRender = ({ value, onChange }: { value: Dayjs; onChange: (d: Dayjs) => void }) => {
    return (
      <Row justify="space-between" style={{ padding: '0 8px 16px' }} align="middle">
        <Col>
          <Button
            icon={<LeftOutlined />}
            type="text"
            className="cute-btn"
            onClick={(e) => {
              e.stopPropagation();
              onChange(value.subtract(1, 'month'));
            }}
          />
        </Col>
        <Col>
          <span style={{ fontSize: 18, fontWeight: 600, color: '#5a3d4a' }}>
            {value.year()} 年 {value.month() + 1} 月
          </span>
        </Col>
        <Col>
          <Button
            icon={<RightOutlined />}
            type="text"
            className="cute-btn"
            onClick={(e) => {
              e.stopPropagation();
              onChange(value.add(1, 'month'));
            }}
          />
        </Col>
      </Row>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h2>📅 打卡日历</h2>
        <p>查看每天的学习记录，点击日期查看详情</p>
      </div>

      <Card className="cute-card">
        <div className="cute-calendar">
          <Calendar
            value={currentMonth}
            onPanelChange={(date) => {
              panelChanging.current = true;
              setCurrentMonth(date);
            }}
            cellRender={(date) => dateCellRender(date as Dayjs)}
            onSelect={(date) => {
              if (panelChanging.current) {
                panelChanging.current = false;
                return;
              }
              handleDateSelect(date as Dayjs);
            }}
            headerRender={headerRender}
            fullscreen={false}
          />
        </div>
      </Card>

      <Modal
        className="cute-modal"
        centered
        title={
          <span style={{ color: '#5a3d4a' }}>
            <ClockCircleOutlined style={{ marginRight: 8, color: '#ff6b81' }} />
            {selectedDate} 学习时间线
          </span>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={640}
      >
        {timelineEntries.length === 0 ? (
          <Empty description="这天没有学习记录 🌸" />
        ) : (
          <div className="timeline-scroll">
            <div className="timeline-container">
              {timelineEntries.map((entry, i) => (
                <div key={entry.recordId} className={`timeline-item ${i % 2 === 0 ? 'left' : 'right'}`}>
                  <div className="timeline-dot" style={{ background: entry.goalColors[0] || '#ff6b81' }} />
                  <div className="timeline-card">
                    <div className="timeline-time">
                      {dayjs(entry.startTime).format('HH:mm')}
                      {' — '}
                      {entry.endTime
                        ? dayjs(entry.endTime).format('HH:mm')
                        : <span className="active-badge">进行中</span>
                      }
                    </div>
                    <div className="timeline-task-name">{entry.taskName}</div>
                    <div className="timeline-meta">
                      {entry.goalNames.length > 0 && (
                        <>
                          {entry.goalNames.slice(0, 2).map((name, idx) => (
                            <Tag key={idx} className="cute-tag" color="#a29bfe" style={{ fontSize: 11 }}>{name}</Tag>
                          ))}
                          {entry.goalNames.length > 2 && (
                            <Popover
                              content={
                                <div style={{ maxWidth: 200 }}>
                                  {entry.goalNames.map((name, idx) => (
                                    <Tag key={idx} className="cute-tag" color="#a29bfe" style={{ marginBottom: 4 }}>{name}</Tag>
                                  ))}
                                </div>
                              }
                              trigger="hover"
                            >
                              <Tag className="cute-tag" color={entry.goalColors[0] || '#ff6b81'} style={{ fontSize: 11, cursor: 'pointer' }}>
                                +{entry.goalNames.length - 2}
                              </Tag>
                            </Popover>
                          )}
                        </>
                      )}
                      <span className="timeline-duration">{formatMinutes(entry.durationMinutes)}</span>
                    </div>
                    {entry.content && (
                      <div className="timeline-content">{entry.content}</div>
                    )}
                  </div>
                  <div style={{ marginTop: 4, textAlign: i % 2 === 0 ? 'right' : 'left' }}>
                    <Button type="text" danger size="small" icon={<DeleteOutlined />}
                      onClick={() => {
                        Modal.confirm({
                          icon: <DeleteOutlined style={{ color: '#ff6b81' }} />,
                          title: '确定删除这条任务吗？',
                          className: 'cute-modal',
                          centered: true,
                          okText: '确定',
                          cancelText: '取消',
                          okButtonProps: { danger: true, style: { borderRadius: 20 } },
                          cancelButtonProps: { style: { borderRadius: 20 } },
                          onOk: () => handleDeleteInstance(entry.taskInstanceId),
                        });
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CalendarPage;
