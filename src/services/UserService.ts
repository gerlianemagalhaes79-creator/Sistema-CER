import { User, AccessType } from '../types';

const STORAGE_KEY = 'cer_users_data';

const DEFAULT_ADMIN: User = {
  id: 'admin-id',
  name: 'Administrador Sistema',
  email: 'admin@cer.com.br',
  role: 'TI / Gestor',
  accessType: AccessType.Administrador,
  status: 'Active',
  password: 'admin',
  createdAt: new Date().toISOString()
};

export const UserService = {
  getUsers: (): User[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      UserService.saveUsers([DEFAULT_ADMIN]);
      return [DEFAULT_ADMIN];
    }
    return JSON.parse(data);
  },

  saveUsers: (users: User[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  },

  addUser: (user: Omit<User, 'id' | 'createdAt'>): User => {
    const users = UserService.getUsers();
    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    
    users.push(newUser);
    UserService.saveUsers(users);
    return newUser;
  },

  updateUser: (id: string, updates: Partial<User>) => {
    const users = UserService.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      UserService.saveUsers(users);
    }
  },

  deleteUser: (id: string) => {
    // Only allow if not the last admin? For now simple
    const users = UserService.getUsers();
    const filtered = users.filter(u => u.id !== id);
    UserService.saveUsers(filtered);
  },

  authenticate: (email: string, password: string): User | null => {
    const users = UserService.getUsers();
    const user = users.find(u => u.email === email && u.password === password && u.status === 'Active');
    return user || null;
  },

  changePassword: (id: string, current: string, newPass: string): boolean => {
    const users = UserService.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index !== -1 && users[index].password === current) {
      users[index].password = newPass;
      UserService.saveUsers(users);
      return true;
    }
    return false;
  }
};
