import { prisma } from '../config/database';
import { User, Session } from '@prisma/client';

export interface CreateUserData {
  email: string;
  name: string;
  avatar?: string;
  googleId?: string;
}

export interface CreateSessionData {
  userId: string;
  token: string;
  refreshToken?: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export const userRepository = {
  // Find user by ID
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  },

  // Find user by email
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  },

  // Find user by Google ID
  async findByGoogleId(googleId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { googleId },
    });
  },

  // Create new user
  async create(data: CreateUserData): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        avatar: data.avatar,
        googleId: data.googleId,
      },
    });
  },

  // Update user
  async update(id: string, data: Partial<CreateUserData>): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  },

  // Delete user
  async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  },

  // Find or create user by Google ID
  async findOrCreateByGoogle(
    googleId: string,
    email: string,
    name: string,
    avatar?: string
  ): Promise<User> {
    let user = await this.findByGoogleId(googleId);

    if (!user) {
      // Check if user with email exists (link Google account)
      user = await this.findByEmail(email);

      if (user) {
        // Link Google account to existing user
        user = await this.update(user.id, { googleId, avatar });
      } else {
        // Create new user
        user = await this.create({ email, name, googleId, avatar });
      }
    }

    return user;
  },

  // Create session
  async createSession(data: CreateSessionData): Promise<Session> {
    return prisma.session.create({
      data,
    });
  },

  // Find session by token
  async findSessionByToken(token: string): Promise<Session | null> {
    return prisma.session.findUnique({
      where: { token },
    });
  },

  // Find session by refresh token
  async findSessionByRefreshToken(refreshToken: string): Promise<Session | null> {
    return prisma.session.findUnique({
      where: { refreshToken },
    });
  },

  // Delete session by token
  async deleteSession(token: string): Promise<void> {
    await prisma.session.delete({
      where: { token },
    }).catch(() => {
      // Ignore if session doesn't exist
    });
  },

  // Delete all sessions for user
  async deleteAllUserSessions(userId: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { userId },
    });
  },
};
