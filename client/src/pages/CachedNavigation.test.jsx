import { render, screen } from '@testing-library/react';
let mockParams = { id: 'c' };
jest.mock('react-router-dom', () => ({ useParams: () => mockParams, useNavigate: () => jest.fn(), useSearchParams: () => [new URLSearchParams()] }));
import StudentAssignmentPage from './StudentAssignmentPage';
import StudentLevelTermPage from './StudentLevelTermPage';
import api from '../services/api';
jest.mock('../services/api', () => ({ __esModule: true, BACKEND_URL: '', default: { get: jest.fn(), peekReadCache: jest.fn(), hasReadCache: jest.fn(), subscribeReads: () => () => {}, readOwner: () => 'me' } }));
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'me', role: 'student' } }) }));
jest.mock('../components/StudentSidebar', () => () => null);
jest.mock('../components/RegistrationInvoiceModal', () => () => null);
jest.mock('../components/PaymentCheckoutModal', () => () => null);
jest.mock('docx-preview', () => ({ renderAsync: jest.fn() }));
const saved = {
  '/courses/c': { course: { _id: 'c', name: 'Course C', displayCode: 'C101' } },
  '/assignments?courseId=c': { assignments: [{ _id: 'a', courseId: 'c', title: 'Saved assignment', totalMarks: 10, deadline: '2099-01-01', createdAt: '2026-01-01' }] },
  '/assignments/my-submissions': { submissions: [] },
  '/registration/available-courses?level=Level-1&term=Term-1': { student: { currentLevel: 1, currentTerm: 1 }, courses: [] },
  '/registration/my-status': { registrations: [{ _id: 'reg', level: 'Level-1', term: 'Term-1', status: 'Approved', selectedCourses: [] }] },
};
beforeEach(() => {
  api.get.mockImplementation(() => new Promise(() => {}));
  api.peekReadCache.mockImplementation(url => saved[url] ?? null);
  api.hasReadCache.mockImplementation(url => Object.hasOwn(saved, url));
});
const assignment = () => render(<StudentAssignmentPage />);
test('returning to the real Assignment page paints saved content while requests remain pending', () => {
  const first = assignment();
  expect(screen.getByText('Saved assignment')).toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  first.unmount();
  assignment();
  expect(screen.getByText('Saved assignment')).toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
test('a pending invoice cannot hide a cached Level-Term screen', () => {
  mockParams = { level: '1', term: '1' };
  render(<StudentLevelTermPage />);
  expect(screen.getByRole('heading', { name: 'Level 1 - Term 1' })).toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith('/registration-payments/invoice/reg', expect.any(Object));
});

jest.mock('axios', () => ({ get: jest.fn() }));

import '@testing-library/jest-dom';
