import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MenuOutlined } from '@ant-design/icons';
import type { Goal } from '../api';

const SortableGoalItem: React.FC<{ id: number; goal: Goal }> = ({ id, goal }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`sort-item${isDragging ? ' dragging' : ''}`} {...attributes}>
      <span className="sort-item-handle" {...listeners}>
        <MenuOutlined />
      </span>
      <span className="goal-color-dot" style={{ background: goal.color }} />
      <span className="sort-item-name">{goal.name}</span>
    </div>
  );
};

export default SortableGoalItem;
