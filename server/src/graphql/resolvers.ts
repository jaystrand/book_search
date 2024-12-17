import User from '../models/User';
import { signToken, authenticateToken } from '../services/auth';
import { GraphQLError } from 'graphql';

const resolvers = {
  Query: {
    me: async (_, __, context) => {
      // Check if user is authenticated
      if (!context.user) {
        throw new GraphQLError('You must be logged in', {
          extensions: {
            code: 'UNAUTHENTICATED',
          },
        });
      }

      // Find the user and populate saved books
      return await User.findById(context.user._id);
    },
  },

  Mutation: {
    login: async (_, { email, password }) => {
      const user = await User.findOne({ $or: [{ username: email }, { email }] });
      
      if (!user) {
        throw new GraphQLError('Cannot find this user', {
          extensions: {
            code: 'USER_NOT_FOUND',
          },
        });
      }

      const correctPw = await user.isCorrectPassword(password);

      if (!correctPw) {
        throw new GraphQLError('Wrong password', {
          extensions: {
            code: 'INCORRECT_CREDENTIALS',
          },
        });
      }

      const token = signToken(user.username, user.email, user._id);
      return { token, user };
    },

    addUser: async (_, { username, email, password }) => {
      const user = await User.create({ username, email, password });
      
      if (!user) {
        throw new GraphQLError('Something went wrong creating user', {
          extensions: {
            code: 'USER_CREATION_ERROR',
          },
        });
      }

      const token = signToken(user.username, user.email, user._id);
      return { token, user };
    },

    saveBook: async (_, { bookData }, context) => {
      if (!context.user) {
        throw new GraphQLError('You must be logged in', {
          extensions: {
            code: 'UNAUTHENTICATED',
          },
        });
      }

      try {
        const updatedUser = await User.findOneAndUpdate(
          { _id: context.user._id },
          { $addToSet: { savedBooks: bookData } },
          { new: true, runValidators: true }
        );

        return updatedUser;
      } catch (err) {
        throw new GraphQLError('Failed to save book', {
          extensions: {
            code: 'BOOK_SAVE_ERROR',
          },
        });
      }
    },

    removeBook: async (_, { bookId }, context) => {
      if (!context.user) {
        throw new GraphQLError('You must be logged in', {
          extensions: {
            code: 'UNAUTHENTICATED',
          },
        });
      }

      const updatedUser = await User.findOneAndUpdate(
        { _id: context.user._id },
        { $pull: { savedBooks: { bookId } } },
        { new: true }
      );

      if (!updatedUser) {
        throw new GraphQLError('Could not find user', {
          extensions: {
            code: 'USER_NOT_FOUND',
          },
        });
      }

      return updatedUser;
    },
  },
};

export default resolvers;