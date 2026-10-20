import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsPage from './SettingsPage';
import api from '../services/api';

let mockUser;
const mockSetUser = jest.fn();
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser, setUser: mockSetUser }) }));
jest.mock('react-router-dom', () => ({
  useSearchParams: () => {
    const [params, setParams] = require('react').useState(new URLSearchParams());
    return [params, next => setParams(new URLSearchParams(next))];
  },
}));
jest.mock('../components/StudentSidebar', () => () => null);
jest.mock('../components/TeacherSidebar', () => () => null);
jest.mock('../components/AppNotificationSettings', () => () => null);
jest.mock('../components/AppUpdates', () => () => null);
jest.mock('../services/api', () => ({ __esModule: true, default: { get: jest.fn(), put: jest.fn() } }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  document.body.classList.remove('dark-theme');
  mockUser = { id: 'student', role: 'student', name: 'Sample Student', email: 'student@example.test', studentId: '2202001', department: 'EDTE' };
  api.get.mockResolvedValue({ data: { requests: [], users: [] } });
  api.put.mockResolvedValue({ data: { user: { ...mockUser, emailNotifications: false } } });
});

test('student profile editing preserves administrator-controlled identity fields', () => {
  render(<SettingsPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
  expect(screen.getByLabelText('Full name')).toBeDisabled();
  expect(screen.getByLabelText('Student ID')).toBeDisabled();
  expect(screen.getByLabelText('Department')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByRole('button', { name: 'Edit profile' })).toBeInTheDocument();
  expect(api.put).not.toHaveBeenCalled();
});

test('notification preference stays saved when navigating between categories', async () => {
  render(<SettingsPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
  fireEvent.click(screen.getByRole('switch', { name: 'Community & message emails' }));
  await waitFor(() => expect(mockSetUser).toHaveBeenCalled());
  expect(api.put).toHaveBeenCalledWith('/auth/profile', { emailNotifications: false });
  fireEvent.click(screen.getByRole('button', { name: 'Account' }));
  fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
  expect(screen.getByRole('switch', { name: 'Community & message emails' })).toHaveAttribute('aria-checked', 'false');
});

test('teacher request lists load only when the Teaching category is opened', async () => {
  mockUser = { ...mockUser, role: 'teacher' };
  render(<SettingsPage />);
  expect(api.get).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Teaching' }));
  await screen.findByText('No pending join requests.');
  expect(api.get).toHaveBeenCalledWith('/courses/join-requests');
  expect(api.get).toHaveBeenCalledWith('/auth/blocked-users');
});
