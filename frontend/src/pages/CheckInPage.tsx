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
      message.success('开始学习！加油~');
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
      message.success('学习完成！太棒了~');
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
      message.success('打卡记录已保存~');
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
      message.success('任务已创建，可以开始打卡了~');
      fetchData();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const getInstanceColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#A8D8B9';
      case 'IN_PROGRESS': return '#F7DC9C';
      default: return '#E8E8E8';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'TODO': return '待开始';
      case 'IN_PROGRESS': return '进行中';
      case 'COMPLETED': return '已完成';
      default: return status;
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>今日打卡</h2>
        <p>{today}</p>
      </div>

      {activeRecordId !== null && (
        <Card style={{ textAlign: 'center', marginBottom: 24, background: '#FFF8E7' }}>
          <Text style={{ fontSize: 14, color: '#999' }}>正在学习中</Text>
          <div style={{ fontSize: 48, fontWeight: 'bold', color: '#9DC8C8', margin: '12px 0' }}>
            {formatElapsed(elapsed)}
          </div>
          <Button
            type="primary"
            size="large"
            icon={<PauseCircleOutlined />}
            onClick={() => handleEndOpen(activeRecordId)}
            style={{ background: '#F4A7A7', borderColor: '#F4A7A7' }}
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
            style={{ height: 48 }}
            onClick={() => setNewTaskModalOpen(true)}
          >
            新建任务并打卡
          </Button>
        </Col>
        <Col span={12}>
          <Button
            icon={<HistoryOutlined />}
            block
            style={{ height: 48 }}
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
        <Card title="⚠️ 逾期未完成" style={{ marginBottom: 16, borderColor: '#F4A7A7' }}>
          <List
            size="small"
            dataSource={overdueInstances}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button type="link" size="small" onClick={() => handleStart(item.id)}>
                    开始补
                  </Button>,
                ]}
              >
                <Tag color="error">逾期</Tag>
                <Text delete>{item.taskName}</Text>
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  {item.scheduledDate}
                </Text>
              </List.Item>
            )}
          />
        </Card>
      )}

      <Card title="今日任务">
        {todayInstances.length === 0 ? (
          <Empty description="今天还没有任务，点击上方按钮创建一个吧~" />
        ) : (
          <List
            dataSource={todayInstances}
            renderItem={(item) => (
              <List.Item
                actions={
                  item.status === 'TODO'
                    ? [
                      <Button
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
                          type="primary"
                          icon={<PauseCircleOutlined />}
                          onClick={() => handleEndOpen(activeRecordId!)}
                        >
                          结束学习
                        </Button>,
                      ]
                      : [
                        <Tag color="success" style={{ padding: '4px 12px' }}>已完成 ✓</Tag>,
                      ]
                }
              >
                <List.Item.Meta
                  avatar={
                    <div
                      style={{
                        width: 12, height: 12, borderRadius: '50%',
                        background: getInstanceColor(item.status), marginTop: 6,
                      }}
                    />
                  }
                  title={
                    <Space>
                      {item.taskName}
                      {item.goalName && <Tag style={{ fontSize: 11 }}>{item.goalName}</Tag>}
                    </Space>
                  }
                  description={getStatusText(item.status)}
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* 结束打卡弹窗 */}
      <Modal title="结束学习" open={endModalOpen} onOk={handleEndSubmit} onCancel={() => setEndModalOpen(false)}>
        <Form form={endForm} layout="vertical">
          <Form.Item name="content" label="学了什么">
            <TextArea rows={3} placeholder="描述今天的学习内容" />
          </Form.Item>
          <Form.Item name="note" label="学习心得">
            <TextArea rows={3} placeholder="记录你的心得与收获" />
          </Form.Item>
          <Form.Item label="添加图片">
            <Dragger
              multiple
              beforeUpload={(file) => { setEndFiles((prev) => [...prev, file]); return false; }}
              onRemove={(f: any) => setEndFiles((prev) => prev.filter((x) => x !== f))}
            >
              <p><InboxOutlined /></p>
              <p>点击或拖拽上传图片</p>
            </Dragger>
          </Form.Item>
        </Form>
      </Modal>

      {/* 补录打卡弹窗 */}
      <Modal title="补录打卡" open={manualModalOpen} onOk={handleManualSubmit} onCancel={() => setManualModalOpen(false)} width={560}>
        <Form form={manualForm} layout="vertical">
          <Form.Item name="taskInstanceId" label="选择任务" rules={[{ required: true }]}>
            <Select
              placeholder="选择或搜索任务"
              showSearch
            >
              {todayInstances.map((inst) => (
                <Select.Option key={inst.id} value={inst.id}>{inst.taskName}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="timeRange" label="学习时间段">
            <TimePicker.RangePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="durationHours" label="时长（小时）">
                <Input type="number" min={0} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="durationMinutes" label="时长（分钟）">
                <Input type="number" min={0} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="content" label="学习内容">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="note" label="学习心得">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item label="添加图片">
            <Dragger
              multiple
              beforeUpload={(file) => { setManualFiles((prev) => [...prev, file]); return false; }}
              onRemove={(f: any) => setManualFiles((prev) => prev.filter((x) => x !== f))}
            >
              <p><InboxOutlined /></p>
              <p>点击或拖拽上传图片</p>
            </Dragger>
          </Form.Item>
        </Form>
      </Modal>

      {/* 新建任务弹窗 */}
      <Modal title="新建任务" open={newTaskModalOpen} onOk={handleQuickCreate} onCancel={() => setNewTaskModalOpen(false)}>
        <Form form={newTaskForm} layout="vertical">
          <Form.Item name="name" label="任务名称" rules={[{ required: true }]}>
            <Input placeholder="例如：刷LeetCode一章" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="goalId" label="关联目标">
            <Select placeholder="选择目标（可选）" allowClear>
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
