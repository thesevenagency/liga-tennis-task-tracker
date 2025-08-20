import React, { useState, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

// --- DATA TYPES AND CONSTANTS ---
const DEPARTMENTS = ['DMA', 'HR', 'FIN', 'OPS', 'MKT'] as const;
type Dept = typeof DEPARTMENTS[number];

const CATEGORIES = ['System', 'Automation', 'Data', 'KPI', 'Docs', 'People', 'Implementation', 'Events'] as const;
type Category = typeof CATEGORIES[number];

type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

const STATUSES = ['Backlog', 'Planned', 'In Progress', 'Blocked', 'Review', 'Done', 'Canceled'] as const;
type Status = typeof STATUSES[number];

const MATRIX_QUADRANTS = ['Q1 Do First', 'Q2 Schedule', 'Q3 Delegate', 'Q4 Don’t Do'] as const;
type Matrix = typeof MATRIX_QUADRANTS[number];

type View = 'list' | 'kanban' | 'matrix' | 'dashboard';

interface User {
  id: number;
  name: string;
  dept: Dept;
}

interface Task {
  id: number;
  parentId?: number;
  title: string;
  ownerId: number;
  dept: Dept;
  category: Category;
  priority: Priority;
  status: Status;
  dueDate: string; // YYYY-MM-DD
  doneDate?: string;
  serviceDate: string;
  matrix: Matrix;
  archived: boolean;
  taskLevel: 1 | 2 | 3 | 4;
  isRock: boolean;
}

// --- INITIAL MOCK DATA ---
const USERS: User[] = [
  { id: 1, name: 'Alex', dept: 'DMA' },
  { id: 2, name: 'Maria', dept: 'MKT' },
  { id: 3, name: 'David', dept: 'OPS' },
  { id: 4, name: 'Sophia', dept: 'FIN' },
  { id: 5, name: 'John', dept: 'HR' },
];

const INITIAL_TASKS: Task[] = [
  { id: 1, title: 'Launch Q3 Marketing Campaign', ownerId: 2, dept: 'MKT', category: 'Events', priority: 'Critical', status: 'In Progress', dueDate: '2024-09-15', serviceDate: '2024-09-01', matrix: 'Q1 Do First', archived: false, taskLevel: 4, isRock: true },
  { id: 2, title: 'Develop KPI reporting automation', ownerId: 1, dept: 'DMA', category: 'Automation', priority: 'High', status: 'Done', dueDate: '2024-08-20', doneDate: '2024-08-18', serviceDate: '2024-08-01', matrix: 'Q2 Schedule', archived: false, taskLevel: 3, isRock: true },
  { id: 3, title: 'Organize team offsite event', ownerId: 5, dept: 'HR', category: 'People', priority: 'Medium', status: 'Planned', dueDate: '2024-10-01', serviceDate: '2024-09-01', matrix: 'Q2 Schedule', archived: false, taskLevel: 2, isRock: false },
  { id: 4, title: 'Update financial forecast models', ownerId: 4, dept: 'FIN', category: 'Data', priority: 'High', status: 'Review', dueDate: '2024-08-30', serviceDate: '2024-08-01', matrix: 'Q1 Do First', archived: false, taskLevel: 3, isRock: false },
  { id: 5, title: 'Onboard new operations analyst', ownerId: 3, dept: 'OPS', category: 'People', priority: 'Medium', status: 'Done', dueDate: '2024-08-10', doneDate: '2024-08-09', serviceDate: '2024-08-01', matrix: 'Q3 Delegate', archived: false, taskLevel: 2, isRock: false },
  { id: 6, title: 'Fix login authentication bug', ownerId: 1, dept: 'DMA', category: 'System', priority: 'Critical', status: 'Blocked', dueDate: '2024-08-25', serviceDate: '2024-08-01', matrix: 'Q1 Do First', archived: false, taskLevel: 3, isRock: false },
  { id: 7, title: 'Document new API endpoints', ownerId: 1, dept: 'DMA', category: 'Docs', priority: 'Low', status: 'Backlog', dueDate: '2024-09-20', serviceDate: '2024-09-01', matrix: 'Q4 Don’t Do', archived: false, taskLevel: 1, isRock: false },
  { id: 8, title: 'Parent Task Example', ownerId: 2, dept: 'MKT', category: 'Implementation', priority: 'High', status: 'In Progress', dueDate: '2024-09-30', serviceDate: '2024-09-01', matrix: 'Q2 Schedule', archived: false, taskLevel: 4, isRock: true },
  { id: 9, parentId: 8, title: 'Subtask 1 for campaign', ownerId: 2, dept: 'MKT', category: 'Implementation', priority: 'High', status: 'Done', dueDate: '2024-09-10', doneDate: '2024-09-09', serviceDate: '2024-09-01', matrix: 'Q2 Schedule', archived: false, taskLevel: 2, isRock: false },
  { id: 10, parentId: 8, title: 'Subtask 2 for campaign', ownerId: 2, dept: 'MKT', category: 'Implementation', priority: 'High', status: 'In Progress', dueDate: '2024-09-25', serviceDate: '2024-09-01', matrix: 'Q2 Schedule', archived: false, taskLevel: 3, isRock: false },
  { id: 11, title: 'Canceled feature request', ownerId: 3, dept: 'OPS', category: 'System', priority: 'Low', status: 'Canceled', dueDate: '2024-08-28', serviceDate: '2024-08-01', matrix: 'Q4 Don’t Do', archived: false, taskLevel: 2, isRock: false },
];

// --- HELPER FUNCTIONS & COMPONENTS ---
const calculatePoints = (task: Task, allTasks: Task[]): number => {
    if (task.archived || task.status === 'Canceled') return 0;
    // Parent tasks do not get points, only subtasks
    if (allTasks.some(t => t.parentId === task.id)) return 0;

    let points = 0;
    const levelPoints = { 1: 10, 2: 20, 3: 40, 4: 80 };
    points += levelPoints[task.taskLevel];

    const priorityBonus = { Low: 0, Medium: 5, High: 10, Critical: 25 };
    points += priorityBonus[task.priority];

    if (task.isRock) {
        points = Math.round(points * 1.5);
    }
    
    return points;
};

const getDaysLeft = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const PriorityBadge = ({ priority }: { priority: Priority }) => <span className={`priority-badge priority-${priority}`}>{priority}</span>;
const StatusBadge = ({ status }: { status: Status }) => <span className={`status-badge status-${status.replace(/\s+/g, '-')}`}>{status}</span>;
const getUserName = (id: number) => USERS.find(u => u.id === id)?.name || 'N/A';


// --- VIEW COMPONENTS ---
const TaskTableView = ({ tasks, onAddTask }) => {
    const [filters, setFilters] = useState({ search: '', owner: 'all', dept: 'all', category: 'all', priority: 'all' });

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            if (task.archived) return false;
            const searchLower = filters.search.toLowerCase();
            return (
                (task.title.toLowerCase().includes(searchLower) || String(task.id).includes(searchLower)) &&
                (filters.owner === 'all' || task.ownerId === parseInt(filters.owner)) &&
                (filters.dept === 'all' || task.dept === filters.dept) &&
                (filters.category === 'all' || task.category === filters.category) &&
                (filters.priority === 'all' || task.priority === filters.priority)
            );
        });
    }, [tasks, filters]);

    return (
        <>
            <div className="view-header">
                <h2>Task List</h2>
                <button className="add-task-btn" onClick={onAddTask}>Add New Task</button>
            </div>
            <div className="filters-container">
                <input type="text" name="search" placeholder="Search by ID or Title..." onChange={handleFilterChange} />
                <select name="owner" onChange={handleFilterChange}><option value="all">All Owners</option>{USERS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
                <select name="dept" onChange={handleFilterChange}><option value="all">All Depts</option>{DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}</select>
                <select name="category" onChange={handleFilterChange}><option value="all">All Categories</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                <select name="priority" onChange={handleFilterChange}><option value="all">All Priorities</option>{['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p} value={p}>{p}</option>)}</select>
            </div>
            <div className="table-container">
                <table>
                    <thead><tr><th>ID</th><th>Task</th><th>Owner</th><th>Dept</th><th>Category</th><th>Priority</th><th>Status</th><th>Due Date</th><th>Points</th></tr></thead>
                    <tbody>
                        {filteredTasks.map(task => (
                            <tr key={task.id}>
                                <td>{task.id}</td><td>{task.title}</td><td>{getUserName(task.ownerId)}</td><td>{task.dept}</td><td>{task.category}</td>
                                <td><PriorityBadge priority={task.priority} /></td><td><StatusBadge status={task.status} /></td><td>{task.dueDate}</td><td>{calculatePoints(task, tasks)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

const KanbanView = ({ tasks, updateTaskStatus }) => {
    const handleDragStart = (e, taskId) => e.dataTransfer.setData("taskId", taskId);
    const handleDrop = (e, newStatus) => {
        e.preventDefault();
        const taskId = parseInt(e.dataTransfer.getData("taskId"), 10);
        updateTaskStatus(taskId, newStatus);
        e.currentTarget.classList.remove('drag-over');
    };
    const handleDragOver = (e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); };
    const handleDragLeave = (e) => e.currentTarget.classList.remove('drag-over');

    return (
        <div className="kanban-board">
            {STATUSES.map(status => (
                <div key={status} className="kanban-column">
                    <h2>{status}</h2>
                    <div className="kanban-tasks" onDrop={(e) => handleDrop(e, status)} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
                        {tasks.filter(t => t.status === status && !t.archived).map(task => (
                            <div key={task.id} className={`task-card priority-${task.priority}`} draggable onDragStart={(e) => handleDragStart(e, task.id)}>
                                <p className="task-card-title">{task.title}</p>
                                <div className="task-card-footer">
                                    <span>{getUserName(task.ownerId)}</span>
                                    <span>Due: {task.dueDate}</span>
                                    <span className="task-card-points">{calculatePoints(task, tasks)} pts</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const EisenhowerMatrixView = ({ tasks }) => {
    return (
        <div className="eisenhower-matrix">
            {MATRIX_QUADRANTS.map(quadrant => (
                <div key={quadrant} className="quadrant">
                    <h3>{quadrant}</h3>
                    <div className="quadrant-tasks">
                        {tasks.filter(t => t.matrix === quadrant && !t.archived && t.status !== 'Done' && t.status !== 'Canceled').map(task => (
                             <div key={task.id} className={`task-card priority-${task.priority}`}>
                                <p className="task-card-title">{task.title}</p>
                                <div className="task-card-footer">
                                    <span>{getUserName(task.ownerId)}</span>
                                    <span>Due: {task.dueDate}</span>
                                    <span className="task-card-points">{calculatePoints(task, tasks)} pts</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const BarChart = ({ data, title }) => (
    <div className="dashboard-widget bar-chart-widget">
        <h3>{title}</h3>
        <div className="bar-chart">
            {data.map(item => (
                <div className="bar-item" key={item.label}>
                    <div className="bar" style={{ width: `${item.percentage}%` }} title={item.value}></div>
                    <span className="bar-label">{item.label}</span>
                    <span className="bar-value">{item.value}</span>
                </div>
            ))}
        </div>
    </div>
);

const DashboardView = ({ tasks }) => {
    const activeTasks = useMemo(() => tasks.filter(t => !t.archived && t.status !== 'Canceled'), [tasks]);

    const kpiData = useMemo(() => {
        const done = activeTasks.filter(t => t.status === 'Done').length;
        const total = activeTasks.length;
        const overdue = activeTasks.filter(t => t.status !== 'Done' && getDaysLeft(t.dueDate) < 0).length;
        return {
            done,
            overdue,
            percentDone: total > 0 ? Math.round((done / total) * 100) : 0,
            inProgress: activeTasks.filter(t => t.status === 'In Progress').length,
            open: activeTasks.filter(t => !['Done', 'Canceled'].includes(t.status)).length,
        };
    }, [activeTasks]);
    
    const pointsData = useMemo(() => {
        const getPoints = (t) => calculatePoints(t, tasks);
        const ownerScores = USERS.map(user => ({
            label: user.name,
            dept: user.dept,
            tasksDone: activeTasks.filter(t => t.ownerId === user.id && t.status === 'Done').length,
            value: activeTasks.filter(t => t.ownerId === user.id && t.status === 'Done').reduce((sum, t) => sum + getPoints(t), 0),
        })).sort((a,b) => b.value - a.value);

        const aggregateBy = (key) => {
            const map = new Map<string, number>();
            activeTasks.forEach(task => {
                if (task.status === 'Done') {
                   map.set(task[key], (map.get(task[key]) || 0) + getPoints(task));
                }
            });
            const data = Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a,b) => b.value - a.value);
            const max = Math.max(...data.map(d => d.value), 0);
            return data.map(d => ({...d, percentage: max > 0 ? (d.value / max) * 100 : 0 }));
        };

        return {
            topOwners: ownerScores.slice(0, 5),
            byDept: aggregateBy('dept'),
            byCategory: aggregateBy('category'),
        }
    }, [activeTasks, tasks]);

    const overdueTasks = useMemo(() => activeTasks
        .filter(t => t.status !== 'Done' && getDaysLeft(t.dueDate) < 0)
        .sort((a,b) => getDaysLeft(a.dueDate) - getDaysLeft(b.dueDate)), 
    [activeTasks]);

    return (
        <div className="dashboard-grid">
            <div className="kpi-header">
                <div className="kpi-card"><span>{kpiData.done}</span><p>Done</p></div>
                <div className="kpi-card"><span>{kpiData.overdue}</span><p>Overdue</p></div>
                <div className="kpi-card"><span>{kpiData.percentDone}%</span><p>% Done</p></div>
                <div className="kpi-card"><span>{kpiData.inProgress}</span><p>In Progress</p></div>
                <div className="kpi-card"><span>{kpiData.open}</span><p>Open Tasks</p></div>
            </div>
            <div className="dashboard-widget top-owners">
                <h3>Top 5 Owners</h3>
                <table>
                    <thead><tr><th>Owner</th><th>Dept</th><th>Done</th><th>Points</th></tr></thead>
                    <tbody>{pointsData.topOwners.map(u => <tr key={u.label}><td>{u.label}</td><td>{u.dept}</td><td>{u.tasksDone}</td><td>{u.value}</td></tr>)}</tbody>
                </table>
            </div>
            <BarChart data={pointsData.byDept} title="Points by Department" />
            <BarChart data={pointsData.byCategory} title="Points by Category" />
            <div className="dashboard-widget overdue-tasks">
                <h3>Overdue Tasks</h3>
                <table>
                     <thead><tr><th>Owner</th><th>Task</th><th>Dept</th><th>Days Overdue</th></tr></thead>
                     <tbody>{overdueTasks.map(t => <tr key={t.id}><td>{getUserName(t.ownerId)}</td><td>{t.title}</td><td>{t.dept}</td><td>{Math.abs(getDaysLeft(t.dueDate))}</td></tr>)}</tbody>
                </table>
            </div>
        </div>
    );
};

const AddTaskModal = ({ isOpen, onClose, onAddTask }) => {
    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newTaskData = {
            title: formData.get('title') as string,
            ownerId: parseInt(formData.get('ownerId') as string, 10),
            dept: USERS.find(u => u.id === parseInt(formData.get('ownerId') as string, 10))?.dept,
            category: formData.get('category') as Category,
            priority: formData.get('priority') as Priority,
            dueDate: formData.get('dueDate') as string,
            matrix: formData.get('matrix') as Matrix,
            taskLevel: parseInt(formData.get('taskLevel') as string, 10) as Task['taskLevel'],
            isRock: formData.has('isRock'),
        };
        onAddTask(newTaskData);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>Add New Task</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group"><label>Task Title</label><input type="text" name="title" required /></div>
                    <div className="form-group"><label>Owner</label><select name="ownerId" required>{USERS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
                    <div className="form-group"><label>Category</label><select name="category" required>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div className="form-group"><label>Priority</label><select name="priority" defaultValue="Medium">{['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                    <div className="form-group"><label>Due Date</label><input type="date" name="dueDate" required /></div>
                    <div className="form-group"><label>Eisenhower Matrix</label><select name="matrix" required>{MATRIX_QUADRANTS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                    <div className="form-group"><label>Task Level</label><select name="taskLevel" defaultValue="2">{[1,2,3,4].map(l => <option key={l} value={l}>L{l}</option>)}</select></div>
                    <div className="form-group form-group-checkbox"><label htmlFor="isRock">Rocks Focus?</label><input type="checkbox" id="isRock" name="isRock" /></div>
                    <div className="modal-actions"><button type="button" className="btn-cancel" onClick={onClose}>Cancel</button><button type="submit" className="btn-submit">Add Task</button></div>
                </form>
            </div>
        </div>
    );
};

// --- MAIN APP COMPONENT ---
const App = () => {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const updateTaskStatus = useCallback((taskId: number, newStatus: Status) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, status: newStatus, doneDate: newStatus === 'Done' ? new Date().toISOString().split('T')[0] : task.doneDate } : task
      )
    );
  }, []);

  const handleAddTask = (newTaskData) => {
      setTasks(prevTasks => {
          const newId = Math.max(...prevTasks.map(t => t.id), 0) + 1;
          const newTask: Task = {
              ...newTaskData,
              id: newId,
              status: 'Backlog',
              archived: false,
              serviceDate: new Date().toISOString().split('T')[0],
          };
          return [...prevTasks, newTask];
      });
      setIsModalOpen(false);
  }

  const renderView = () => {
    switch (currentView) {
      case 'kanban': return <KanbanView tasks={tasks} updateTaskStatus={updateTaskStatus} />;
      case 'matrix': return <EisenhowerMatrixView tasks={tasks} />;
      case 'dashboard': return <DashboardView tasks={tasks} />;
      case 'list': default: return <TaskTableView tasks={tasks} onAddTask={() => setIsModalOpen(true)} />;
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>Liga.Tennis Tracker</h1>
        <nav>
          <button onClick={() => setCurrentView('dashboard')} className={currentView === 'dashboard' ? 'active' : ''}>KPI Dashboard</button>
          <button onClick={() => setCurrentView('list')} className={currentView === 'list' ? 'active' : ''}>Task List</button>
          <button onClick={() => setCurrentView('kanban')} className={currentView === 'kanban' ? 'active' : ''}>Kanban Board</button>
          <button onClick={() => setCurrentView('matrix')} className={currentView === 'matrix' ? 'active' : ''}>Eisenhower Matrix</button>
        </nav>
      </header>
      <main>
        {renderView()}
      </main>
      <AddTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAddTask={handleAddTask} />
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
