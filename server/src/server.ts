import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { authenticateToken } from './services/auth';

import typeDefs from './graphql/typeDefs';
import resolvers from './graphql/resolvers';
import db from './config/connection';

dotenv.config();

async function startApolloServer(typeDefs, resolvers) {
  const app = express();
  const httpServer = http.createServer(app);

  // Middleware for authentication
  const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1] || '';
    
    try {
      const user = await authenticateToken(token);
      req.user = user;
    } catch (err) {
      req.user = null;
    }
    
    next();
  };

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(authMiddleware);

  // Production static serving
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/build')));
  }

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({ user: req.user }),
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await server.start();
  server.applyMiddleware({ app });

  // Fallback route for React routing in production
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });

  const PORT = process.env.PORT || 3001;

  await new Promise<void>((resolve) => httpServer.listen({ port: PORT }, resolve));
  
  console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
  return { server, app };
}

// Connect to database
db.once('open', async () => {
  await startApolloServer(typeDefs, resolvers);
});