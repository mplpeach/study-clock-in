import React, { useState, useEffect } from 'react';
import {
  Card, Button, Modal, Form, Input, Row, Col, Tag, Empty, message,
  List, DatePicker, Select, Checkbox, Space, Pagination,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UnorderedListOutlined, CloseOutlined, MenuOutlined } from '@ant-design/icons';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import dayjs from 'dayjs';
import { goalApi, taskApi } from '../api';
import type { Goal, Task } from '../api';
import SortableGoalItem from '../components/SortableGoalItem';

const GoalsPage: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [form] = Form.useForm();
  const [taskForm] = Form.useForm();

  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [panelGoal, setPanelGoal] = useState<Goal | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;

  const [taskEditOpen, setTaskEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editRepeatRule, setEditRepeatRule] = useState('NONE');

  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [sortedGoals, setSortedGoals] = useState<Goal[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}小时${m}分钟`;
    return `${m}分钟`;
  };

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const data = await goalApi.getAll('goals');
      setGoals(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGoals(); }, []);

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
      await goalApi.reorder(items, 'goals');
      message.success('排序已保存 ~ 📐');
      setReorderModalOpen(false);
      fetchGoals();
    } catch (e: any) {
      message.error(e?.message || '保存失败');
    }
  };

  const openCreate = () => {
    setEditingGoal(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setEditingGoal(goal);
    form.setFieldsValue({ name: goal.name, description: goal.description });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingGoal) {
      await goalApi.update(editingGoal.id, values);
      message.success('目标已更新 ✨');
    } else {
      await goalApi.create({ ...values, color: '#ff6b81' });
      message.success('目标已创建 ✨');
    }
    setModalOpen(false);
    fetchGoals();
  };

  const handleDelete = async (id: number) => {
    await goalApi.delete(id);
    message.success('目标已删除');
    fetchGoals();
  };

  const openTaskPanel = async (goal: Goal) => {
    setPanelGoal(goal);
    setSelectedGoal(goal);
    setTasksLoading(true);
    try {
      setSelectedTasks(await taskApi.getByGoal(goal.id));
    } catch { /* ignore */ }
    setTasksLoading(false);
  };

  const closePanel = () => {
    setSelectedGoal(null);
    setTimeout(() => setPanelGoal(null), 300);
  };

  const openTaskEdit = (task: Task) => {
    setEditingTask(task);
    setEditRepeatRule(task.repeatRule || 'NONE');
    taskForm.setFieldsValue({
      name: task.name,
      description: task.description,
      scheduledDate: task.scheduledDate ? dayjs(task.scheduledDate) : undefined,
      repeatRule: task.repeatRule || 'NONE',
      weeklyDays: task.weeklyDays ? task.weeklyDays.split(',').map(Number) : [],
      goalIds: task.goalIds || [],
    });
    setTaskEditOpen(true);
  };

  const handleTaskEditSubmit = async () => {
    const values = await taskForm.validateFields();
    const payload: any = {
      name: values.name,
      description: values.description,
      scheduledDate: values.scheduledDate ? values.scheduledDate.format('YYYY-MM-DD') : undefined,
      repeatRule: values.repeatRule || 'NONE',
      weeklyDays: values.repeatRule === 'WEEKLY' && values.weeklyDays?.length
        ? values.weeklyDays.sort().join(',') : undefined,
    };
    await taskApi.update(editingTask!.id, payload);
    await taskApi.updateGoals(editingTask!.id, values.goalIds || []);
    message.success('任务已更新');
    setTaskEditOpen(false);
    setSelectedTasks(await taskApi.getByGoal(selectedGoal!.id));
    fetchGoals();
  };

  const handleTaskDelete = (taskId: number) => {
    Modal.confirm({
      icon: <DeleteOutlined style={{ color: '#ff6b81' }} />,
      title: '确定删除这个任务吗？',
      className: 'cute-modal', centered: true,
      okText: '确定', cancelText: '取消',
      okButtonProps: { danger: true, style: { borderRadius: 20 } },
      cancelButtonProps: { style: { borderRadius: 20 } },
      onOk: async () => {
        await taskApi.delete(taskId);
        message.success('任务已删除');
        setSelectedTasks((prev) => prev.filter((t) => t.id !== taskId));
        fetchGoals();
      },
    });
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>🎯 学习目标</h2>
          <p>管理你的学习大方向</p>
        </div>
        <Space>
          <Button icon={<MenuOutlined />} onClick={openReorderModal} className="cute-btn-outline-purple">
            调整排序
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} className="cute-btn">
            新建目标
          </Button>
        </Space>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {goals.length === 0 && !loading ? (
            <Empty description="还没有学习目标，创建一个吧~" />
          ) : (
            <>
              <Row gutter={[16, 16]}>
                {goals.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((goal) => (
                  <Col span={24} key={goal.id}>
                    <Card
                      className="goal-card"
                      actions={[
                        <Button type="text" icon={<UnorderedListOutlined />}
                          onClick={() => openTaskPanel(goal)} key="tasks">
                          查看任务
                        </Button>,
                        <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(goal)} key="edit">
                          编辑
                        </Button>,
                        <Button type="text" danger icon={<DeleteOutlined />} key="delete"
                          onClick={() => {
                            Modal.confirm({
                              icon: <DeleteOutlined style={{ color: '#ff6b81' }} />,
                              title: '确定删除这个目标吗？',
                              content: '删除目标不会删除关联的任务。',
                              className: 'cute-modal',
                              centered: true,
                              okText: '确定',
                              cancelText: '取消',
                              okButtonProps: { danger: true, style: { borderRadius: 20 } },
                              cancelButtonProps: { style: { borderRadius: 20 } },
                              onOk: () => handleDelete(goal.id),
                            });
                          }}
                        >
                          删除
                        </Button>,
                      ]}
                    >
                      <Card.Meta
                        title={
                          <span style={{ fontSize: 16, fontWeight: 600, color: '#5a3d4a' }}>
                            <span className="goal-color-dot" style={{ background: goal.color || '#ff6b81' }} />
                            {goal.name}
                          </span>
                        }
                        description={goal.description || '暂无描述'}
                      />
                      <div style={{ marginTop: 12 }}>
                        {goal.totalTaskCount > 0 ? (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span style={{ color: '#b8929e', fontSize: 12 }}>任务进度</span>
                              <span style={{ color: '#5a3d4a', fontSize: 12, fontWeight: 600 }}>
                                已完成 {goal.completedTaskCount}/{goal.totalTaskCount}
                              </span>
                            </div>
                            <div style={{
                              height: 6,
                              borderRadius: 3,
                              background: '#fef0f3',
                              overflow: 'hidden',
                            }}>
                              <div style={{
                                height: '100%',
                                width: `${Math.round((goal.completedTaskCount / goal.totalTaskCount) * 100)}%`,
                                borderRadius: 3,
                                background: 'linear-gradient(90deg, #ff6b81, #f58ca0, #f9a8d4)',
                                transition: 'width 0.3s ease',
                              }} />
                            </div>
                            {goal.totalDurationMinutes > 0 && (
                              <div style={{ marginTop: 8, textAlign: 'right' }}>
                                <span style={{ color: '#b8929e', fontSize: 12 }}>
                                  ⏱️ {formatDuration(goal.totalDurationMinutes)}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#b8929e', fontSize: 13 }}>还未关联任务</span>
                        )}
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
              {goals.length > PAGE_SIZE && (
                <div style={{ textAlign: 'center', marginTop: 20 }}>
                  <Pagination
                    current={currentPage}
                    pageSize={PAGE_SIZE}
                    total={goals.length}
                    onChange={(page) => setCurrentPage(page)}
                    showSizeChanger={false}
                    size="small"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div style={{
          width: selectedGoal ? 400 : 0,
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'width 0.3s ease',
          position: 'sticky',
          top: 80,
        }}>
          {panelGoal && (
            <Card
              className="cute-card"
              style={{ width: 400 }}
              styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' } }}
              title={
                <Space>
                  <span className="goal-color-dot" style={{ background: panelGoal.color || '#ff6b81' }} />
                  <span style={{ color: '#5a3d4a', fontWeight: 600 }}>{panelGoal.name} — 任务</span>
                </Space>
              }
              extra={
                <Button type="text" icon={<CloseOutlined />}
                  onClick={closePanel} />
              }
            >
              {selectedTasks.length === 0 && !tasksLoading ? (
                <Empty description="该目标下暂无任务" />
              ) : (
                <List
                  loading={tasksLoading}
                  dataSource={[...selectedTasks].sort((a, b) => {
                    if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1;
                    if (a.status !== 'COMPLETED' && b.status === 'COMPLETED') return -1;
                    return 0;
                  })}
                  renderItem={(task) => {
                    const isCompleted = task.status === 'COMPLETED';
                    return (
                      <List.Item
                        style={{ opacity: isCompleted ? 0.5 : 1, borderBottom: '2px solid #ffe0e6', padding: '12px 0' }}
                        actions={[
                          <Button type="text" icon={<EditOutlined />}
                            onClick={() => openTaskEdit(task)} key="edit" />,
                          <Button type="text" danger icon={<DeleteOutlined />}
                            onClick={() => handleTaskDelete(task.id)} key="delete" />,
                        ]}
                      >
                        <List.Item.Meta
                          title={
                            <Space>
                              <span style={{
                                color: isCompleted ? '#b8929e' : '#5a3d4a',
                                fontWeight: isCompleted ? 400 : 600,
                                textDecoration: isCompleted ? 'line-through' : 'none',
                              }}>
                                {task.name}
                              </span>
                              {isCompleted && <Tag color="success" style={{ fontSize: 11 }}>已完成</Tag>}
                            </Space>
                          }
                          description={
                            <Space size={4} wrap>
                              {task.repeatRule === 'DAILY' && <Tag color="#4ecdc4">每天</Tag>}
                              {task.repeatRule === 'WEEKLY' && <Tag color="#a29bfe">每周</Tag>}
                              {task.scheduledDate && <Tag>{dayjs(task.scheduledDate).format('M月D日')}</Tag>}
                              {task.description && <span style={{ color: '#b8929e', fontSize: 13 }}>{task.description}</span>}
                            </Space>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              )}
            </Card>
          )}
        </div>
      </div>

      <Modal
        className="cute-modal"
        title={editingGoal ? '编辑目标' : '新建目标'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input className="cute-input" placeholder="例如：算法学习" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea className="cute-input" rows={3} placeholder="简单描述这个目标" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        className="cute-modal" title="编辑任务"
        open={taskEditOpen} onOk={handleTaskEditSubmit}
        onCancel={() => setTaskEditOpen(false)} width={520}
      >
        <Form form={taskForm} layout="vertical" initialValues={{ repeatRule: 'NONE' }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入任务名称' }]}>
            <Input className="cute-input" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea className="cute-input" rows={3} />
          </Form.Item>
          <Form.Item name="goalIds" label="关联目标">
            <Select placeholder="选择目标（可多选）" allowClear mode="multiple" maxTagCount={3} className="cute-input">
              {goals.map((g) => <Select.Option key={g.id} value={g.id}>{g.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="repeatRule" label="重复规则" initialValue="NONE">
            <Select className="cute-input" onChange={(value) => setEditRepeatRule(value)}
              options={[
                { label: '不重复', value: 'NONE' },
                { label: '每天', value: 'DAILY' },
                { label: '每周', value: 'WEEKLY' },
              ]} />
          </Form.Item>
          {editRepeatRule === 'NONE' && (
            <Form.Item name="scheduledDate" label="安排日期（选填）">
              <DatePicker className="cute-input" style={{ width: '100%' }} />
            </Form.Item>
          )}
          {editRepeatRule === 'WEEKLY' && (
            <Form.Item name="weeklyDays" label="选择星期">
              <Checkbox.Group options={[
                { label: '周一', value: 1 }, { label: '周二', value: 2 },
                { label: '周三', value: 3 }, { label: '周四', value: 4 },
                { label: '周五', value: 5 }, { label: '周六', value: 6 },
                { label: '周日', value: 7 },
              ]} />
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
          拖拽目标调整顺序，靠前的目标将优先展示在各个页面顶部。
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

export default GoalsPage;
