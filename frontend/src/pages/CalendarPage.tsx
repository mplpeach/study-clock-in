import React, { useState, useEffect } from 'react';
import {
  Card, Calendar, Badge, Modal, List, Tag, Button, message, Empty, Row, Col, Popconfirm,
} from 'antd';
import { DeleteOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { instanceApi } from '../api';
import type { TaskInstance } from '../api';

const CalendarPage: React.FC = () => {
  const [monthData, setMonthData] = useState<Record<string, TaskInstance[]>>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dateInstances, setDateInstances] = useState<TaskInstance[]>([]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(dayjs());

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
      const instances = await instanceApi.getByDate(dateStr);
      setDateInstances(instances);
      setDetailModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteInstance = async (id: number) => {
    try {
      await instanceApi.delete(id);
      message.success('已删除');
      fetchMonthData(currentMonth);
      const instances = await instanceApi.getByDate(selectedDate);
      setDateInstances(instances);
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
      <div style={{ marginTop: 4 }}>
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

  const isOverdue = (date: string) => {
    return dayjs(date).isBefore(dayjs(), 'day');
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
            onPanelChange={(date) => setCurrentMonth(date)}
            cellRender={(date) => dateCellRender(date as Dayjs)}
            onSelect={(date) => handleDateSelect(date as Dayjs)}
            headerRender={headerRender}
            fullscreen={false}
          />
        </div>
      </Card>

      <Modal
        className="cute-modal"
        title={<span style={{ color: '#5a3d4a' }}>📅 {selectedDate} 的任务</span>}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
      >
        {dateInstances.length === 0 ? (
          <Empty description="这天没有任务 🌸" />
        ) : (
          <List
            dataSource={dateInstances}
            renderItem={(item) => (
              <List.Item className="log-row"
                actions={[
                  <Popconfirm title="确定删除？" onConfirm={() => handleDeleteInstance(item.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={<span style={{ color: '#5a3d4a' }}>{item.taskName}</span>}
                  description={
                    <div>
                      {item.goalName && <Tag className="cute-tag" color="#a29bfe">{item.goalName}</Tag>}
                      <Tag className="cute-tag"
                        color={item.status === 'COMPLETED' ? '#2ed573' :
                               item.status === 'IN_PROGRESS' ? '#ffa502' : '#b8929e'}
                      >
                        {item.status === 'TODO' ? '待开始' :
                         item.status === 'IN_PROGRESS' ? '进行中' : '已完成'}
                      </Tag>
                      {isOverdue(item.scheduledDate) && item.status !== 'COMPLETED' && (
                        <Tag color="error" className="cute-tag overdue-pulse">逾期</Tag>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Modal>
    </div>
  );
};

export default CalendarPage;
