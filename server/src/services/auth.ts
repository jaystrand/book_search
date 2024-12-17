import jwt from 'jsonwebtoken';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

interface JwtPayload {
  _id: string;
  username: string;
  email: string;
}

// Modify authenticateToken to work with GraphQL context
export const authenticateToken = async (token: string) => {
  // If no token is provided, return null
  if (!token) {
    return null;
  }

  try {
    const secretKey = process.env.JWT_SECRET_KEY || '';

    // Verify the token
    const decoded = jwt.verify(token, secretKey) as JwtPayload;

    // Find the user in the database to ensure they exist
    const user = await User.findById(decoded._id).select('-password');

    if (!user) {
      return null;
    }

    return {
      _id: user._id,
      username: user.username,
      email: user.email
    };
  } catch (err) {
    // Token is invalid or expired
    return null;
  }
};

// Keep the existing signToken method
export const signToken = (username: string, email: string, _id: unknown) => {
  const payload = { username, email, _id };
  const secretKey = process.env.JWT_SECRET_KEY || '';

  return jwt.sign(payload, secretKey, { expiresIn: '1h' });
};

export default {
  authenticateToken,
  signToken
};