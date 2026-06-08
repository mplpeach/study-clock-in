import React, { useState, useEffect } from 'react';
import {
  Card, Button, Modal, Form, Input, Select, DatePicker, Checkbox, Table, Tag, message, Space,
  Tabs, Collapse, Empty,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UndoOutlined, StopOutlined, CaretRightOutlined, MenuOutlined } from '@ant-design/icons';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import dayjs from 'dayjs';
import { taskApi, goalApi, instanceApi, checkInApi } from '../api';
import type { Task, Goal, TaskInstance } from '../api';
import SortableGoalItem from '../components/SortableGoalItem';
import { useSearchParams, useNavigate } from 'react-router-dom';

const { Panel } = Collapse;

interface GoalGroup {
  key: string;
  goalId: number;
  goalName: string;
  color: string;
  tasks: Task[];
}

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [todayInstances, setTodayInstances] = useState<TaskInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [repeatRule, setRepeatRule] = useState<string>('NONE');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [switchConfirmOpen, setSwitchConfirmOpen] = useState(false);
  const [switchTaskId, setSwitchTaskId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const goalIdFilter = searchParams.get('goalId');

  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [sortedGoals, setSortedGoals] = useState<Goal[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fetchTasks = async () => {
    setLoading(true);
    try {
      let data: Task[];
      if (goalIdFilter) {
        data = await taskApi.getByGoal(Number(goalIdFilter));
      } else {
        data = await taskApi.getAll();
      }
      setTasks(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchGoals = async () => {
    const data = await goalApi.getAll();
    setGoals(data);
  };

  const today = dayjs().format('YYYY-MM-DD');

  useEffect(() => {
    fetchTasks();
    fetchGoals();
    instanceApi.getByDate(today).then(setTodayInstances).catch(() => {});
  }, [goalIdFilter]);

  const handleSearch = async () => {
    if (!searchKeyword) { fetchTasks(); return; }
    const data = await taskApi.search(searchKeyword);
    setTasks(data);
  };

  const openCreate = () => {
    setEditingTask(null);
    setRepeatRule('NONE');
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setRepeatRule(task.repeatRule || 'NONE');
    form.setFieldsValue({
      name: task.name,
      description: task.description,
      scheduledDate: task.scheduledDate ? dayjs(task.scheduledDate) : undefined,
      repeatRule: task.repeatRule || 'NONE',
      weeklyDays: task.weeklyDays ? task.weeklyDays.split(',').map(Number) : [],
      goalIds: task.goalIds || [],
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload: any = {
      name: values.name,
      description: values.description,
      scheduledDate: values.scheduledDate ? values.scheduledDate.format('YYYY-MM-DD') : undefined,
      repeatRule: values.repeatRule || 'NONE',
      weeklyDays: values.repeatRule === 'WEEKLY' && values.weeklyDays?.length
        ? values.weeklyDays.sort().join(',')
        : undefined,
    };
    if (editingTask) {
      await taskApi.update(editingTask.id, payload);
      await taskApi.updateGoals(editingTask.id, values.goalIds || []);
      message.success('任务已更新 ✨');
    } else {
      const created = await taskApi.create(payload);
      if (values.goalIds?.length) {
        await taskApi.updateGoals(created.id, values.goalIds);
      }
      message.success('任务已创建 ✨');
    }
    setModalOpen(false);
    fetchTasks();
  };

  const handleDelete = async (id: number) => {
    await taskApi.delete(id);
    message.success('任务已删除');
    fetchTasks();
  };

  const handleComplete = async (id: number) => {
    try {
      await taskApi.complete(id);
      message.success('任务已停止 ✨');
      fetchTasks();
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    }
  };

  const handleReactivate = async (id: number) => {
    try {
      await taskApi.reactivate(id);
      message.success('任务已重新激活 💪');
      fetchTasks();
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    }
  };

  const openReorderModal = () => {
    setSortedGoals([...goals]);
    setReorderModalOpen(true);
  };

  const handleDragEnd = (event: any) => {
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
      await goalApi.reorder(items);
      message.success('排序已保存 ~ 📐');
      setReorderModalOpen(false);
      fetchGoals();
    } catch (e: any) {
      message.error(e?.message || '保存失败');
    }
  };

  // ---- 分组与筛选 ----

  const isRecurring = (task: Task) =>
    task.repeatRule === 'DAILY' || task.repeatRule === 'WEEKLY';

  const isActive = (task: Task) =>
    !task.status || task.status === 'ACTIVE';

  const isCompleted = (task: Task) =>
    task.status === 'COMPLETED';

  const groupByGoal = (taskList: Task[]): GoalGroup[] => {
    const map = new Map<string, GoalGroup>();

    for (const task of taskList) {
      const ids = task.goalIds || (task.goalId ? [task.goalId] : []);
      if (ids.length === 0) {
        if (!map.has('__ungrouped__')) {
          map.set('__ungrouped__', {
            key: 'ungrouped',
            goalId: 0,
            goalName: '未分类',
            color: '#b8929e',
            tasks: [],
          });
        }
        map.get('__ungrouped__')!.tasks.push(task);
      } else {
        for (const gid of ids) {
          const goal = goals.find((g) => g.id === gid);
          const key = `goal_${gid}`;
          if (!map.has(key)) {
            map.set(key, {
              key,
              goalId: gid,
              goalName: goal?.name || `目标 #${gid}`,
              color: goal?.color || '#ff6b81',
              tasks: [],
            });
          }
          map.get(key)!.tasks.push(task);
        }
      }
    }

    return Array.from(map.values()).map((g) => ({
      ...g,
      tasks: [...g.tasks].sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da; // 倒序：新创建的在前
      }),
    }));
  };

  const getFilteredTasks = (tab: string) => {
    if (tab === 'completed') return tasks.filter(isCompleted);
    if (tab === 'recurring') return tasks.filter((t) => isRecurring(t) && isActive(t));
    if (tab === 'onetime') return tasks.filter((t) => !isRecurring(t) && isActive(t));
    return tasks.filter(isActive);
  };

  // ---- 内部表格列（精简，去掉「关联目标」列，目标信息已在面板标题体现） ----

  const instanceMap = new Map(todayInstances.map((i) => [i.taskId, i]));

  const innerColumns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      render: (name: string) => <strong style={{ color: '#5a3d4a' }}>{name}</strong>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 140,
      ellipsis: true,
    },
    {
      title: '安排',
      key: 'schedule',
      width: 120,
      render: (_: unknown, record: Task) => {
        const dayNames = ['', '一', '二', '三', '四', '五', '六', '日'];
        if (record.repeatRule === 'DAILY') {
          return <Tag className="cute-tag" color="#4ecdc4">每天</Tag>;
        }
        if (record.repeatRule === 'WEEKLY' && record.weeklyDays) {
          const days = record.weeklyDays.split(',').map((d) => dayNames[Number(d)]).join('、');
          return <Tag className="cute-tag" color="#a29bfe">每周{days}</Tag>;
        }
        if (record.scheduledDate) {
          return <span>{dayjs(record.scheduledDate).format('M月D日')}</span>;
        }
        return <span style={{ color: '#bbb' }}>未安排</span>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 300,
      render: (_: unknown, record: Task) => (
        <Space>
          {record.status === 'COMPLETED' ? (
            <>
              <Button type="link" style={{ color: '#2ed573' }} icon={<UndoOutlined />} size="small"
                onClick={() => {
                  Modal.confirm({
                    icon: <UndoOutlined style={{ color: '#2ed573' }} />,
                    title: '确定重新激活这个任务吗？',
                    content: '激活后将重新出现在任务列表中，并恢复正常使用。',
                    className: 'cute-modal',
                    centered: true,
                    okText: '确定',
                    cancelText: '取消',
                    okButtonProps: { style: { borderRadius: 20, background: '#2ed573', borderColor: '#2ed573' } },
                    cancelButtonProps: { style: { borderRadius: 20 } },
                    onOk: () => handleReactivate(record.id),
                  });
                }}>
                重新激活
              </Button>
              <Button type="link" danger icon={<DeleteOutlined />} size="small"
                onClick={() => {
                  Modal.confirm({
                    icon: <DeleteOutlined style={{ color: '#ff6b81' }} />,
                    title: '确定删除吗？',
                    className: 'cute-modal',
                    centered: true,
                    okText: '确定',
                    cancelText: '取消',
                    okButtonProps: { danger: true, style: { borderRadius: 20 } },
                    cancelButtonProps: { style: { borderRadius: 20 } },
                    onOk: () => handleDelete(record.id),
                  });
                }}>
                删除
              </Button>
            </>
          ) : (
            <>
              {(() => {
                const inst = instanceMap.get(record.id);
                const isFuture = record.repeatRule === 'NONE' && record.scheduledDate && record.scheduledDate > today;
                if (inst?.status === 'COMPLETED') {
                  return <Tag className="cute-tag" color="success" style={{ padding: '4px 12px' }}>已完成 ✓</Tag>;
                }
                const disabled = isFuture || inst?.status === 'SKIPPED' || inst?.status === 'DEFERRED';
                const tooltip = isFuture ? '未到安排日期'
                  : inst?.status === 'SKIPPED' ? '今日已跳过'
                  : inst?.status === 'DEFERRED' ? '已延期至明天'
                  : '';
                return (
                  <Button type="link" style={{ color: disabled ? '#ccc' : '#2ed573' }} icon={<CaretRightOutlined />} size="small"
                    disabled={disabled} title={tooltip}
                    onClick={async () => {
                      try {
                        const active = await checkInApi.hasActive();
                        if (active) {
                          setSwitchTaskId(record.id);
                          setSwitchConfirmOpen(true);
                        } else {
                          navigate(`/checkin?autoStartTaskId=${record.id}`);
                        }
                      } catch {
                        navigate(`/checkin?autoStartTaskId=${record.id}`);
                      }
                    }}>
                    开始
                  </Button>
                );
              })()}
              <Button type="link" style={{ color: '#8c6f7a' }} icon={<EditOutlined />} size="small" onClick={() => openEdit(record)}>编辑</Button>
              {isRecurring(record) ? (
                <Button type="link" style={{ color: '#ffa502' }} icon={<StopOutlined />} size="small"
                  onClick={() => {
                    Modal.confirm({
                      icon: <StopOutlined style={{ color: '#ffa502' }} />,
                      title: '确定停止这个循环任务吗？',
                      content: '停止后，该任务不会再自动生成每天的待办事项。',
                      className: 'cute-modal',
                      centered: true,
                      okText: '确定',
                      cancelText: '取消',
                      okButtonProps: { style: { borderRadius: 20, background: '#ffa502', borderColor: '#ffa502' } },
                      cancelButtonProps: { style: { borderRadius: 20 } },
                      onOk: () => handleComplete(record.id),
                    });
                  }}>
                  停止循环
                </Button>
              ) : null}
              <Button type="link" danger icon={<DeleteOutlined />} size="small"
                onClick={() => {
                  Modal.confirm({
                    icon: <DeleteOutlined style={{ color: '#ff6b81' }} />,
                    title: '确定删除吗？',
                    className: 'cute-modal',
                    centered: true,
                    okText: '确定',
                    cancelText: '取消',
                    okButtonProps: { danger: true, style: { borderRadius: 20 } },
                    cancelButtonProps: { style: { borderRadius: 20 } },
                    onOk: () => handleDelete(record.id),
                  });
                }}>
                删除
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  // ---- Tab 内容渲染 ----

  const renderTabContent = (tab: string) => {
    const filtered = getFilteredTasks(tab);
    const groups = groupByGoal(filtered);

    if (groups.length === 0) {
      return <Empty style={{ marginTop: 24 }} description="暂无任务" />;
    }

    // 当 URL 指定了 goalIdFilter 时，自动展开对应目标的面板
    const defaultActiveKey = goalIdFilter ? `goal_${goalIdFilter}` : undefined;

    return (
      <Collapse accordion defaultActiveKey={defaultActiveKey} style={{ marginTop: 16 }}>
        {groups.map((group) => (
          <Panel
            key={group.key}
            header={
              <Space>
                <span style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: group.color,
                }} />
                <span style={{ color: '#5a3d4a', fontWeight: 600 }}>{group.goalName}</span>
                <Tag className="cute-tag">{group.tasks.length}</Tag>
              </Space>
            }
          >
            <Table
              dataSource={group.tasks}
              columns={innerColumns}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10, size: 'small', showSizeChanger: false }}
              size="small"
            />
          </Panel>
        ))}
      </Collapse>
    );
  };

  const activeTasks = tasks.filter(isActive);
  const recurringCount = activeTasks.filter(isRecurring).length;
  const onetimeCount = activeTasks.filter((t) => !isRecurring(t)).length;
  const completedCount = tasks.filter(isCompleted).length;

  const tabItems = [
    { key: 'recurring', label: `🔄 循环任务 (${recurringCount})` },
    { key: 'onetime', label: `📌 单次任务 (${onetimeCount})` },
    { key: 'all', label: `📋 全部 (${activeTasks.length})` },
    { key: 'completed', label: `✅ 已完成 (${completedCount})` },
  ];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>📋 学习任务</h2>
          <p>{goalIdFilter ? '当前目标下的任务' : '管理学习任务，按目标分类查看'}</p>
        </div>
        <Space>
          <Input.Search
            placeholder="搜索任务"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 200 }}
          />
          <Button icon={<MenuOutlined />} onClick={openReorderModal} className="cute-btn-outline-purple">
            调整排序
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} className="cute-btn">
            新建任务
          </Button>
        </Space>
      </div>

      <Card className="cute-card">
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        {renderTabContent(activeTab)}
      </Card>

      {/* 切换任务确认 Modal */}
      <Modal
        className="cute-modal"
        title="切换任务"
        open={switchConfirmOpen}
        onOk={() => {
          setSwitchConfirmOpen(false);
          navigate(`/checkin?autoStartTaskId=${switchTaskId}&switch=1`);
        }}
        onCancel={() => {
          setSwitchConfirmOpen(false);
          setSwitchTaskId(null);
        }}
        okText="切换"
        cancelText="取消"
        centered
        okButtonProps={{ style: { borderRadius: 20, background: '#ffa502', borderColor: '#ffa502' } }}
        cancelButtonProps={{ style: { borderRadius: 20 } }}
      >
        <div style={{ color: '#5a3d4a', fontSize: 14, lineHeight: 1.8 }}>
          <p>当前有进行中的任务，确定要切换吗？</p>
          <p style={{ fontSize: 13, color: '#b8929e' }}>
            切换后需要记录上一个任务的学习内容。
          </p>
        </div>
      </Modal>

      {/* 新建/编辑任务 Modal */}
      <Modal className="cute-modal" title={editingTask ? '编辑任务' : '新建任务'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} width={520}>
        <Form form={form} layout="vertical" initialValues={{ repeatRule: 'NONE' }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入任务名称' }]}>
            <Input className="cute-input" placeholder="例如：刷LeetCode" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea className="cute-input" rows={3} />
          </Form.Item>
          <Form.Item name="goalIds" label="关联目标">
            <Select className="cute-input" placeholder="选择关联的目标（可多选）" allowClear mode="multiple" maxTagCount={3}>
              {goals.map((g) => (
                <Select.Option key={g.id} value={g.id}>{g.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="repeatRule" label="重复规则" initialValue="NONE">
            <Select
              className="cute-input"
              onChange={(value) => setRepeatRule(value)}
              options={[
                { label: '不重复', value: 'NONE' },
                { label: '每天', value: 'DAILY' },
                { label: '每周', value: 'WEEKLY' },
              ]}
            />
          </Form.Item>
          {repeatRule === 'NONE' && (
            <Form.Item name="scheduledDate" label="安排日期（选填）">
              <DatePicker className="cute-input" style={{ width: '100%' }} placeholder="选择具体日期" />
            </Form.Item>
          )}
          {repeatRule === 'WEEKLY' && (
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
          )}
        </Form>
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
        centered
      >
        <p style={{ color: '#b8929e', fontSize: 13, marginBottom: 16 }}>
          拖拽目标调整顺序，靠前的目标将优先展示在任务列表顶部。
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
    </div>
  );
};

export default TasksPage;
