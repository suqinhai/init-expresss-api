/**
 * MongoDB 数据库连接配置
 * 使用 Mongoose ODM 进行 MongoDB 操作
 * 支持连接池、重连机制、健康检查等功能
 */

const mongoose = require('mongoose');
const { logger } = require('../logger');

// 从环境变量获取MongoDB配置
const config = {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/testSxx',
    host: process.env.MONGO_HOST || 'localhost',
    port: parseInt(process.env.MONGO_PORT) || 27017,
    dbName: process.env.MONGO_DB_NAME || 'testSxx',
    username: process.env.MONGO_USER || '',
    password: process.env.MONGO_PASS || '',
    // 连接选项配置
    options: {
        // 连接池配置
        maxPoolSize: parseInt(process.env.MONGO_POOL_MAX) || 10,     // 最大连接数
        minPoolSize: parseInt(process.env.MONGO_POOL_MIN) || 2,      // 最小连接数
        maxIdleTimeMS: parseInt(process.env.MONGO_MAX_IDLE_TIME) || 30000, // 最大空闲时间

        // 超时配置
        connectTimeoutMS: parseInt(process.env.MONGO_CONNECT_TIMEOUT) || 30000,
        serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT) || 5000,
        socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT) || 45000,

        // 重试配置
        retryWrites: process.env.MONGO_RETRY_WRITES === 'true',
        retryReads: process.env.MONGO_RETRY_READS === 'true',

        // 其他配置
        bufferCommands: false,      // 禁用mongoose缓冲
        bufferMaxEntries: 0,        // 禁用mongoose缓冲
        useNewUrlParser: true,      // 使用新的URL解析器
        useUnifiedTopology: true,   // 使用新的服务器发现和监控引擎

        // 认证配置（如果需要）
        ...(config.username && config.password && {
            auth: {
                username: config.username,
                password: config.password
            },
            authSource: 'admin'
        })
    }
};

// 构建完整的连接URI
function buildConnectionUri() {
    if (config.uri && config.uri !== 'mongodb://localhost:27017/testSxx') {
        return config.uri;
    }

    let uri = 'mongodb://';

    // 添加认证信息
    if (config.username && config.password) {
        uri += `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@`;
    }

    // 添加主机和端口
    uri += `${config.host}:${config.port}`;

    // 添加数据库名
    uri += `/${config.dbName}`;

    return uri;
}

// MongoDB连接实例
let mongoConnection = null;

// 连接MongoDB数据库
async function connectMongoDB() {
    try {
        const connectionUri = buildConnectionUri();

        logger.info('正在连接 MongoDB 数据库...', {
            category: 'MONGODB',
            host: config.host,
            port: config.port,
            database: config.dbName
        });

        // 建立连接
        mongoConnection = await mongoose.connect(connectionUri, config.options);

        logger.info('成功连接到 MongoDB 数据库!', {
            category: 'MONGODB',
            host: config.host,
            port: config.port,
            database: config.dbName
        });

        return mongoConnection;

    } catch (error) {
        logger.error('MongoDB 连接失败:', {
            category: 'MONGODB',
            error: error.message,
            stack: error.stack
        });

        // 如果在开发环境中，可以尝试重连
        if (process.env.NODE_ENV === 'dev') {
            logger.info('5秒后尝试重新连接 MongoDB...', { category: 'MONGODB' });
            setTimeout(connectMongoDB, 5000);
        }

        throw error;
    }
}

// 断开MongoDB连接
async function disconnectMongoDB() {
    try {
        if (mongoConnection) {
            await mongoose.disconnect();
            mongoConnection = null;
            logger.info('MongoDB 连接已断开', { category: 'MONGODB' });
        }
    } catch (error) {
        logger.error('断开 MongoDB 连接时发生错误:', {
            category: 'MONGODB',
            error: error.message
        });
    }
}

// MongoDB健康检查
async function mongoHealthCheck() {
    try {
        if (!mongoConnection) {
            return { status: 'disconnected', message: 'MongoDB未连接' };
        }

        // 检查连接状态
        const state = mongoose.connection.readyState;
        const stateMap = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };

        if (state === 1) {
            // 执行简单的ping操作
            await mongoose.connection.db.admin().ping();
            return {
                status: 'healthy',
                message: 'MongoDB连接正常',
                state: stateMap[state],
                database: config.dbName
            };
        } else {
            return {
                status: 'unhealthy',
                message: `MongoDB连接状态异常: ${stateMap[state]}`,
                state: stateMap[state]
            };
        }

    } catch (error) {
        logger.error('MongoDB健康检查失败:', {
            category: 'MONGODB',
            error: error.message
        });
        return {
            status: 'error',
            message: `MongoDB健康检查失败: ${error.message}`
        };
    }
}

// 添加连接事件监听器
mongoose.connection.on('connected', () => {
    logger.info('Mongoose 连接已建立', { category: 'MONGODB' });
});

mongoose.connection.on('error', (err) => {
    logger.error('Mongoose 连接错误:', { category: 'MONGODB', error: err.message });
});

mongoose.connection.on('disconnected', () => {
    logger.warn('Mongoose 连接已断开', { category: 'MONGODB' });
});

// 处理应用终止
process.on('SIGINT', async () => {
    await disconnectMongoDB();
    process.exit(0);
});

// 初始化MongoDB连接
(async () => {
    try {
        await connectMongoDB();
        console.log('MongoDB connection initialized successfully');
    } catch (error) {
        console.warn('MongoDB connection failed, continuing without MongoDB:', error.message);
    }
})();

// 导出MongoDB相关功能
module.exports = {
    mongoose,                    // mongoose实例
    connection: mongoose.connection, // 连接实例
    connectMongoDB,             // 连接函数
    disconnectMongoDB,          // 断开连接函数
    mongoHealthCheck,           // 健康检查函数
    config                      // 配置信息
};