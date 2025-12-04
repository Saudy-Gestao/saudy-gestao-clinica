export interface UserPermission {
  id: string;
  name: string;
  description?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  permissions: UserPermission[];
}