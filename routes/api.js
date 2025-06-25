const express = require('express');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: User API
 *     description: 用户端接口
 *   - name: Admin API  
 *     description: 管理后台接口
 */

/**
 * @swagger
 * /api:
 *   get:
 *     summary: API信息
 *     description: 返回API版本和可用端点信息
 *     tags: [User API]
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: API服务正常
 *                 data:
 *                   type: object
 *                   properties:
 *                     version:
 *                       type: string
 *                       example: "1.0.0"
 *                     endpoints:
 *                       type: object
 *                       properties:
 *                         user:
 *                           type: string
 *                           example: "/api/user"
 *                         admin:
 *                           type: string
 *                           example: "/api/admin"
 */
router.get('/', function(req, res) {
  res.sendSuccess('API服务正常', {
    data: {
      version: '1.0.0',
      endpoints: {
        user: '/api/user',
        admin: '/api/admin'
      },
      documentation: {
        user: '/api-docs/user',
        admin: '/api-docs/admin',
        general: '/api-docs'
      }
    }
  });
});

// 引入用户端和管理端路由
const userRouter = require('./user-api');
const adminRouter = require('./admin-api');

// 注册子路由
router.use('/user', userRouter);
router.use('/admin', adminRouter);

module.exports = router;
