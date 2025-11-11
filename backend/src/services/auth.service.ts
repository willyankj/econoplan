import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../database/database';
import { v4 as uuidv4 } from 'uuid';

// We'll define the User type later in a models file
interface UserCredentials {
  email: string;
  password: string;
}

export const registerNewUser = async (credentials: UserCredentials) => {
  const { email, password } = credentials;
  const hashedPassword = await bcrypt.hash(password, 10);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create User
    const userResult = await client.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING user_id',
      [email, hashedPassword]
    );
    const userId = userResult.rows[0].user_id;

    // 2. Create Tenant
    const tenantResult = await client.query(
      'INSERT INTO tenants (tenant_name, owner_id) VALUES ($1, $2) RETURNING tenant_id',
      [`${email}'s Tenant`, userId]
    );
    const tenantId = tenantResult.rows[0].tenant_id;

    // 3. Create default Workspace
    const workspaceResult = await client.query(
      'INSERT INTO workspaces (workspace_name, tenant_id) VALUES ($1, $2) RETURNING workspace_id',
      ['Default Workspace', tenantId]
    );
    const workspaceId = workspaceResult.rows[0].workspace_id;

    // 4. Link user to the new workspace with 'admin' role
    await client.query(
      'INSERT INTO user_workspaces (user_id, workspace_id, role) VALUES ($1, $2, $3)',
      [userId, workspaceId, 'admin']
    );

    await client.query('COMMIT');

    return { userId, tenantId, workspaceId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const authenticateUser = async (credentials: UserCredentials) => {
  const { email, password } = credentials;
  const client = await pool.connect();

  try {
    const userResult = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return null; // User not found
    }

    const user = userResult.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return null; // Invalid password
    }

    // Find the user's first workspace
    const workspaceResult = await client.query(
      'SELECT workspace_id FROM user_workspaces WHERE user_id = $1 LIMIT 1',
      [user.user_id]
    );

    if (workspaceResult.rows.length === 0) {
      throw new Error('User has no associated workspace');
    }
    const defaultWorkspaceId = workspaceResult.rows[0].workspace_id;

    // Generate JWT
    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' } // Token expires in 1 hour
    );

    return { token, defaultWorkspaceId };

  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};
