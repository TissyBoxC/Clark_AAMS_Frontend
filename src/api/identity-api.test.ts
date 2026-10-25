/*
 * 登录后按身份分流（P1-1 账号表合并）。
 *
 * 管理员与普通用户现在是同一条登录路径，登录响应带回 role，
 * 前端据此决定去哪个工作台。这组测试锁住三条边界：
 *   1. 管理员一律进后台，不被 redirect 参数留在用户工作台
 *   2. 普通用户尊重 redirect
 *   3. role 缺失/异常时按普通用户处理（失败即最小权限）
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loginLandingPath, workspacePathForRole } from '../utils/role-routing.ts';

test('管理员登录后进入后台，而不是用户工作台', () => {
  assert.equal(loginLandingPath('admin', '/user'), '/admin/dashboard');
});

test('管理员不被 redirect 参数留在用户工作台', () => {
  // 管理员从 /login?redirect=/user/schedule 进来，仍应进后台
  assert.equal(loginLandingPath('admin', '/user/schedule'), '/admin/dashboard');
});

test('普通用户尊重 redirect', () => {
  assert.equal(loginLandingPath('user', '/user/schedule'), '/user/schedule');
});

test('role 缺失按普通用户处理', () => {
  assert.equal(loginLandingPath(undefined, '/user'), '/user');
});

test('role 是未知值时按普通用户处理', () => {
  assert.equal(loginLandingPath('superuser', '/user'), '/user');
  assert.equal(loginLandingPath('', '/user'), '/user');
  assert.equal(loginLandingPath(null, '/user'), '/user');
});

test('guest 不会被当成管理员', () => {
  assert.equal(loginLandingPath('guest', '/user'), '/user');
});

test('工作台路径与角色一一对应', () => {
  assert.equal(workspacePathForRole('admin'), '/admin/dashboard');
  assert.equal(workspacePathForRole('user'), '/user');
  assert.equal(workspacePathForRole('guest'), '/login');
});
