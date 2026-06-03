import React, { useState, useEffect } from 'react';
import {
  Card, Button, Modal, Form, Input, Select, Table, Tag, Popconfirm, message, Space,
} from 'antd';
import { PlusOutlined, LinkOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
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
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    form.setFieldsValue({ name: task.name, description: task.description });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingTask) {
      await taskApi.update(editingTask.id, values);
      message.success('任务已更新 ✨');
    } else {
      await taskApi.create(values);
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
      width: 180,
      render: (name: string) => <strong style={{ color: '#5a3d4a' }}>{name}</strong>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
    },
    {
      title: '关联目标',
      key: 'goals',
      width: 200,
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
      width: 320,
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
          scroll={{ x: 900 }}
          className="cute-table"
        />
      </Card>

      <Modal className="cute-modal" title={editingTask ? '编辑任务' : '新建任务'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入任务名称' }]}>
            <Input className="cute-input" placeholder="例如：刷LeetCode" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea className="cute-input" rows={3} />
          </Form.Item>
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
