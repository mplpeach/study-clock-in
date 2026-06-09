import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Card, Button, Checkbox, Modal, Form, Input, Select, DatePicker, TimePicker, message, Row, Col,
  Tag, Empty, Upload, List, Space, Typography, Divider,
} from 'antd';
import {
  PlayCircleOutlined, PauseCircleOutlined,
  HistoryOutlined, InboxOutlined, DeleteOutlined, InfoCircleOutlined,
  MenuOutlined, SettingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import { instanceApi, checkInApi, taskApi, goalApi } from '../api';
import { useTimer } from '../contexts/TimerContext';
import type { TaskInstance, Task, Goal } from '../api';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableGoalItem from '../components/SortableGoalItem';

const { TextArea } = Input;
const { Dragger } = Upload;
const { Text } = Typography;

const STATUS_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  TODO:         { emoji: '📝', label: '待开始', color: '#b8929e' },
  IN_PROGRESS:  { emoji: '⏳', label: '进行中', color: '#ffa502' },
  COMPLETED:    { emoji: '✅', label: '已完成', color: '#2ed573' },
  SKIPPED:      { emoji: '⏭️', label: '已跳过', color: '#b8929e' },
  DEFERRED:     { emoji: '⏩', label: '已延期', color: '#b8929e' },
};

interface GoalGroup {
  goalId: number | null;
  goalName: string;
  color: string;
  sortOrder: number;
  items: (TaskInstance & { isOverdue: boolean })[];
}


const CheckInPage: React.FC = () => {
  const [todayInstances, setTodayInstances] = useState<TaskInstance[]>([]);
  const [overdueInstances, setOverdueInstances] = useState<TaskInstance[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const timer = useTimer();
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(0);
  const recordStartTimeRef = useRef<number>(0);

  const [startModalOpen, setStartModalOpen] = useState(false);
  const [startTaskType, setStartTaskType] = useState<'existing' | 'new'>('new');
  const [startForm] = Form.useForm();

  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [pauseForm] = Form.useForm();

  const [endModalOpen, setEndModalOpen] = useState(false);
  const [endRecordId, setEndRecordId] = useState<number | null>(null);
  const [endForm] = Form.useForm();
  const [endFiles, setEndFiles] = useState<File[]>([]);

  const [detailInstanceId, setDetailInstanceId] = useState<number | null>(null);
  const [expandedCompleted, setExpandedCompleted] = useState<Set<string>>(new Set());
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualTaskType, setManualTaskType] = useState<'existing' | 'new'>('new');
  const [manualForm] = Form.useForm();
  const [manualFiles, setManualFiles] = useState<File[]>([]);

  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [sortedGoals, setSortedGoals] = useState<Goal[]>([]);
  const [rescheduleDate, setRescheduleDate] = useState<dayjs.Dayjs | null>(null);
  const [switchModalOpen, setSwitchModalOpen] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<number | null>(null);
  const [switchForm] = Form.useForm();
  const [toolPanelOpen, setToolPanelOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const today = dayjs().format('YYYY-MM-DD');
  const [searchParams, setSearchParams] = useSearchParams();

  const fetchData = async () => {
    try {
      const [instances, overdue, allGoals, allTasks] = await Promise.all([
        instanceApi.getByDate(today),
        instanceApi.getOverdue(),
        goalApi.getAll('checkin'),
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

  const [hasRestored, setHasRestored] = useState(false);

  useEffect(() => {
    if (hasRestored) return;

    (async () => {
      try {
        const session = await checkInApi.getActive();
        if (session) {
          const startTimeMs = dayjs(session.startTime).valueOf();
          timer.startSession(session.instanceId, session.recordId, session.accumulatedSeconds, startTimeMs);
          recordStartTimeRef.current = startTimeMs;
          setElapsed(session.elapsedSeconds);
          startTimer();
        }
      } catch (e) {
        console.error('自动恢复计时失败', e);
      }
      setHasRestored(true);
    })();
  }, [hasRestored]);

  const statusOrder: Record<string, number> = { IN_PROGRESS: 0, TODO: 1, DEFERRED: 2, COMPLETED: 3 };

  const groupedGoals = useMemo(() => {
    const map = new Map<number | null, GoalGroup>();

    for (const g of goals) {
      map.set(g.id, {
        goalId: g.id,
        goalName: g.name,
        color: g.color,
        sortOrder: g.sortOrder,
        items: [],
      });
    }

    map.set(null, {
      goalId: null,
      goalName: '未分类',
      color: '#b8929e',
      sortOrder: 99999,
      items: [],
    });

    const sortByStatus = (a: TaskInstance & { isOverdue: boolean }, b: TaskInstance & { isOverdue: boolean }) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
    };

    const pushItems = (instances: TaskInstance[], isOverdue: boolean) => {
      for (const item of instances) {
        const goalIds = item.goalIds;
        const targets: GoalGroup[] = [];
        if (goalIds && goalIds.length > 0) {
          for (const gid of goalIds) {
            const group = map.get(gid);
            if (group) targets.push(group);
          }
        }
        if (targets.length === 0) targets.push(map.get(null)!);

        for (const group of targets) {
          group.items.push({ ...item, isOverdue });
        }
      }
    };

    pushItems(todayInstances, false);
    pushItems(overdueInstances, true);

    for (const group of map.values()) {
      group.items.sort(sortByStatus);
    }

    // 按 API 返回的 goals 数组顺序排列（API 已按页面排序）
    const goalIndex = new Map(goals.map((g, i) => [g.id, i]));
    return Array.from(map.values())
      .filter((g) => g.items.length > 0)
      .sort((a, b) => {
        if (a.goalId == null) return 1;
        if (b.goalId == null) return -1;
        const ia = goalIndex.get(a.goalId) ?? 999;
        const ib = goalIndex.get(b.goalId) ?? 999;
        return ia - ib;
      });
  }, [goals, todayInstances, overdueInstances]);

  const timerDisplay = timer.accumulatedElapsed + elapsed;

  const detailInstance = useMemo(() => {
    if (detailInstanceId == null) return null;
    return (
      todayInstances.find((i) => i.id === detailInstanceId) ||
      overdueInstances.find((i) => i.id === detailInstanceId) ||
      null
    );
  }, [detailInstanceId, todayInstances, overdueInstances]);

  const dayNames: Record<string, string> = { '1': '一', '2': '二', '3': '三', '4': '四', '5': '五', '6': '六', '7': '日' };

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = 0;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - recordStartTimeRef.current) / 1000));
    }, 1000);
  }, [stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const clearActive = useCallback(() => {
    timer.clearSession();
    setElapsed(0);
    recordStartTimeRef.current = 0;
    stopTimer();
  }, [stopTimer, timer]);

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
      const task = await taskApi.create({
        name: values.name,
        description: values.description,
        repeatRule: values.repeatRule || 'NONE',
        scheduledDate: (!values.repeatRule || values.repeatRule === 'NONE') ? today : undefined,
        weeklyDays: values.repeatRule === 'WEEKLY' && values.weeklyDays?.length
          ? values.weeklyDays.sort().join(',')
          : undefined,
      });
      if (values.goalIds?.length) {
        await taskApi.updateGoals(task.id, values.goalIds);
      }
      taskId = task.id;
    }

    const instance = await resolveInstance(taskId);
    const record = await checkInApi.start(instance.id);
    const startTimeMs = dayjs(record.startTime).valueOf();
    timer.startSession(instance.id, record.id, 0, startTimeMs);
    recordStartTimeRef.current = startTimeMs;
    setElapsed(Math.floor((Date.now() - startTimeMs) / 1000));
    startTimer();
    message.success('开始学习！加油~ 💪');
    setStartModalOpen(false);
    startForm.resetFields();
    fetchData();
  };

  const openStartModal = () => {
    setStartTaskType('new');
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
      const startTimeMs = dayjs(record.startTime).valueOf();
      timer.startSession(instanceId, record.id, totalSeconds, startTimeMs);
      recordStartTimeRef.current = startTimeMs;
      setElapsed(Math.floor((Date.now() - startTimeMs) / 1000));
      startTimer();
      message.success('继续学习！加油~ 💪');
      fetchData();
    } catch (e: any) { message.error(e.message); }
  };

  const doStartInstance = async (instanceId: number) => {
    try {
      const record = await checkInApi.start(instanceId);
      const startTimeMs = dayjs(record.startTime).valueOf();
      timer.startSession(instanceId, record.id, 0, startTimeMs);
      recordStartTimeRef.current = startTimeMs;
      setElapsed(Math.floor((Date.now() - startTimeMs) / 1000));
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

  // ===== 从任务页跳转过来，自动开始任务 =====
  useEffect(() => {
    const taskIdStr = searchParams.get('autoStartTaskId');
    if (!taskIdStr || tasks.length === 0 || !hasRestored) return;

    const taskId = Number(taskIdStr);
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === 'COMPLETED') return;

    if (timer.isActive) {
      searchParams.delete('autoStartTaskId');
      searchParams.delete('switch');
      setSearchParams(searchParams, { replace: true });
      setPendingTaskId(taskId);
      stopTimer();
      switchForm.resetFields();
      setSwitchModalOpen(true);
      return;
    }

    searchParams.delete('autoStartTaskId');
    setSearchParams(searchParams, { replace: true });

    (async () => {
      try {
        if (task.repeatRule === 'NONE' && task.scheduledDate && task.scheduledDate > today) {
          try {
            const futureInstances = await instanceApi.getByDate(task.scheduledDate);
            const futureInstance = futureInstances.find((i) => i.taskId === taskId);
            if (futureInstance) {
              await instanceApi.delete(futureInstance.id);
            }
          } catch { /* 非关键，删除失败也不阻塞 */ }
        }

        const instance = await resolveInstance(taskId);
        await handleResume(instance.id);
      } catch (e: any) {
        message.error(e?.message || '启动任务失败');
      }
    })();
  }, [tasks, todayInstances, hasRestored]);

  // ===== 切换任务处理 =====
  const handleSwitchConfirm = async () => {
    const values = await switchForm.validateFields();
    const durationSeconds = Math.floor((Date.now() - recordStartTimeRef.current) / 1000);
    try {
      await checkInApi.end(timer.activeRecordId!, {
        content: values.content,
        complete: false,
        durationSeconds,
      });
    } catch { /* 非关键 */ }

    clearActive();
    setSwitchModalOpen(false);
    switchForm.resetFields();

    try {
      const task = tasks.find((t) => t.id === pendingTaskId);
      if (task && task.repeatRule === 'NONE' && task.scheduledDate && task.scheduledDate > today) {
        try {
          const futureInstances = await instanceApi.getByDate(task.scheduledDate);
          const futureInstance = futureInstances.find((i) => i.taskId === pendingTaskId);
          if (futureInstance) await instanceApi.delete(futureInstance.id);
        } catch { /* 非关键 */ }
      }
      const instance = await resolveInstance(pendingTaskId!);
      await handleResume(instance.id);
      message.success('已切换任务 💪');
    } catch (e: any) {
      message.error(e?.message || '启动任务失败');
    }
    setPendingTaskId(null);
  };

  // ===== 暂停（提交内容 + 时长，但不完成实例） =====
  const handlePause = async () => {
    stopTimer();
    pauseForm.resetFields();
    // 拉取之前的记录，回显上一次的学习内容
    try {
      const records = await checkInApi.getByInstance(timer.activeInstanceId!);
      const prev = records.filter((r) => r.id !== timer.activeRecordId);
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
    const durationSeconds = Math.floor((Date.now() - recordStartTimeRef.current) / 1000);
    await checkInApi.end(timer.activeRecordId!, {
      content: values.content,
      complete: false,
      durationSeconds,
    });
    message.success('已记录学习内容~ 📝');
    setPauseModalOpen(false);
    clearActive();
    fetchData();
  };

  // ===== 结束学习（完成实例） =====
  const handleEndOpen = async () => {
    stopTimer();
    setEndRecordId(timer.activeRecordId);
    setEndFiles([]);
    endForm.resetFields();
    // 拉取之前的记录，回显学习内容和心得
    try {
      const records = await checkInApi.getByInstance(timer.activeInstanceId!);
      const prev = records.filter((r) => r.id !== timer.activeRecordId);
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
    const durationSeconds = Math.floor((Date.now() - recordStartTimeRef.current) / 1000);
    await checkInApi.end(endRecordId!, {
      content: values.content,
      note: values.note,
      complete: true,
      durationSeconds,
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
      const task = await taskApi.create({
        name: values.name,
        description: values.description,
        repeatRule: values.repeatRule || 'NONE',
        scheduledDate: (!values.repeatRule || values.repeatRule === 'NONE') ? today : undefined,
        weeklyDays: values.repeatRule === 'WEEKLY' && values.weeklyDays?.length
          ? values.weeklyDays.sort().join(',')
          : undefined,
      });
      if (values.goalIds?.length) {
        await taskApi.updateGoals(task.id, values.goalIds);
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
    setManualTaskType('new');
    manualForm.resetFields();
    setManualFiles([]);
    setManualModalOpen(true);
  };

  // ===== 目标排序 =====
  const openReorderModal = () => {
    const sorted = [...goals]; // goals 已由 API 按页面排序返回
    setSortedGoals(sorted);
    setReorderModalOpen(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSortedGoals((prev) => {
      const oldIndex = prev.findIndex((g) => g.id === active.id);
      const newIndex = prev.findIndex((g) => g.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleReorderSave = async () => {
    try {
      const items = sortedGoals.map((g, i) => ({ id: g.id, sortOrder: i }));
      await goalApi.reorder(items, 'checkin');
      message.success('排序已保存~ 📐');
      setReorderModalOpen(false);
      fetchData();
    } catch (e: any) {
      message.error(e?.message || '保存失败');
    }
  };

  // ===== 共享任务选择区 =====
  const renderTaskPicker = (
    taskType: 'existing' | 'new',
    onTypeChange: (v: 'existing' | 'new') => void,
    form: any,
  ) => (
    <>
      <Form.Item label="选择方式" style={{ marginBottom: 12 }}>
        <Select
          className="cute-input"
          value={taskType}
          onChange={(value) => onTypeChange(value as 'existing' | 'new')}
          options={[
            { label: '新建任务', value: 'new' },
            { label: '已有任务', value: 'existing' },
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
          <Form.Item name="goalIds" label="关联目标">
            <Select placeholder="选择目标（可选，可多选）" allowClear mode="multiple" maxTagCount={2} className="cute-input">
              {goals.map((g) => <Select.Option key={g.id} value={g.id}>{g.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="repeatRule" label="重复规则" initialValue="NONE">
            <Select
              className="cute-input"
              options={[
                { label: '不重复', value: 'NONE' },
                { label: '每天', value: 'DAILY' },
                { label: '每周', value: 'WEEKLY' },
              ]}
            />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.repeatRule !== cur.repeatRule}
          >
            {({ getFieldValue }) =>
              getFieldValue('repeatRule') === 'WEEKLY' ? (
                <Form.Item name="weeklyDays" label="选择星期">
                  <Checkbox.Group
                    options={[
                      { label: '周一', value: 1 },
                      { label: '周二', value: 2 },
                      { label: '周三', value: 3 },
                      { label: '周四', value: 4 },
                      { label: '周五', value: 5 },
                      { label: '周六', value: 6 },
                      { label: '周日', value: 7 },
                    ]}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </>
      )}
    </>
  );


  // 判断当前活跃任务是否就是这个实例
  const isActiveInstance = (instanceId: number) =>
    timer.activeInstanceId === instanceId && timer.isActive;

  return (
    <div>
      <div className="page-header">
        <h2>📚 今日打卡</h2>
        <p>{today}</p>
      </div>

      {timer.isActive && (
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
            disabled={timer.isActive}
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

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {groupedGoals.length === 0 ? (
            <Empty description="今天还没有任务，点击上方按钮开始学习吧~ 🌸" />
          ) : (
            groupedGoals.map((group) => (
          <Card
            key={group.goalId ?? 'unclassified'}
            className="goal-block-card"
            style={{ borderLeft: `4px solid ${group.color}` }}
            title={
              <Space>
                <span className="goal-color-dot" style={{ background: group.color }} />
                <Text strong style={{ color: '#5a3d4a', fontSize: 16 }}>
                  {group.goalName}
                </Text>
                <Tag className="cute-tag" style={{ fontSize: 11 }}>
                  {group.items.length} 项
                </Tag>
              </Space>
            }
          >
            {(() => {
              const activeItems = group.items.filter((i) => i.status !== 'COMPLETED');
              const completedItems = group.items.filter((i) => i.status === 'COMPLETED');
              const groupKey = group.goalId != null ? String(group.goalId) : 'unclassified';
              const showCompleted = expandedCompleted.has(groupKey);

              const renderTaskRow = (item: TaskInstance & { isOverdue: boolean }) => (
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
                                    disabled={timer.isActive}
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
                                    disabled={timer.isActive}
                                    key="resume"
                                    onClick={() => handleResume(item.id)}
                                    style={timer.isActive ? undefined : { background: '#ffa502', borderColor: '#ffa502' }}
                                  >
                                    继续学习
                                  </Button>,
                                ]
                                : item.status === 'SKIPPED'
                                ? [
                                  <Tag className="cute-tag" color="default" style={{ padding: '4px 12px' }} key="skipped">
                                    已跳过
                                  </Tag>,
                                ]
                                : item.status === 'DEFERRED'
                                ? [
                                  <Tag className="cute-tag" color="default" style={{ padding: '4px 12px' }} key="deferred">
                                    已延期
                                  </Tag>,
                                ]
                                : [
                                  <Tag className="cute-tag" color="success" style={{ padding: '4px 12px' }} key="done">
                                    已完成 ✓
                                  </Tag>,
                                ]),


                              <Button
                                type="link"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                key="delete"
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
                                    onOk: () => handleDeleteInstance(item.id),
                                  });
                                }}
                              />,
                            ]
                      }
                    >
                      <List.Item.Meta
                        avatar={
                          <span style={{ fontSize: 20 }}>
                            {isActiveInstance(item.id) ? '⏳' : item.status === 'IN_PROGRESS' ? '⏸️' : STATUS_CONFIG[item.status]?.emoji || '📝'}
                          </span>
                        }
                        title={
                          <Space>
                            {item.isOverdue && (
                              <Tag color="error" className="cute-tag overdue-pulse">逾期</Tag>
                            )}
                            <span style={{ color: '#5a3d4a', fontWeight: 600 }}>{item.taskName}</span>
<InfoCircleOutlined
  style={{ color: '#b8929e', cursor: 'pointer', fontSize: 14 }}
  onClick={() => setDetailInstanceId(item.id)}
/>
                            {(() => {
                              if (item.repeatRule === 'NONE' && item.taskScheduledDate && item.taskScheduledDate > today) {
                                const daysLeft = dayjs(item.taskScheduledDate).diff(dayjs(today), 'day');
                                return (
                                  <Tag className="cute-tag" color="orange" style={{ fontSize: 11 }}>
                                    提前开始 · 原定{dayjs(item.taskScheduledDate).format('M月D日')} · 还剩{daysLeft}天
                                  </Tag>
                                );
                              }
                              return null;
                            })()}
                            {item.goalIds && item.goalIds.length > 1 && (
                              <Tag className="cute-tag" color="processing" style={{ fontSize: 10 }}>
                                {item.goalIds.length} 个目标
                              </Tag>
                            )}
                            {item.isOverdue && (
                              <Text type="secondary" style={{ fontSize: 12, color: '#b8929e' }}>
                                原定 {item.scheduledDate}
                              </Text>
                            )}
                          </Space>
                        }
                        description={
                          <span style={{ color: STATUS_CONFIG[item.status]?.color || '#b8929e' }}>
                            {isActiveInstance(item.id)
                              ? `进行中 ${formatElapsed(timerDisplay)}`
                              : item.status === 'TODO' && item.isOverdue ? '待补做'
                              : item.status === 'IN_PROGRESS' ? '已暂停'
                              : STATUS_CONFIG[item.status]?.label || '未知'}
                          </span>
                        }
                      />
                    </List.Item>
                  );

              return (
                <>
                  {activeItems.length > 0 && (
                    <List size="small" dataSource={activeItems} renderItem={renderTaskRow} />
                  )}
                  {completedItems.length > 0 && (
                    <>
                      <div className={`completed-collapse${showCompleted ? ' open' : ''}`}>
                        <List size="small" dataSource={completedItems} renderItem={renderTaskRow} />
                      </div>
                      <div
                        onClick={() => {
                          setExpandedCompleted((prev) => {
                            const next = new Set(prev);
                            if (showCompleted) next.delete(groupKey);
                            else next.add(groupKey);
                            return next;
                          });
                        }}
                        style={{
                          cursor: 'pointer',
                          padding: '8px 12px',
                          borderRadius: 12,
                          background: '#fef0f3',
                          textAlign: 'center',
                          color: '#b8929e',
                          fontSize: 13,
                          marginTop: showCompleted ? 8 : 0,
                          userSelect: 'none',
                        }}
                      >
                        {showCompleted ? '收起 ▲' : `已完成 ${completedItems.length} 项 ▼`}
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </Card>
            ))
          )}
        </div>

        {goals.length > 0 && (
          <Card
            size="small"
            className={`tool-panel${toolPanelOpen ? ' open' : ''}`}
            styles={{ body: { padding: toolPanelOpen ? '12px' : '8px' } }}
            style={{
              width: toolPanelOpen ? 170 : 44,
              flexShrink: 0,
              transition: 'width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              overflow: 'hidden',
              position: 'sticky',
              top: 80,
            }}
          >
            <div
              onClick={() => setToolPanelOpen(!toolPanelOpen)}
              style={{ cursor: 'pointer', textAlign: 'center', userSelect: 'none' }}
            >
              <SettingOutlined style={{ color: '#a29bfe', fontSize: 16 }} />
              {toolPanelOpen && (
                <div style={{ color: '#5a3d4a', fontSize: 13, fontWeight: 600, marginTop: 6 }}>
                  工具
                </div>
              )}
            </div>
            {toolPanelOpen && (
              <>
                <div style={{ margin: '12px 0 0', height: 1, background: '#fef0f3' }} />
                <div className="tool-item" onClick={openReorderModal}>
                  <MenuOutlined style={{ color: '#a29bfe', fontSize: 13 }} />
                  <span>调整排序</span>
                </div>
              </>
            )}
          </Card>
        )}
      </div>

      {/* ===== 开始学习 Modal ===== */}
      <Modal className="cute-modal" title="▶️ 开始学习" open={startModalOpen}
        onOk={handleStartSubmit} onCancel={() => setStartModalOpen(false)}
        okText="开始学习">
        <Form form={startForm} layout="vertical">
          {renderTaskPicker(startTaskType, setStartTaskType, startForm)}
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
          }, manualForm)}

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

      {/* ===== 任务详情 Modal ===== */}
      <Modal
        className="cute-modal"
        title="📋 任务详情"
        open={detailInstanceId !== null}
        onCancel={() => { setDetailInstanceId(null); setRescheduleDate(null); }}
        footer={null}
        width={480}
      >
        {detailInstance && (
          <div style={{ color: '#5a3d4a' }}>
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 16 }}>{detailInstance.taskName}</Text>
            </div>

            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>描述</Text>
              <div style={{ marginTop: 4, padding: '8px 12px', background: '#fef0f3', borderRadius: 12, fontSize: 14, lineHeight: 1.6 }}>
                {detailInstance.description || <span style={{ color: '#b8929e' }}>暂无描述</span>}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>关联目标</Text>
              <div style={{ marginTop: 4 }}>
                {detailInstance.goalNames && detailInstance.goalNames.length > 0 ? (
                  <Space wrap size={[8, 4]}>
                    {detailInstance.goalNames.map((name, idx) => (
                      <Tag className="cute-tag" key={idx} color="#a29bfe" style={{ fontSize: 12 }}>
                        {name}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <span style={{ color: '#b8929e', fontSize: 14 }}>未关联</span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>重复规则</Text>
              <div style={{ marginTop: 4, fontSize: 14 }}>
                {detailInstance.repeatRule === 'DAILY' ? '每天' :
                 detailInstance.repeatRule === 'WEEKLY' ? '每周' :
                 detailInstance.taskScheduledDate
                   ? `单次 · ${dayjs(detailInstance.taskScheduledDate).format('M月D日')}`
                   : '不重复'}
              </div>
            </div>

            <div>
              <Text type="secondary" style={{ fontSize: 13 }}>当前状态</Text>
              <div style={{ marginTop: 4 }}>
                <Tag className="cute-tag" color={
                  detailInstance.status === 'COMPLETED' ? 'success' :
                  detailInstance.status === 'IN_PROGRESS' ? 'warning' : 'default'
                } style={{ fontSize: 13, padding: '2px 12px' }}>
                  {STATUS_CONFIG[detailInstance.status]?.emoji + ' ' + STATUS_CONFIG[detailInstance.status]?.label || detailInstance.status}
                </Tag>
              </div>
            </div>

            {detailInstance.status !== 'COMPLETED' && detailInstance.status !== 'SKIPPED' && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #fef0f3' }}>
                {detailInstance.repeatRule === 'NONE' ? (
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                      重新安排到指定日期：
                    </Text>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <DatePicker
                        size="small"
                        style={{ flex: 1 }}
                        disabledDate={(current) => current && current < dayjs().startOf('day')}
                        onChange={setRescheduleDate}
                      />
                      <Button
                        className="reschedule-btn"
                        size="small"
                        disabled={!rescheduleDate || timer.isActive}
                      onClick={async () => {
                          try {
                            await taskApi.update(detailInstance.taskId, {
                              scheduledDate: rescheduleDate!.format('YYYY-MM-DD'),
                            });
                            message.success(`已重新安排至 ${rescheduleDate!.format('M月D日')}`);
                            setDetailInstanceId(null);
                            setRescheduleDate(null);
                            fetchData();
                          } catch (e: any) { message.error(e?.message || '安排失败'); }
                        }}>
                        确定
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="reschedule-btn"
                    size="small"
                    disabled={timer.isActive}
                    onClick={async () => {
                      try {
                        await instanceApi.skip(detailInstance.id);
                        message.success('已跳过该任务');
                        setDetailInstanceId(null);
                        fetchData();
                      } catch (e: any) { message.error(e?.message || '跳过失败'); }
                    }}
                  >
                    跳过今日
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ===== 调整排序 Modal ===== */}
      <Modal
        className="cute-modal"
        title="📐 调整目标排序"
        open={reorderModalOpen}
        onOk={handleReorderSave}
        onCancel={() => setReorderModalOpen(false)}
        okText="保存排序"
        cancelText="取消"
      >
        <p style={{ color: '#b8929e', fontSize: 13, marginBottom: 16 }}>
          拖拽目标调整顺序，靠前的目标将优先展示在打卡页顶部。
        </p>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedGoals.map((g) => g.id)}
            strategy={verticalListSortingStrategy}
          >
            {sortedGoals.map((goal) => (
              <SortableGoalItem key={goal.id} id={goal.id} goal={goal} />
            ))}
          </SortableContext>
        </DndContext>
      </Modal>

      {/* ===== 切换任务 — 强制记录内容 Modal ===== */}
      <Modal className="cute-modal" title="请记录上一个学习任务的学习内容" open={switchModalOpen}
        onOk={handleSwitchConfirm}
        okText="提交"
        maskClosable={false}
        keyboard={false}
        closable={false}
        cancelButtonProps={{ style: { display: 'none' } }}
      >
        <div style={{ marginBottom: 16, color: '#5a3d4a' }}>
          <p>切换任务前，请记录上一个任务的学习内容。</p>
          <p style={{ fontSize: 13, color: '#b8929e' }}>
            当前已用时：{formatElapsed(timerDisplay)}
          </p>
        </div>
        <Form form={switchForm} layout="vertical">
          <Form.Item name="content" label="📖 学了什么">
            <TextArea className="cute-input" rows={4} placeholder="记录一下刚刚学了什么..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CheckInPage;
