import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Card, Button, Modal, Form, Input, Select, TimePicker, message, Row, Col,
  Tag, Empty, Upload, List, Space, Typography, Popconfirm,
} from 'antd';
import {
  PlayCircleOutlined, PauseCircleOutlined,
  HistoryOutlined, InboxOutlined, DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { instanceApi, checkInApi, taskApi, goalApi } from '../api';
import type { TaskInstance, Task, Goal } from '../api';

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
  const [tasks, setTasks] = useState<Task[]>([]);

  const [activeInstanceId, setActiveInstanceId] = useState<number | null>(null);
  const [activeRecordId, setActiveRecordId] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [accumulatedElapsed, setAccumulatedElapsed] = useState(0);
  const timerRef = useRef(0);

  const [startModalOpen, setStartModalOpen] = useState(false);
  const [startTaskType, setStartTaskType] = useState<'existing' | 'new'>('existing');
  const [startForm] = Form.useForm();

  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [pauseForm] = Form.useForm();

  const [endModalOpen, setEndModalOpen] = useState(false);
  const [endRecordId, setEndRecordId] = useState<number | null>(null);
  const [endForm] = Form.useForm();
  const [endFiles, setEndFiles] = useState<File[]>([]);

  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualTaskType, setManualTaskType] = useState<'existing' | 'new'>('existing');
  const [manualForm] = Form.useForm();
  const [manualFiles, setManualFiles] = useState<File[]>([]);

  const today = dayjs().format('YYYY-MM-DD');

  const fetchData = async () => {
    try {
      const [instances, overdue, allGoals, allTasks] = await Promise.all([
        instanceApi.getByDate(today),
        instanceApi.getOverdue(),
        goalApi.getAll(),
        taskApi.getAll(),
      ]);
      setTodayInstances(instances);
      setOverdueInstances(overdue);
      setGoals(allGoals);
      setTasks(allTasks);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const statusOrder: Record<string, number> = { IN_PROGRESS: 0, TODO: 1, COMPLETED: 2 };
  const sortedInstances = useMemo(
    () => [...todayInstances].sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)),
    [todayInstances]
  );

  const timerDisplay = accumulatedElapsed + elapsed;

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = 0;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = window.setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  }, [stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const clearActive = useCallback(() => {
    setActiveInstanceId(null);
    setActiveRecordId(null);
    setElapsed(0);
    setAccumulatedElapsed(0);
    stopTimer();
  }, [stopTimer]);

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const resolveInstance = async (taskId: number) => {
    let instance = todayInstances.find((i) => i.taskId === taskId);
    if (!instance) {
      instance = await instanceApi.create(taskId, today);
    }
    return instance;
  };

  const availableTasks = tasks.filter((t) => {
    const inst = todayInstances.find((i) => i.taskId === t.id);
    return !inst || inst.status !== 'COMPLETED';
  });

  // ===== 开始学习 =====
  const handleStartSubmit = async () => {
    const values = await startForm.validateFields();
    let taskId: number;

    if (startTaskType === 'existing') {
      taskId = values.taskId;
    } else {
      const task = await taskApi.create({ name: values.name, description: values.description });
      if (values.goalId) {
        await taskApi.bindToGoal(task.id, values.goalId);
      }
      taskId = task.id;
    }

    const instance = await resolveInstance(taskId);
    const record = await checkInApi.start(instance.id);
    setActiveInstanceId(instance.id);
    setActiveRecordId(record.id);
    setElapsed(0);
    setAccumulatedElapsed(0);
    startTimer();
    message.success('开始学习！加油~ 💪');
    setStartModalOpen(false);
    startForm.resetFields();
    fetchData();
  };

  const openStartModal = () => {
    setStartTaskType('existing');
    startForm.resetFields();
    setStartModalOpen(true);
  };

  // ===== 继续学习（从已暂停/进行中的实例恢复） =====
  const handleResume = async (instanceId: number) => {
    try {
      const records = await checkInApi.getByInstance(instanceId);
      const totalSeconds = records.reduce((sum, r) => {
        // 优先用精确的 startTime/endTime 差值，避免 durationMinutes 截断丢精度
        if (r.startTime && r.endTime) {
          return sum + dayjs(r.endTime).diff(dayjs(r.startTime), 'second');
        }
        if (r.durationMinutes) return sum + r.durationMinutes * 60;
        return sum;
      }, 0);

      const record = await checkInApi.start(instanceId);
      setActiveInstanceId(instanceId);
      setActiveRecordId(record.id);
      setElapsed(0);
      setAccumulatedElapsed(totalSeconds);
      startTimer();
      message.success('继续学习！加油~ 💪');
      fetchData();
    } catch (e: any) { message.error(e.message); }
  };

  const doStartInstance = async (instanceId: number) => {
    try {
      const record = await checkInApi.start(instanceId);
      setActiveInstanceId(instanceId);
      setActiveRecordId(record.id);
      setElapsed(0);
      setAccumulatedElapsed(0);
      startTimer();
      message.success('开始学习！加油~ 💪');
      fetchData();
    } catch (e: any) { message.error(e.message); }
  };

  const handleDeleteInstance = async (instanceId: number) => {
    try {
      await instanceApi.delete(instanceId);
      message.success('任务已删除');
      fetchData();
    } catch (e: any) { message.error(e.message); }
  };

  // ===== 暂停（提交内容 + 时长，但不完成实例） =====
  const handlePause = async () => {
    stopTimer();
    pauseForm.resetFields();
    // 拉取之前的记录，回显上一次的学习内容
    try {
      const records = await checkInApi.getByInstance(activeInstanceId!);
      const prev = records.filter((r) => r.id !== activeRecordId);
      // 取最新一条有内容的记录（用户可能在多次暂停中追加修改）
      const lastContent = [...prev].reverse().find((r) => r.content)?.content;
      if (lastContent) {
        pauseForm.setFieldsValue({ content: lastContent });
      }
    } catch (e) { /* 非关键，静默失败 */ }
    setPauseModalOpen(true);
  };

  const handlePauseSubmit = async () => {
    const values = await pauseForm.validateFields();
    await checkInApi.end(activeRecordId!, {
      content: values.content,
      complete: false,
      durationSeconds: elapsed,
    });
    message.success('已记录学习内容~ 📝');
    setPauseModalOpen(false);
    clearActive();
    fetchData();
  };

  // ===== 结束学习（完成实例） =====
  const handleEndOpen = async () => {
    stopTimer();
    setEndRecordId(activeRecordId);
    setEndFiles([]);
    endForm.resetFields();
    // 拉取之前的记录，回显学习内容和心得
    try {
      const records = await checkInApi.getByInstance(activeInstanceId!);
      const prev = records.filter((r) => r.id !== activeRecordId);
      // 取最新一条有内容的记录
      const lastContent = [...prev].reverse().find((r) => r.content)?.content;
      const lastNote = [...prev].reverse().find((r) => r.note)?.note;
      if (lastContent || lastNote) {
        endForm.setFieldsValue({
          content: lastContent || '',
          note: lastNote || '',
        });
      }
    } catch (e) { /* 非关键，静默失败 */ }
    setEndModalOpen(true);
  };

  const handleEndSubmit = async () => {
    const values = await endForm.validateFields();
    await checkInApi.end(endRecordId!, {
      content: values.content,
      note: values.note,
      complete: true,
      durationSeconds: elapsed,
    }, endFiles.length > 0 ? endFiles : undefined);
    message.success('学习完成！太棒了~ 🎉');
    setEndModalOpen(false);
    clearActive();
    fetchData();
  };

  // ===== 补录打卡 =====
  const handleManualSubmit = async () => {
    const values = await manualForm.validateFields();
    let taskId: number;

    if (manualTaskType === 'existing') {
      taskId = values.taskId;
    } else {
      const task = await taskApi.create({ name: values.name, description: values.description });
      if (values.goalId) {
        await taskApi.bindToGoal(task.id, values.goalId);
      }
      taskId = task.id;
    }

    const instance = await resolveInstance(taskId);
    const startTime = values.timeRange?.[0];
    const endTime = values.timeRange?.[1];
    const durationMinutes = startTime && endTime ? endTime.diff(startTime, 'minute') : 0;
    await checkInApi.manual(instance.id, {
      startTime: startTime?.format('YYYY-MM-DDTHH:mm:ss'),
      endTime: endTime?.format('YYYY-MM-DDTHH:mm:ss'),
      durationMinutes,
      content: values.content,
      note: values.note,
    }, manualFiles.length > 0 ? manualFiles : undefined);

    message.success('打卡记录已保存~ 📝');
    setManualModalOpen(false);
    manualForm.resetFields();
    setManualFiles([]);
    fetchData();
  };

  const openManualModal = () => {
    setManualTaskType('existing');
    manualForm.resetFields();
    setManualFiles([]);
    setManualModalOpen(true);
  };

  // ===== 共享任务选择区 =====
  const renderTaskPicker = (
    taskType: 'existing' | 'new',
    onTypeChange: (v: 'existing' | 'new') => void,
  ) => (
    <>
      <Form.Item label="选择方式" style={{ marginBottom: 12 }}>
        <Select
          className="cute-input"
          value={taskType}
          onChange={(value) => onTypeChange(value as 'existing' | 'new')}
          options={[
            { label: '已有任务', value: 'existing' },
            { label: '新建任务', value: 'new' },
          ]}
        />
      </Form.Item>

      {taskType === 'existing' ? (
        <Form.Item name="taskId" label="选择任务" rules={[{ required: true, message: '请选择任务' }]}>
          <Select placeholder="选择或搜索任务" showSearch className="cute-input"
            filterOption={(input, option) =>
              (option?.label as string || '').toLowerCase().includes(input.toLowerCase())
            }
            options={availableTasks.map((t) => ({ label: t.name, value: t.id }))}
            notFoundContent="没有可用的任务"
          />
        </Form.Item>
      ) : (
        <>
          <Form.Item name="name" label="任务名称" rules={[{ required: true, message: '请输入任务名称' }]}>
            <Input className="cute-input" placeholder="例如：刷LeetCode一章" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea className="cute-input" rows={2} />
          </Form.Item>
          <Form.Item name="goalId" label="关联目标">
            <Select placeholder="选择目标（可选）" allowClear className="cute-input">
              {goals.map((g) => <Select.Option key={g.id} value={g.id}>{g.name}</Select.Option>)}
            </Select>
          </Form.Item>
        </>
      )}
    </>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#2ed573';
      case 'IN_PROGRESS': return '#ffa502';
      default: return '#b8929e';
    }
  };

  // 判断当前活跃任务是否就是这个实例
  const isActiveInstance = (instanceId: number) =>
    activeInstanceId === instanceId && activeRecordId !== null;

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
            {formatElapsed(timerDisplay)}
          </div>
          <Space>
            <Button
              className="cute-btn-timer"
              size="large"
              icon={<PauseCircleOutlined />}
              onClick={handlePause}
              style={{ borderColor: '#ffa502', color: '#ffa502' }}
            >
              暂停
            </Button>
            <Button
              className="cute-btn-timer"
              type="primary"
              size="large"
              danger
              onClick={handleEndOpen}
              style={{ background: '#ff4757', borderColor: '#ff4757' }}
            >
              结束学习
            </Button>
          </Space>
        </Card>
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Button
            type="primary"
            ghost
            icon={<PlayCircleOutlined />}
            block
            style={{ height: 48, borderColor: '#ff6b81', color: '#ff6b81' }}
            className="cute-btn"
            onClick={openStartModal}
            disabled={activeRecordId !== null}
          >
            开始学习
          </Button>
        </Col>
        <Col span={12}>
          <Button
            icon={<HistoryOutlined />}
            block
            style={{ height: 48, borderColor: '#a29bfe', color: '#a29bfe' }}
            className="cute-btn"
            onClick={openManualModal}
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
                    onClick={() => openStartModal()}>
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
          <Empty description="今天还没有任务，点击上方按钮开始学习吧~ 🌸" />
        ) : (
          <List
            dataSource={sortedInstances}
            renderItem={(item) => (
              <List.Item className="log-row"
                actions={
                  isActiveInstance(item.id)
                    ? []
                    : [
                        ...(item.status === 'TODO'
                          ? [
                            <Button
                              className="cute-btn"
                              type="primary"
                              icon={<PlayCircleOutlined />}
                              disabled={activeRecordId !== null}
                              key="start"
                              onClick={() => doStartInstance(item.id)}
                            >
                              开始学习
                            </Button>,
                          ]
                          : item.status === 'IN_PROGRESS'
                          ? [
                            <Button
                              className="cute-btn"
                              type="primary"
                              icon={<PlayCircleOutlined />}
                              key="resume"
                              onClick={() => handleResume(item.id)}
                            >
                              继续学习
                            </Button>,
                          ]
                          : [
                            <Tag className="cute-tag" color="success" style={{ padding: '4px 12px' }} key="done">
                              已完成 ✓
                            </Tag>,
                          ]),
                        <Popconfirm
                          key="delete"
                          title="确定删除这条任务吗？"
                          onConfirm={() => handleDeleteInstance(item.id)}
                        >
                          <Button
                            type="link"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                          />
                        </Popconfirm>,
                      ]
                }
              >
                <List.Item.Meta
                  avatar={
                    <span style={{ fontSize: 20 }}>{isActiveInstance(item.id) ? '⏳' : emojiMap[item.status] || '📝'}</span>
                  }
                  title={
                    <Space>
                      <span style={{ color: '#5a3d4a', fontWeight: 600 }}>{item.taskName}</span>
                      {item.goalName && <Tag className="cute-tag" color="#a29bfe" style={{ fontSize: 11 }}>{item.goalName}</Tag>}
                    </Space>
                  }
                  description={
                    <span style={{ color: getStatusColor(item.status) }}>
                      {isActiveInstance(item.id)
                        ? `进行中 ${formatElapsed(timerDisplay)}`
                        : item.status === 'TODO' ? '待开始'
                        : item.status === 'IN_PROGRESS' ? '进行中'
                        : '已完成'}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* ===== 开始学习 Modal ===== */}
      <Modal className="cute-modal" title="▶️ 开始学习" open={startModalOpen}
        onOk={handleStartSubmit} onCancel={() => setStartModalOpen(false)}
        okText="开始学习">
        <Form form={startForm} layout="vertical">
          {renderTaskPicker(startTaskType, setStartTaskType)}
        </Form>
      </Modal>

      {/* ===== 暂停 Modal ===== */}
      <Modal className="cute-modal" title="⏸️ 暂停学习" open={pauseModalOpen}
        onOk={handlePauseSubmit} onCancel={() => {
          setPauseModalOpen(false);
          startTimer();
        }}
        okText="提交">
        <Form form={pauseForm} layout="vertical">
          <Form.Item name="content" label="📖 学了什么">
            <TextArea className="cute-input" rows={4} placeholder="记录一下刚刚学了什么..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== 结束学习 Modal ===== */}
      <Modal className="cute-modal" title="🎉 结束学习" open={endModalOpen}
        onOk={handleEndSubmit} onCancel={() => {
          setEndModalOpen(false);
          startTimer();
        }}>
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

      {/* ===== 补录打卡 Modal ===== */}
      <Modal className="cute-modal" title="📝 补录打卡" open={manualModalOpen}
        onOk={handleManualSubmit} onCancel={() => setManualModalOpen(false)} width={560}
        okText="补录打卡">
        <Form form={manualForm} layout="vertical">
          {renderTaskPicker(manualTaskType, (v) => {
            setManualTaskType(v);
            manualForm.resetFields();
          })}

          <Form.Item name="timeRange" label="学习时间段" style={{ marginBottom: 12 }}>
            <TimePicker.RangePicker
              format="HH:mm"
              style={{ width: '100%' }}
              className="cute-input"
              changeOnBlur
              needConfirm
              disabledTime={(date, type) => {
                if (type === 'end') {
                  const now = dayjs();
                  const currentHour = now.hour();
                  const currentMinute = now.minute();
                  if (!date || date.isSame(now, 'day')) {
                    return {
                      disabledHours: () => {
                        const hours: number[] = [];
                        for (let i = currentHour + 1; i < 24; i++) hours.push(i);
                        return hours;
                      },
                      disabledMinutes: (selectedHour: number) => {
                        if (selectedHour === currentHour) {
                          const minutes: number[] = [];
                          for (let i = currentMinute + 1; i < 60; i++) minutes.push(i);
                          return minutes;
                        }
                        return [];
                      },
                    };
                  }
                }
                return {};
              }}
              onChange={(value) => {
                if (value?.[0] && value?.[1]) {
                  const diff = value[1].diff(value[0], 'minute');
                  manualForm.setFieldsValue({
                    durationHours: Math.floor(diff / 60),
                    durationMinutes: diff % 60,
                  });
                } else {
                  manualForm.setFieldsValue({ durationHours: null, durationMinutes: null });
                }
              }}
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.timeRange !== cur.timeRange}
          >
            {({ getFieldValue }) => {
              const range = getFieldValue('timeRange');
              const minutes = range?.[0] && range?.[1]
                ? range[1].diff(range[0], 'minute')
                : null;
              const display = minutes !== null
                ? `${Math.floor(minutes / 60)}小时${minutes % 60}分钟`
                : null;
              return (
                <Form.Item label="学习时长">
                  {display !== null ? (
                    <div style={{
                      height: 38,
                      lineHeight: '38px',
                      padding: '0 12px',
                      background: '#f5f5f5',
                      border: '1px solid #d9d9d9',
                      borderRadius: 12,
                      color: '#5a3d4a',
                      fontSize: 14,
                      userSelect: 'none',
                    }}>
                      {display}
                    </div>
                  ) : (
                    <div style={{
                      height: 38,
                      lineHeight: '38px',
                      padding: '0 12px',
                      background: '#f5f5f5',
                      border: '1px solid #d9d9d9',
                      borderRadius: 12,
                      color: '#bfbfbf',
                      fontSize: 14,
                      userSelect: 'none',
                    }}>
                      请先选择学习时间段
                    </div>
                  )}
                </Form.Item>
              );
            }}
          </Form.Item>
          <Form.Item name="content" label="📖 学了什么">
            <TextArea className="cute-input" rows={3} placeholder="描述今天的学习内容" />
          </Form.Item>
          <Form.Item name="note" label="💭 学习心得">
            <TextArea className="cute-input" rows={3} placeholder="记录你的心得与收获" />
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
    </div>
  );
};

export default CheckInPage;
