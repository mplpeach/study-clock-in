import React, { useState, useEffect } from 'react';
import {
  Card, Button, Modal, Form, Input, Select, TimePicker, message, Row, Col,
  Tag, Empty, Upload, List, Space, Typography,
} from 'antd';
import {
  PlayCircleOutlined, PauseCircleOutlined, PlusOutlined,
  HistoryOutlined, InboxOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { instanceApi, checkInApi, taskApi, goalApi } from '../api';
import type { TaskInstance, Goal } from '../api';

const { TextArea } = Input;
const { Dragger } = Upload;
const { Text } = Typography;

const emojiMap: Record<string, string> = {
  TODO: '📝',
  IN_PROGRESS: '⏳',
  COMPLETED: '✅',
};

const CheckInPage: React.FC = () => {
  const [todayInstances, setTodayInstances] = useState<TaskInstance[]>([]);
  const [overdueInstances, setOverdueInstances] = useState<TaskInstance[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeRecordId, setActiveRecordId] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [endRecordId, setEndRecordId] = useState<number | null>(null);
  const [endForm] = Form.useForm();
  const [endFiles, setEndFiles] = useState<File[]>([]);
  const [manualForm] = Form.useForm();
  const [manualFiles, setManualFiles] = useState<File[]>([]);
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
  const [newTaskForm] = Form.useForm();

  const today = dayjs().format('YYYY-MM-DD');

  const fetchData = async () => {
    try {
      const [instances, overdue, allGoals] = await Promise.all([
        instanceApi.getByDate(today),
        instanceApi.getOverdue(),
        goalApi.getAll(),
      ]);
      setTodayInstances(instances);
      setOverdueInstances(overdue);
      setGoals(allGoals);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    let timer: number;
    if (activeRecordId !== null) {
      timer = window.setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeRecordId]);

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = async (instanceId: number) => {
    try {
      const record = await checkInApi.start(instanceId);
      setActiveRecordId(record.id);
      setElapsed(0);
      message.success('开始学习！加油~ 💪');
      fetchData();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleEndOpen = (recordId: number) => {
    setEndRecordId(recordId);
    setEndFiles([]);
    endForm.resetFields();
    setEndModalOpen(true);
  };

  const handleEndSubmit = async () => {
    const values = await endForm.validateFields();
    try {
      await checkInApi.end(endRecordId!, {
        content: values.content,
        note: values.note,
      }, endFiles.length > 0 ? endFiles : undefined);
      message.success('学习完成！太棒了~ 🎉');
      setEndModalOpen(false);
      setActiveRecordId(null);
      fetchData();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleManualSubmit = async () => {
    const values = await manualForm.validateFields();
    const duration = values.durationHours * 60 + (values.durationMinutes || 0);
    try {
      await checkInApi.manual(values.taskInstanceId, {
        startTime: values.timeRange?.[0]?.format('YYYY-MM-DDTHH:mm:ss'),
        endTime: values.timeRange?.[1]?.format('YYYY-MM-DDTHH:mm:ss'),
        durationMinutes: duration,
        content: values.content,
        note: values.note,
      }, manualFiles.length > 0 ? manualFiles : undefined);
      message.success('打卡记录已保存~ 📝');
      setManualModalOpen(false);
      fetchData();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleQuickCreate = async () => {
    const values = await newTaskForm.validateFields();
    try {
      const task = await taskApi.create({ name: values.name, description: values.description });
      if (values.goalId) {
        await taskApi.bindToGoal(task.id, values.goalId);
      }
      await instanceApi.create(task.id, today);
      setNewTaskModalOpen(false);
      newTaskForm.resetFields();
      message.success('任务已创建，可以开始打卡了~ 🌟');
      fetchData();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#2ed573';
      case 'IN_PROGRESS': return '#ffa502';
      default: return '#b8929e';
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>📚 今日打卡</h2>
        <p>{today}</p>
      </div>

      {activeRecordId !== null && (
        <Card className="cute-card" style={{
          textAlign: 'center', marginBottom: 24,
          background: 'linear-gradient(135deg, #fff5f7, #fff0f6)',
          border: '2px solid #ffe0e6',
        }}>
          <Text style={{ fontSize: 14, color: '#b8929e' }}>⏳ 正在学习中</Text>
          <div className="timer-display" style={{ margin: '12px 0' }}>
            {formatElapsed(elapsed)}
          </div>
          <Button
            className="cute-btn-timer"
            type="primary"
            size="large"
            icon={<PauseCircleOutlined />}
            onClick={() => handleEndOpen(activeRecordId)}
            style={{ background: '#ff4757', borderColor: '#ff4757' }}
          >
            结束学习
          </Button>
        </Card>
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Button
            type="primary"
            ghost
            icon={<PlusOutlined />}
            block
            style={{ height: 48, borderColor: '#ff6b81', color: '#ff6b81' }}
            className="cute-btn"
            onClick={() => setNewTaskModalOpen(true)}
          >
            新建任务并打卡
          </Button>
        </Col>
        <Col span={12}>
          <Button
            icon={<HistoryOutlined />}
            block
            style={{ height: 48, borderColor: '#a29bfe', color: '#a29bfe' }}
            className="cute-btn"
            onClick={() => {
              manualForm.resetFields();
              setManualFiles([]);
              setManualModalOpen(true);
            }}
          >
            补录打卡
          </Button>
        </Col>
      </Row>

      {overdueInstances.length > 0 && (
        <Card className="cute-card" title={<span style={{ color: '#ff4757' }}>⚠️ 逾期未完成</span>}
          style={{ marginBottom: 16, borderColor: '#ff4757' }}>
          <List
            size="small"
            dataSource={overdueInstances}
            renderItem={(item) => (
              <List.Item className="log-row"
                actions={[
                  <Button className="cute-btn" type="primary" size="small"
                    style={{ background: '#ff6b81', borderColor: '#ff6b81' }}
                    onClick={() => handleStart(item.id)}>
                    开始补
                  </Button>,
                ]}
              >
                <Tag color="error" className="cute-tag overdue-pulse">逾期</Tag>
                <Text delete style={{ color: '#8c6f7a' }}>{item.taskName}</Text>
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12, color: '#b8929e' }}>
                  {item.scheduledDate}
                </Text>
              </List.Item>
            )}
          />
        </Card>
      )}

      <Card className="cute-card" title="📋 今日任务">
        {todayInstances.length === 0 ? (
          <Empty description="今天还没有任务，点击上方按钮创建一个吧~ 🌸" />
        ) : (
          <List
            dataSource={todayInstances}
            renderItem={(item) => (
              <List.Item className="log-row"
                actions={
                  item.status === 'TODO'
                    ? [
                      <Button
                        className="cute-btn"
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        disabled={activeRecordId !== null}
                        onClick={() => handleStart(item.id)}
                      >
                        开始学习
                      </Button>,
                    ]
                    : item.status === 'IN_PROGRESS'
                      ? [
                        <Button
                          className="cute-btn-timer"
                          type="primary"
                          icon={<PauseCircleOutlined />}
                          onClick={() => handleEndOpen(activeRecordId!)}
                          style={{ background: '#ffa502', borderColor: '#ffa502' }}
                        >
                          结束学习
                        </Button>,
                      ]
                      : [
                        <Tag className="cute-tag" color="success" style={{ padding: '4px 12px' }}>
                          已完成 ✓
                        </Tag>,
                      ]
                }
              >
                <List.Item.Meta
                  avatar={
                    <span style={{ fontSize: 20 }}>{emojiMap[item.status] || '📝'}</span>
                  }
                  title={
                    <Space>
                      <span style={{ color: '#5a3d4a', fontWeight: 600 }}>{item.taskName}</span>
                      {item.goalName && <Tag className="cute-tag" color="#a29bfe" style={{ fontSize: 11 }}>{item.goalName}</Tag>}
                    </Space>
                  }
                  description={
                    <span style={{ color: getStatusColor(item.status) }}>
                      {item.status === 'TODO' ? '待开始' :
                       item.status === 'IN_PROGRESS' ? '进行中' : '已完成'}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Modal className="cute-modal" title="🎉 结束学习" open={endModalOpen}
        onOk={handleEndSubmit} onCancel={() => setEndModalOpen(false)}>
        <Form form={endForm} layout="vertical">
          <Form.Item name="content" label="📖 学了什么">
            <TextArea className="cute-input" rows={3} placeholder="描述今天的学习内容" />
          </Form.Item>
          <Form.Item name="note" label="💭 学习心得">
            <TextArea className="cute-input" rows={3} placeholder="记录你的心得与收获" />
          </Form.Item>
          <Form.Item label="🖼️ 添加图片">
            <Dragger
              multiple
              beforeUpload={(file) => { setEndFiles((prev) => [...prev, file]); return false; }}
              onRemove={(f: any) => setEndFiles((prev) => prev.filter((x) => x !== f))}
            >
              <p><InboxOutlined style={{ color: '#ff6b81' }} /></p>
              <p>点击或拖拽上传图片</p>
            </Dragger>
          </Form.Item>
        </Form>
      </Modal>

      <Modal className="cute-modal" title="📝 补录打卡" open={manualModalOpen}
        onOk={handleManualSubmit} onCancel={() => setManualModalOpen(false)} width={560}>
        <Form form={manualForm} layout="vertical">
          <Form.Item name="taskInstanceId" label="选择任务" rules={[{ required: true }]}>
            <Select placeholder="选择或搜索任务" showSearch className="cute-input">
              {todayInstances.map((inst) => (
                <Select.Option key={inst.id} value={inst.id}>{inst.taskName}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="timeRange" label="学习时间段">
            <TimePicker.RangePicker format="HH:mm" style={{ width: '100%' }} className="cute-input" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="durationHours" label="时长（小时）">
                <Input type="number" min={0} placeholder="0" className="cute-input" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="durationMinutes" label="时长（分钟）">
                <Input type="number" min={0} placeholder="0" className="cute-input" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="content" label="学习内容">
            <TextArea className="cute-input" rows={2} />
          </Form.Item>
          <Form.Item name="note" label="学习心得">
            <TextArea className="cute-input" rows={2} />
          </Form.Item>
          <Form.Item label="🖼️ 添加图片">
            <Dragger
              multiple
              beforeUpload={(file) => { setManualFiles((prev) => [...prev, file]); return false; }}
              onRemove={(f: any) => setManualFiles((prev) => prev.filter((x) => x !== f))}
            >
              <p><InboxOutlined style={{ color: '#ff6b81' }} /></p>
              <p>点击或拖拽上传图片</p>
            </Dragger>
          </Form.Item>
        </Form>
      </Modal>

      <Modal className="cute-modal" title="✨ 新建任务" open={newTaskModalOpen}
        onOk={handleQuickCreate} onCancel={() => setNewTaskModalOpen(false)}>
        <Form form={newTaskForm} layout="vertical">
          <Form.Item name="name" label="任务名称" rules={[{ required: true }]}>
            <Input className="cute-input" placeholder="例如：刷LeetCode一章" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea className="cute-input" rows={2} />
          </Form.Item>
          <Form.Item name="goalId" label="关联目标">
            <Select placeholder="选择目标（可选）" allowClear className="cute-input">
              {goals.map((g) => (
                <Select.Option key={g.id} value={g.id}>{g.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CheckInPage;
