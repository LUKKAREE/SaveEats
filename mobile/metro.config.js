/**
 * ตั้งค่า Metro (ตัวรวมไฟล์ของ React Native)
 *
 * *** ทำไมต้องมีไฟล์นี้ ***
 * ปกติ Metro จะอ่านไฟล์เฉพาะในโฟลเดอร์ mobile/ เท่านั้น
 * แต่เราเก็บ type กลางไว้ที่ ../shared ซึ่งอยู่นอกโฟลเดอร์
 * ถ้าไม่บอก Metro ไว้ จะขึ้น error ว่า "Unable to resolve module @shared/index"
 *
 * watchFolders = บอก Metro ว่าให้มองโฟลเดอร์นี้ด้วย
 */
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '../shared');

const config = getDefaultConfig(projectRoot);

// ให้ Metro มองเห็นและติดตามการเปลี่ยนแปลงของโฟลเดอร์ shared ด้วย
config.watchFolders = [sharedRoot];

// บอกให้หา node_modules จากโฟลเดอร์ mobile เท่านั้น (กันสับสนเวลามีหลายโปรเจกต์)
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = config;
