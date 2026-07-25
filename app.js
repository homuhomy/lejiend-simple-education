const express = require('express');
const path = require('path');
require('dotenv').config();
const mysql = require('mysql2/promise');
const { Client } = require('pg');
const { MongoClient } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Database connection configs
const mysqlConfig = {
  host: 'localhost',
  port: 3306,
  user: process.env.MYSQL_USER || 'dev_user',
  password: process.env.MYSQL_PASSWORD || 'dev_password',
  database: process.env.MYSQL_DATABASE || 'dev_db',
};

const pgConfig = {
  host: 'localhost',
  port: 5433,
  user: process.env.POSTGRES_USER || 'dev_user',
  password: process.env.POSTGRES_PASSWORD || 'dev_password',
  database: process.env.POSTGRES_DB || 'dev_db',
};

const mongoUri = `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME || 'dev_user'}:${encodeURIComponent(process.env.MONGO_INITDB_ROOT_PASSWORD || 'dev_password')}@localhost:27017/${process.env.MONGO_INITDB_DATABASE || 'dev_db'}?authSource=admin`;

// Health check function for MySQL
const checkMySQL = async () => {
  try {
    const connection = await mysql.createConnection(mysqlConfig);
    await connection.ping();
    await connection.end();
    return { status: 'connected', message: 'MySQL is healthy' };
  } catch (error) {
    return { status: 'disconnected', message: `MySQL error: ${error.message}` };
  }
};

// Health check function for PostgreSQL
const checkPostgreSQL = async () => {
  const client = new Client(pgConfig);
  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    return { status: 'connected', message: 'PostgreSQL is healthy' };
  } catch (error) {
    return { status: 'disconnected', message: `PostgreSQL error: ${error.message}` };
  }
};

// Health check function for MongoDB
const checkMongoDB = async () => {
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    await client.close();
    return { status: 'connected', message: 'MongoDB is healthy' };
  } catch (error) {
    return { status: 'disconnected', message: `MongoDB error: ${error.message}` };
  }
};

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health endpoint
app.get('/health', async (req, res) => {
  try {
    const mysqlHealth = await checkMySQL();
    const postgresHealth = await checkPostgreSQL();
    const mongoHealth = await checkMongoDB();

    const allConnected =
      mysqlHealth.status === 'connected' &&
      postgresHealth.status === 'connected' &&
      mongoHealth.status === 'connected';

    res.status(allConnected ? 200 : 503).json({
      status: allConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      databases: {
        mysql: mysqlHealth,
        postgresql: postgresHealth,
        mongodb: mongoHealth,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
