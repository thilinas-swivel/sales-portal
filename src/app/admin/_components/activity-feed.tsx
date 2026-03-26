'use client';

import { useState } from 'react';
import {
  Phone,
  Mail,
  Calendar,
  FileText,
  MessageSquare,
  Clock,
  CheckSquare,
  Plus,
  X,
} from 'lucide-react';

const activityTypes = {
  call: {
    icon: Phone,
    color: 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400',
  },
  email: { icon: Mail, color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' },
  meeting: {
    icon: Calendar,
    color: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
  },
  note: {
    icon: FileText,
    color: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  },
  message: {
    icon: MessageSquare,
    color: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
  },
};

const activities = [
  {
    id: 1,
    type: 'call' as const,
    user: 'Sarah Johnson',
    desc: 'Called John Smith at TechCorp',
    time: '10 min ago',
  },
  {
    id: 2,
    type: 'email' as const,
    user: 'Michael Chen',
    desc: 'Sent proposal to Emily Chen',
    time: '25 min ago',
  },
  {
    id: 3,
    type: 'meeting' as const,
    user: 'Jane Smith',
    desc: 'Demo meeting with CloudSync',
    time: '1 hr ago',
  },
  {
    id: 4,
    type: 'note' as const,
    user: 'John Doe',
    desc: 'Updated notes for Innovation Labs',
    time: '2 hrs ago',
  },
  {
    id: 5,
    type: 'message' as const,
    user: 'Sarah Parker',
    desc: 'Messaged Enterprise Hub team',
    time: '3 hrs ago',
  },
];

export function ActivityFeed() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto">
        {activities.map((activity) => {
          const { icon: Icon, color } = activityTypes[activity.type];
          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div
                className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white">
                  <span className="font-medium">{activity.user}</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{activity.desc}</p>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{activity.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const priorityColors: Record<string, string> = {
  high: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  medium: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  low: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
};

const tasks = [
  {
    id: 1,
    title: 'Follow up with TechCorp lead',
    priority: 'high',
    due: '2:00 PM',
    assignee: 'Sarah J.',
  },
  {
    id: 2,
    title: 'Review partner sync reports',
    priority: 'medium',
    due: '3:30 PM',
    assignee: 'John D.',
  },
  {
    id: 3,
    title: 'Update lead scoring model',
    priority: 'low',
    due: '5:00 PM',
    assignee: 'Jane S.',
  },
  {
    id: 4,
    title: 'Prepare weekly analytics report',
    priority: 'medium',
    due: 'Tomorrow',
    assignee: 'Mike W.',
  },
  {
    id: 5,
    title: 'Schedule partner onboarding call',
    priority: 'high',
    due: 'Tomorrow',
    assignee: 'Sarah P.',
  },
];

export function UpcomingTasks() {
  const [showAddTask, setShowAddTask] = useState(false);
  const [checkedTasks, setCheckedTasks] = useState<Set<number>>(new Set());

  const toggleTask = (id: number) => {
    setCheckedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Upcoming Tasks</h3>
        <button
          onClick={() => setShowAddTask(true)}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
              checkedTasks.has(task.id) ? 'opacity-50' : ''
            }`}
          >
            <button onClick={() => toggleTask(task.id)} className="mt-0.5 flex-shrink-0">
              <CheckSquare
                className={`w-4.5 h-4.5 ${checkedTasks.has(task.id) ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}`}
              />
            </button>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm text-gray-900 dark:text-white ${checkedTasks.has(task.id) ? 'line-through' : ''}`}
              >
                {task.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-1.5 py-0.5 text-xs font-medium rounded ${priorityColors[task.priority]}`}
                >
                  {task.priority}
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {task.due}
                </span>
                <span className="text-xs text-gray-400">· {task.assignee}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowAddTask(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Task</h3>
              <button
                onClick={() => setShowAddTask(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  placeholder="Enter task title"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowAddTask(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowAddTask(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  Create Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
