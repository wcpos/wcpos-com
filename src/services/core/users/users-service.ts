import 'server-only'

export interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: 'user' | 'admin'
  status: 'pending' | 'active' | 'suspended'
  createdAt: Date
  updatedAt: Date
}

export interface PaginatedUsers {
  users: User[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Users Service
 *
 * Provides user management functionality for the admin dashboard.
 * Currently stubbed out -- database has been removed.
 * Will be rebuilt to query Medusa or an external user store.
 */
export class UsersService {
  static async getUsers(
    page: number = 1,
    pageSize: number = 50,
    _search?: string
  ): Promise<PaginatedUsers> {
    return {
      users: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    }
  }

  static async getUserById(_id: string): Promise<User | null> {
    return null
  }

  static async updateUserRole(
    _id: string,
    _role: 'user' | 'admin'
  ): Promise<boolean> {
    return false
  }

  static async updateUserStatus(
    _id: string,
    _status: 'pending' | 'active' | 'suspended'
  ): Promise<boolean> {
    return false
  }
}
