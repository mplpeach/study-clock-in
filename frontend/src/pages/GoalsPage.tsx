import React, { useState, useEffect } from 'react';
import {
  Card, Button, Modal, Form, Input, ColorPicker, Row, Col, Tag, Empty, Popconfirm, message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { goalApi } from '../api';
import type { Goal } from '../api';
import { useNavigate } from 'react-router-dom';

const GoalsPage: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const data = await goalApi.getAll();
      setGoals(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGoals(); }, []);

  const openCreate = () => {
    setEditingGoal(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setEditingGoal(goal);
    form.setFieldsValue({ name: goal.name, description: goal.description, color: goal.color });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const color = typeof values.color === 'string' ? values.color : values.color?.toHexString?.() || '#ff6b81';
    if (editingGoal) {
      await goalApi.update(editingGoal.id, { ...values, color });
      message.success('目标已更新 ✨');
    } else {
      await goalApi.create({ ...values, color });
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

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>🎯 学习目标</h2>
          <p>管理你的学习大方向</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} className="cute-btn">
          新建目标
        </Button>
      </div>

      {goals.length === 0 && !loading ? (
        <Empty description="还没有学习目标，创建一个吧~" />
      ) : (
        <Row gutter={[16, 16]}>
          {goals.map((goal) => (
            <Col span={24} key={goal.id}>
              <Card
                className="goal-card"
                actions={[
                  <Button type="text" icon={<UnorderedListOutlined />}
                    onClick={() => navigate(`/tasks?goalId=${goal.id}`)} key="tasks">
                    查看任务
                  </Button>,
                  <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(goal)} key="edit">
                    编辑
                  </Button>,
                  <Popconfirm title="确定删除吗？" onConfirm={() => handleDelete(goal.id)} key="delete">
                    <Button type="text" danger icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>,
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
                  {goal.tasks?.length > 0 ? (
                    goal.tasks.map((t) => <Tag className="cute-tag" color="#ff6b81" key={t.id}>{t.name}</Tag>)
                  ) : (
                    <span style={{ color: '#b8929e', fontSize: 13 }}>还未关联任务</span>
                  )}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

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
          <Form.Item name="color" label="颜色" initialValue="#ff6b81">
            <ColorPicker />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default GoalsPage;
