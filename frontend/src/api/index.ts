import client from './client';

export interface Goal {
  id: number;
  name: string;
  description?: string;
  color: string;
  sortOrder: number;
  tasks: Task[];
}

export interface Task {
  id: number;
  name: string;
  description?: string;
  goalId?: number;
  goalIds?: number[];
  scheduledDate?: string;
  repeatRule?: string;
  weeklyDays?: string;
}

export const goalApi = {
  getAll: () => client.get<any, Goal[]>('/goals'),
  getById: (id: number) => client.get<any, Goal>(`/goals/${id}`),
  create: (data: { name: string; description?: string; color?: string }) =>
    client.post<any, Goal>('/goals', data),
  update: (id: number, data: { name?: string; description?: string; color?: string }) =>
    client.put<any, Goal>(`/goals/${id}`, data),
  delete: (id: number) => client.delete(`/goals/${id}`),
};

export const taskApi = {
  getAll: () => client.get<any, Task[]>('/tasks'),
  getById: (id: number) => client.get<any, Task>(`/tasks/${id}`),
  search: (keyword: string) => client.get<any, Task[]>('/tasks/search', { params: { keyword } }),
  create: (data: { name: string; description?: string; scheduledDate?: string; repeatRule?: string; weeklyDays?: string }) =>
    client.post<any, Task>('/tasks', data),
  update: (id: number, data: { name?: string; description?: string; scheduledDate?: string; repeatRule?: string; weeklyDays?: string }) =>
    client.put<any, Task>(`/tasks/${id}`, data),
  delete: (id: number) => client.delete(`/tasks/${id}`),
  bindToGoal: (taskId: number, goalId: number) =>
    client.post('/tasks/bind', { taskId, goalId }),
  unbindFromGoal: (taskId: number, goalId: number) =>
    client.post('/tasks/unbind', { taskId, goalId }),
  getByGoal: (goalId: number) => client.get<any, Task[]>(`/tasks/by-goal/${goalId}`),
};

export interface TaskInstance {
  id: number;
  taskId: number;
  taskName: string;
  goalId?: number;
  goalName?: string;
  scheduledDate: string;
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
}

export const instanceApi = {
  create: (taskId: number, date: string) =>
    client.post<any, TaskInstance>('/instances', null, { params: { taskId, date } }),
  batchCreate: (taskId: number, dates: string[]) =>
    client.post<any, TaskInstance[]>('/instances/batch', { taskId, dates }),
  getByDate: (date: string) =>
    client.get<any, TaskInstance[]>('/instances/date', { params: { date } }),
  getCalendar: (year: number, month: number) =>
    client.get<any, Record<string, TaskInstance[]>>('/instances/calendar', { params: { year, month } }),
  getOverdue: () => client.get<any, TaskInstance[]>('/instances/overdue'),
  delete: (id: number) => client.delete(`/instances/${id}`),
};

export interface CheckInRecord {
  id: number;
  taskInstanceId: number;
  taskId?: number;
  taskName?: string;
  goalId?: number;
  goalName?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  content?: string;
  note?: string;
  checkInType: 'REALTIME' | 'MANUAL';
  imageUrls: string[];
}

export const checkInApi = {
  start: (taskInstanceId: number) =>
    client.post<any, CheckInRecord>('/checkins/start', { taskInstanceId }),
  end: (recordId: number, data?: { content?: string; note?: string; complete?: boolean; durationSeconds?: number }, images?: File[]) => {
    const formData = new FormData();
    const blob = new Blob([JSON.stringify({ recordId, ...data })], { type: 'application/json' });
    formData.append('request', blob);
    if (images) {
      images.forEach((f) => formData.append('images', f));
    }
    return client.post<any, CheckInRecord>('/checkins/end', formData);
  },
  manual: (
    taskInstanceId: number,
    data: {
      startTime?: string;
      endTime?: string;
      durationMinutes?: number;
      content?: string;
      note?: string;
    },
    images?: File[]
  ) => {
    const formData = new FormData();
    const blob = new Blob([JSON.stringify({ taskInstanceId, ...data })], { type: 'application/json' });
    formData.append('request', blob);
    if (images) {
      images.forEach((f) => formData.append('images', f));
    }
    return client.post<any, CheckInRecord>('/checkins/manual', formData);
  },
  getById: (id: number) => client.get<any, CheckInRecord>(`/checkins/${id}`),
  getByInstance: (instanceId: number) =>
    client.get<any, CheckInRecord[]>(`/checkins/by-instance/${instanceId}`),
  getAll: () => client.get<any, CheckInRecord[]>('/checkins'),
};

export interface GoalStats {
  goalId: number;
  goalName: string;
  color: string;
  totalDurationMinutes: number;
  totalTasks: number;
  completedTasks: number;
}

export interface DailyStats {
  date: string;
  count: number;
  durationMinutes: number;
}

export interface Statistics {
  totalCheckInDays: number;
  currentStreak: number;
  longestStreak: number;
  totalDurationMinutes: number;
  dailyStats: DailyStats[];
  goalStats: GoalStats[];
}

export const statisticsApi = {
  get: () => client.get<any, Statistics>('/statistics'),
};
