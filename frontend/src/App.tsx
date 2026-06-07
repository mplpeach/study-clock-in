import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TimerProvider } from './contexts/TimerContext';
import AppLayout from './components/Layout';
import GoalsPage from './pages/GoalsPage';
import TasksPage from './pages/TasksPage';
import CheckInPage from './pages/CheckInPage';
import CalendarPage from './pages/CalendarPage';
import StatisticsPage from './pages/StatisticsPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <TimerProvider>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/checkin" replace />} />
            <Route path="/checkin" element={<CheckInPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
          </Routes>
        </AppLayout>
      </TimerProvider>
    </BrowserRouter>
  );
};

export default App;
