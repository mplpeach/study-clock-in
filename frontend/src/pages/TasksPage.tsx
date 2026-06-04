import React, { useState, useEffect } from 'react';
import {
  Card, Button, Modal, Form, Input, Select, DatePicker, Checkbox, Table, Tag, Popconfirm, message, Space,
} from 'antd';
import { PlusOutlined, LinkOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { taskApi, goalApi } from '../api';
import type { Task, Goal } from '../api';
import { useSearchParams } from 'react-router-dom';

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [bindModalOpen, setBindModalOpen] = useState(false);
  const [bindTaskId, setBindTaskId] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [repeatRule, setRepeatRule] = useState<string>('NONE');
  const [form] = Form.useForm();
  const [bindForm] = Form.useForm();
  const [searchParams] = useSearchParams();
  const goalIdFilter = searchParams.get('goalId');

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

  useEffect(() => {
    fetchTasks();
    fetchGoals();
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
      message.success('任务已更新 ✨');
    } else {
      await taskApi.create(payload);
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

  const handleBind = async () => {
    const values = await bindForm.validateFields();
    await taskApi.bindToGoal(bindTaskId!, values.goalId);
    message.success('已关联到目标 💕');
    setBindModalOpen(false);
    fetchTasks();
  };

  const columns = [
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
      title: '关联目标',
      key: 'goals',
      width: 180,
      render: (_: unknown, record: Task) => {
        const ids = record.goalIds || (record.goalId ? [record.goalId] : []);
        if (ids.length === 0) return <Tag className="cute-tag">未关联</Tag>;
        return (
          <Space size={4} wrap>
            {ids.map((gid: number) => {
              const goal = goals.find((g) => g.id === gid);
              return goal ? (
                <Tag key={gid} className="cute-tag" color={goal.color || '#ff6b81'}>{goal.name}</Tag>
              ) : null;
            })}
          </Space>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 280,
      render: (_: unknown, record: Task) => (
        <Space>
          <Button type="link" style={{ color: '#a29bfe' }} icon={<LinkOutlined />} size="small"
            onClick={() => { setBindTaskId(record.id); bindForm.resetFields(); setBindModalOpen(true); }}>
            关联
          </Button>
          <Button type="link" style={{ color: '#8c6f7a' }} icon={<EditOutlined />} size="small" onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} size="small">删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>📋 学习任务</h2>
          <p>{goalIdFilter ? '当前目标下的任务' : '所有可复用的学习任务'}</p>
        </div>
        <Space>
          <Input.Search
            placeholder="搜索任务"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 200 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} className="cute-btn">
            新建任务
          </Button>
        </Space>
      </div>

      <Card className="cute-card">
        <Table
          dataSource={tasks}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          className="cute-table"
        />
      </Card>

      <Modal className="cute-modal" title={editingTask ? '编辑任务' : '新建任务'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} width={520}>
        <Form form={form} layout="vertical" initialValues={{ repeatRule: 'NONE' }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入任务名称' }]}>
            <Input className="cute-input" placeholder="例如：刷LeetCode" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea className="cute-input" rows={3} />
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

      <Modal className="cute-modal" title="关联到目标" open={bindModalOpen} onOk={handleBind} onCancel={() => setBindModalOpen(false)}>
        <Form form={bindForm} layout="vertical">
          <Form.Item name="goalId" label="选择目标" rules={[{ required: true, message: '请选择目标' }]}>
            <Select className="cute-input" placeholder="请选择目标">
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

export default TasksPage;
