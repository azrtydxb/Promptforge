import { render, screen } from '@testing-library/react';
import { Avatar, type AvatarUser } from '../avatar';

const user: AvatarUser = {
  id: 'u1',
  name: 'Alex Whitman',
  email: 'alex@growth.co',
  username: 'alex',
  avatarType: 'INITIALS',
  profilePicture: null,
  gravatarEmail: null,
};

describe('Avatar Structured Pro variants', () => {
  it('renders initials', () => {
    render(<Avatar user={user} />);
    expect(screen.getByText('AW')).toBeInTheDocument();
  });

  it('uses the indigo gradient for the current user', () => {
    render(<Avatar user={user} isCurrentUser />);
    const el = screen.getByText('AW').closest('[data-avatar]') as HTMLElement;
    expect(el.style.background).toContain('linear-gradient');
    expect(el.style.color).toBe('rgb(255, 255, 255)');
  });

  it('uses the soft indigo fill for other users', () => {
    render(<Avatar user={user} />);
    const el = screen.getByText('AW').closest('[data-avatar]') as HTMLElement;
    expect(el.style.backgroundColor).toBe('rgb(223, 226, 246)');
    expect(el.style.color).toBe('rgb(63, 73, 184)');
  });
});
