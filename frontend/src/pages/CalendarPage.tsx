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

    const todo = instances.filter((i) => i.status === 'TODO').length;
    const inProgress = instances.filter((i) => i.status === 'IN_PROGRESS').length;
    const completed = instances.filter((i) => i.status === 'COMPLETED').length;

    return (
      <div style={{ marginTop: 4 }}>
        {completed > 0 && <Badge count={completed} style={{ backgroundColor: '#A8D8B9', marginRight: 4 }} />}
        {inProgress > 0 && <Badge count={inProgress} style={{ backgroundColor: '#F7DC9C', marginRight: 4 }} />}
        {todo > 0 && <Badge count={todo} style={{ backgroundColor: '#E8E8E8' }} />}
      </div>
    );
  };

  const isOverdue = (date: string) => {
    return dayjs(date).isBefore(dayjs(), 'day');
  };

  const headerRender = ({ value, onChange }: { value: Dayjs; onChange: (d: Dayjs) => void }) => {
    const monthOptions = [];
    for (let i = 0; i < 12; i++) {
      monthOptions.push(i);
    }
    const year = value.year();
    const month = value.month();

    return (
      <Row justify="space-between" style={{ padding: '0 8px 16px' }} align="middle">
        <Col>
          <Button
            icon={<LeftOutlined />}
            type="text"
            onClick={() => onChange(value.subtract(1, 'month'))}
          />
        </Col>
        <Col>
          <span style={{ fontSize: 18, fontWeight: 500, margin: '0 16px', color: '#4A4A4A' }}>
            {year} 年 {month + 1} 月
          </span>
        </Col>
        <Col>
          <Button
            icon={<RightOutlined />}
            type="text"
            onClick={() => onChange(value.add(1, 'month'))}
          />
        </Col>
      </Row>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h2>打卡日历</h2>
        <p>查看每天的学习记录，点击日期查看详情</p>
      </div>

      <Card style={{ borderRadius: 16 }}>
        <Calendar
          value={currentMonth}
          onChange={(date) => setCurrentMonth(date)}
          cellRender={(date) => dateCellRender(date as Dayjs)}
          onSelect={(date) => handleDateSelect(date as Dayjs)}
          headerRender={headerRender}
        />
      </Card>

      <Modal
        title={`${selectedDate} 的任务`}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
      >
        {dateInstances.length === 0 ? (
          <Empty description="这天没有任务" />
        ) : (
          <List
            dataSource={dateInstances}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Popconfirm title="确定删除？" onConfirm={() => handleDeleteInstance(item.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={item.taskName}
                  description={
                    <div>
                      {item.goalName && <Tag>{item.goalName}</Tag>}
                      <Tag
                        color={
                          item.status === 'COMPLETED' ? 'success' :
                          item.status === 'IN_PROGRESS' ? 'warning' : 'default'
                        }
                      >
                        {item.status === 'TODO' ? '待开始' :
                         item.status === 'IN_PROGRESS' ? '进行中' : '已完成'}
                      </Tag>
                      {isOverdue(item.scheduledDate) && item.status !== 'COMPLETED' && (
                        <Tag color="error" className="overdue-tag">逾期</Tag>
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
