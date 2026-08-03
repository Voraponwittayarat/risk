/*
 Navicat Premium Dump SQL

 Source Server         : 172.20.250.202
 Source Server Type    : MySQL
 Source Server Version : 50563 (5.5.63-MariaDB-wsrep)
 Source Host           : 172.20.250.202:3306
 Source Schema         : riskhospital

 Target Server Type    : MySQL
 Target Server Version : 50563 (5.5.63-MariaDB-wsrep)
 File Encoding         : 65001

 Date: 23/07/2026 15:51:25
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for รายชื่อ
-- ----------------------------
DROP TABLE IF EXISTS `รายชื่อ`;
CREATE TABLE `รายชื่อ`  (
  `id` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `lastname` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `position` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `cid` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `F6` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `F7` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `F8` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

-- ----------------------------
-- Table structure for act
-- ----------------------------
DROP TABLE IF EXISTS `act`;
CREATE TABLE `act`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `act_name` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'เชิงรับ/เชิงรุก',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 3 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for department
-- ----------------------------
DROP TABLE IF EXISTS `department`;
CREATE TABLE `department`  (
  `id` int(3) NOT NULL AUTO_INCREMENT,
  `depart_name_eng` varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'ชื่อย่ออังกฤษ',
  `depart_name` varchar(150) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'ชื่อแผนก',
  `depart_group_id` int(2) NULL DEFAULT NULL COMMENT 'รหัสฝ่าย',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 68 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for departmentgroup
-- ----------------------------
DROP TABLE IF EXISTS `departmentgroup`;
CREATE TABLE `departmentgroup`  (
  `id` int(2) NOT NULL AUTO_INCREMENT,
  `depart_group_name` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'ชื่อฝ่าย',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 57 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for duration
-- ----------------------------
DROP TABLE IF EXISTS `duration`;
CREATE TABLE `duration`  (
  `id` int(2) NOT NULL AUTO_INCREMENT,
  `duration_name` varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'เวร',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 5 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for edit_log
-- ----------------------------
DROP TABLE IF EXISTS `edit_log`;
CREATE TABLE `edit_log`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `edit_by` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `risk_id` int(11) NOT NULL,
  `riskregister_id` int(11) NOT NULL COMMENT 'riskregister_id',
  `edit_table` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `columnname` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `old` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL,
  `new` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL,
  `user_ir_type_old` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `user_ir_type_new` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `user_ir_depart_old` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `user_ir_depart_new` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `riskstore_old` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `riskstore_new` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `detail_old` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL,
  `detail_new` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL,
  `problem_basic_old` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL,
  `problem_basic_new` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL,
  `program_old` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `program_new` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `level_old` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `level_new` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `status_old` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `status_new` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 204 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for history
-- ----------------------------
DROP TABLE IF EXISTS `history`;
CREATE TABLE `history`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `datetime` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `change` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'รายการที่เปลี่ยน',
  `detail` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'รายละเอียด',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 4 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for hospital
-- ----------------------------
DROP TABLE IF EXISTS `hospital`;
CREATE TABLE `hospital`  (
  `id` int(2) NOT NULL AUTO_INCREMENT,
  `hoscode` int(5) NOT NULL COMMENT 'รหัสสถานพยาบาล',
  `hosname` varchar(150) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'ชื่อโรงพยาบาล',
  `address` varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'ที่อยู่',
  `tel` varchar(10) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'เบอร์โทรสำนักงาน',
  `phone` varchar(11) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'เบอร์โทรมือถือ',
  `fax` varchar(10) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'แฟกซ์',
  `email` varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'อีเมล์',
  `website` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'เว็บไซต์',
  `linetoken` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'Line Token ',
  `linenotify` varchar(1) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'แจ้งเตือนความเสี่ยงผ่าน Line Notify',
  `sendmail` varchar(1) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'แจ้งเตือนความเสี่ยงผ่าน eMail',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 6 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for inform
-- ----------------------------
DROP TABLE IF EXISTS `inform`;
CREATE TABLE `inform`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `inform_name` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'ที่มาของรายงาน',
  `act_id` int(11) NULL DEFAULT NULL COMMENT 'เชิงรับ/เชิงรุก',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 9 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for level
-- ----------------------------
DROP TABLE IF EXISTS `level`;
CREATE TABLE `level`  (
  `level_id` int(11) NOT NULL AUTO_INCREMENT,
  `level_code` varchar(2) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'ระดับ',
  `level_name` text CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'ชื่อระดับความรุนแรง',
  `level_warning_code` varchar(3) CHARACTER SET tis620 COLLATE tis620_thai_ci NULL DEFAULT NULL COMMENT 'รหัสการเตือน',
  `url_pic` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'ลิงค์ภาพระดับความเสี่ยง',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  PRIMARY KEY (`level_id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 16 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for levelwarning
-- ----------------------------
DROP TABLE IF EXISTS `levelwarning`;
CREATE TABLE `levelwarning`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `warning_code` varchar(3) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'รหัสทบทวน',
  `warning_name` varchar(150) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'ระดับการทบทวน',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 5 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for location
-- ----------------------------
DROP TABLE IF EXISTS `location`;
CREATE TABLE `location`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'สถานที่พบเหตุ',
  `lat` varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'ละติจูด',
  `long` varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'ลองจิจูด',
  `modify_date` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 136 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for member
-- ----------------------------
DROP TABLE IF EXISTS `member`;
CREATE TABLE `member`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cid` varchar(13) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'เลข 13 หลัก',
  `member_name` varchar(60) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'ชื่อ-นามสกุล',
  `department_id1` int(3) NOT NULL COMMENT 'สังกัดหน่วยงานหลัก',
  `department_id2` int(3) NULL DEFAULT 0 COMMENT 'สังกัดหน่วยงานรอง',
  `position_id` int(2) NOT NULL COMMENT 'ตำแหน่ง',
  `priority` varchar(1) CHARACTER SET tis620 COLLATE tis620_thai_ci NULL DEFAULT NULL COMMENT 'ตำแหน่งสายอำนวยการ',
  `team_id` int(1) NULL DEFAULT NULL COMMENT 'ทีมนำ',
  `accessrules` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'สิทธิการเข้าถึง',
  `img` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'รูปประจำตัว',
  `status` varchar(1) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'สถานะ',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  `rm_status` varchar(1) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'สถานะทีมRMของรพ.',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 337 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

-- ----------------------------
-- Table structure for migration
-- ----------------------------
DROP TABLE IF EXISTS `migration`;
CREATE TABLE `migration`  (
  `version` varchar(180) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `apply_time` int(11) NULL DEFAULT NULL,
  PRIMARY KEY (`version`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

-- ----------------------------
-- Table structure for month
-- ----------------------------
DROP TABLE IF EXISTS `month`;
CREATE TABLE `month`  (
  `id` int(2) NOT NULL AUTO_INCREMENT,
  `month_num` varchar(2) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'เลขเดือน',
  `month_name` varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'ชื่อเดือน',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 13 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for nine_standards
-- ----------------------------
DROP TABLE IF EXISTS `nine_standards`;
CREATE TABLE `nine_standards`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `std_number` int(11) NOT NULL,
  `std_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `risk_codes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `safety_category` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_std_number`(`std_number`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 10 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Compact;

-- ----------------------------
-- Table structure for position
-- ----------------------------
DROP TABLE IF EXISTS `position`;
CREATE TABLE `position`  (
  `id` int(2) NOT NULL AUTO_INCREMENT,
  `position_name` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'ตำแหน่ง',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 10 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for profile
-- ----------------------------
DROP TABLE IF EXISTS `profile`;
CREATE TABLE `profile`  (
  `user_id` int(11) NOT NULL,
  `name` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL,
  `public_email` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL,
  `gravatar_email` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL,
  `gravatar_id` varchar(32) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL,
  `location` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL,
  `website` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL,
  `bio` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL,
  `timezone` varchar(40) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL,
  PRIMARY KEY (`user_id`) USING BTREE,
  CONSTRAINT `profile_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

-- ----------------------------
-- Table structure for program
-- ----------------------------
DROP TABLE IF EXISTS `program`;
CREATE TABLE `program`  (
  `program_id` int(11) NOT NULL AUTO_INCREMENT,
  `program_name` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'โปรแกรมเชื่อมโยง',
  `type_id` int(11) NULL DEFAULT NULL COMMENT 'รหัสประเภทความเสี่ยง',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  PRIMARY KEY (`program_id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 14 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for reviewresults
-- ----------------------------
DROP TABLE IF EXISTS `reviewresults`;
CREATE TABLE `reviewresults`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reviewresults_name` varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'ผลการทวบทวน',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 6 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for risk
-- ----------------------------
DROP TABLE IF EXISTS `risk`;
CREATE TABLE `risk`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date_report` date NOT NULL COMMENT 'วันรายงาน',
  `time_report` time NOT NULL COMMENT 'เวลารายงาน',
  `duration_id` int(11) NULL DEFAULT NULL COMMENT 'เวรที่เกิด',
  `location_id` int(11) NULL DEFAULT NULL COMMENT 'สถานที่เกิดความเสี่ยง',
  `user_ir_type` varchar(1) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'ประเภทการรายงาน',
  `user_ir` int(11) NULL DEFAULT NULL COMMENT 'แผนกที่รายงานถึง',
  `program_id` int(11) NULL DEFAULT NULL COMMENT 'โปรแกรมความเสี่ยง',
  `level_id` varchar(2) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'ระดับความรุนแรง',
  `riskstore_id` int(11) NOT NULL COMMENT 'ชื่อความเสี่ยง',
  `detail` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'เหตุการ/รายละเอียดเพิ่มเติม',
  `detail_hosxp` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'รายละเอียดข้อมูลคนไข้',
  `affected` varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'ผู้เสียหาย/ได้รับผลกระทบ',
  `edit` varchar(10) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'การแก้ปัญหา',
  `problem_basic` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'วิธีแก้ปัญหาเบื้องต้น',
  `image` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'เอกสาร-ภาพประกอบ',
  `inform_id` int(11) NOT NULL COMMENT 'ที่มาของรายงานความเสี่ยง',
  `status_risk` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT 'รายงาน' COMMENT 'สถานะความเสี่ยง',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `department_id` varchar(3) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'สังกัดแผนก',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 13564 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for risk_copy
-- ----------------------------
DROP TABLE IF EXISTS `risk_copy`;
CREATE TABLE `risk_copy`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date_report` date NOT NULL COMMENT 'วันรายงาน',
  `time_report` time NOT NULL COMMENT 'เวลารายงาน',
  `duration_id` int(11) NULL DEFAULT NULL COMMENT 'เวรที่เกิด',
  `location_id` int(11) NULL DEFAULT NULL COMMENT 'สถานที่เกิดความเสี่ยง',
  `user_ir_type` varchar(1) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'ประเภทการรายงาน',
  `user_ir` int(11) NULL DEFAULT NULL COMMENT 'แผนกที่รายงานถึง',
  `program_id` int(11) NULL DEFAULT NULL COMMENT 'โปรแกรมความเสี่ยง',
  `level_id` varchar(2) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'ระดับความรุนแรง',
  `riskstore_id` int(11) NOT NULL COMMENT 'ชื่อความเสี่ยง',
  `detail` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'เหตุการ/รายละเอียดเพิ่มเติม',
  `detail_hosxp` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'รายละเอียดข้อมูลคนไข้',
  `affected` varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'ผู้เสียหาย/ได้รับผลกระทบ',
  `edit` varchar(10) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'การแก้ปัญหา',
  `problem_basic` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'วิธีแก้ปัญหาเบื้องต้น',
  `image` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'เอกสาร-ภาพประกอบ',
  `inform_id` int(11) NOT NULL COMMENT 'ที่มาของรายงานความเสี่ยง',
  `status_risk` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT 'รายงาน' COMMENT 'สถานะความเสี่ยง',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `department_id` varchar(3) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'สังกัดแผนก',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 8747 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for riskgroup
-- ----------------------------
DROP TABLE IF EXISTS `riskgroup`;
CREATE TABLE `riskgroup`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'กลุ่มความเสี่ยง',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 5 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for riskregister
-- ----------------------------
DROP TABLE IF EXISTS `riskregister`;
CREATE TABLE `riskregister`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID_Riskregister',
  `id_risk` int(11) NOT NULL DEFAULT 0 COMMENT 'ID_Risk',
  `date_report` date NOT NULL COMMENT 'วันรายงาน',
  `time_report` time NOT NULL COMMENT 'เวลารายงาน',
  `duration_id` int(11) NULL DEFAULT NULL COMMENT 'เวรที่เกิด',
  `location_id` int(11) NULL DEFAULT NULL COMMENT 'สถานที่เกิดความเสี่ยง',
  `user_ir_type` varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'ประเภทการรายงาน',
  `user_ir` int(11) NULL DEFAULT NULL COMMENT 'แผนกที่รายงานถึง',
  `program_id` int(11) NULL DEFAULT NULL COMMENT 'โปรแกรมความเสี่ยง',
  `level_id` varchar(2) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'ระดับความรุนแรง',
  `riskstore_id` int(11) NOT NULL COMMENT 'ชื่อความเสี่ยง',
  `detail` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'เหตุการ/รายละเอียดเพิ่มเติม',
  `detail_hosxp` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'รายละเอียดข้อมูลคนไข้',
  `affected` varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'ผู้เสียหาย/ได้รับผลกระทบ',
  `edit` varchar(10) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'การแก้ปัญหา',
  `problem_basic` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'วิธีแก้ปัญหาเบื้องต้น',
  `image` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'เอกสาร-ภาพประกอบ',
  `inform_id` int(11) NOT NULL COMMENT 'ที่มาของรายงานความเสี่ยง',
  `status_risk` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'สถานะความเสี่ยง',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `department_id` varchar(3) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'สังกัดแผนก',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  `send_date` datetime NULL DEFAULT NULL COMMENT 'วันที่นำเข้าข้อมูล',
  `send_use` varchar(150) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'ผู้ลงทะเบียน',
  `register_date` date NOT NULL COMMENT 'วันที่ตรวจสอบ',
  `note` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'Note',
  `refer_type` varchar(1) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'การส่งต่อ',
  `sendto_team_id` int(11) NULL DEFAULT NULL COMMENT 'ส่งให้ทีม',
  `sendto_department_id` varchar(3) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'ส่งให้แผนก',
  `sendto_member_cid` varchar(13) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'ส่งให้ผู้รับผิดชอบ',
  `repeat_code` varchar(3) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'รหัสการทบทวน',
  `link_key` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'รหัสลิงค์สำหรับไลน์',
  `url` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'ลิงค์',
  PRIMARY KEY (`id`, `id_risk`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 13538 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for riskregister_copy
-- ----------------------------
DROP TABLE IF EXISTS `riskregister_copy`;
CREATE TABLE `riskregister_copy`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID_Riskregister',
  `id_risk` int(11) NOT NULL DEFAULT 0 COMMENT 'ID_Risk',
  `date_report` date NOT NULL COMMENT 'วันรายงาน',
  `time_report` time NOT NULL COMMENT 'เวลารายงาน',
  `duration_id` int(11) NULL DEFAULT NULL COMMENT 'เวรที่เกิด',
  `location_id` int(11) NULL DEFAULT NULL COMMENT 'สถานที่เกิดความเสี่ยง',
  `user_ir_type` varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'ประเภทการรายงาน',
  `user_ir` int(11) NULL DEFAULT NULL COMMENT 'แผนกที่รายงานถึง',
  `program_id` int(11) NULL DEFAULT NULL COMMENT 'โปรแกรมความเสี่ยง',
  `level_id` varchar(2) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'ระดับความรุนแรง',
  `riskstore_id` int(11) NOT NULL COMMENT 'ชื่อความเสี่ยง',
  `detail` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'เหตุการ/รายละเอียดเพิ่มเติม',
  `detail_hosxp` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'รายละเอียดข้อมูลคนไข้',
  `affected` varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'ผู้เสียหาย/ได้รับผลกระทบ',
  `edit` varchar(10) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'การแก้ปัญหา',
  `problem_basic` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'วิธีแก้ปัญหาเบื้องต้น',
  `image` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'เอกสาร-ภาพประกอบ',
  `inform_id` int(11) NOT NULL COMMENT 'ที่มาของรายงานความเสี่ยง',
  `status_risk` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'สถานะความเสี่ยง',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `department_id` varchar(3) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'สังกัดแผนก',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  `send_date` datetime NULL DEFAULT NULL COMMENT 'วันที่นำเข้าข้อมูล',
  `send_use` varchar(150) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'ผู้ลงทะเบียน',
  `register_date` date NOT NULL COMMENT 'วันที่ตรวจสอบ',
  `note` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'Note',
  `refer_type` varchar(1) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'การส่งต่อ',
  `sendto_team_id` int(11) NULL DEFAULT NULL COMMENT 'ส่งให้ทีม',
  `sendto_department_id` varchar(3) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'ส่งให้แผนก',
  `sendto_member_cid` varchar(13) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'ส่งให้ผู้รับผิดชอบ',
  `repeat_code` varchar(3) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'รหัสการทบทวน',
  `link_key` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'รหัสลิงค์สำหรับไลน์',
  `url` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'ลิงค์',
  PRIMARY KEY (`id`, `id_risk`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 8738 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for riskreview
-- ----------------------------
DROP TABLE IF EXISTS `riskreview`;
CREATE TABLE `riskreview`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `risk_id` int(11) NULL DEFAULT NULL COMMENT 'เลขความเสี่ยง',
  `riskregister_id` int(11) NULL DEFAULT NULL COMMENT 'เลขทะเบียนความเสี่ยง',
  `riskvisit` varchar(14) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'เลขทบทวน',
  `review_date` date NOT NULL COMMENT 'วันที่ทบทวน',
  `review_time` time NULL DEFAULT NULL COMMENT 'เวลา',
  `token_upload` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'token_upload',
  `files` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'เอกสารแนบ',
  `hits` int(11) NULL DEFAULT NULL,
  `cause_problem` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'สาเหตุของปัญาหา',
  `notereview` text CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'บันทึกการทบทวน',
  `reviewresults_id` int(11) NOT NULL COMMENT 'ผลการทวบทวน',
  `review_cid` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'ผู้ร่วมทบทวน',
  `repeat` varchar(1) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'ทบทวนซ้ำ',
  `discharge` varchar(1) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'จำหน่าย',
  `status_risk` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT 'ทบทวน' COMMENT 'สถานะความเสี่ยง',
  `count` int(11) NULL DEFAULT NULL COMMENT 'จำนวนทบทวน',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  PRIMARY KEY (`id`, `riskvisit`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 5995 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for riskreview_copy
-- ----------------------------
DROP TABLE IF EXISTS `riskreview_copy`;
CREATE TABLE `riskreview_copy`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `risk_id` int(11) NULL DEFAULT NULL COMMENT 'เลขความเสี่ยง',
  `riskregister_id` int(11) NULL DEFAULT NULL COMMENT 'เลขทะเบียนความเสี่ยง',
  `riskvisit` varchar(14) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'เลขทบทวน',
  `review_date` date NOT NULL COMMENT 'วันที่ทบทวน',
  `review_time` time NULL DEFAULT NULL COMMENT 'เวลา',
  `token_upload` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'token_upload',
  `files` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'เอกสารแนบ',
  `hits` int(11) NULL DEFAULT NULL,
  `notereview` text CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'บันทึกการทบทวน',
  `reviewresults_id` int(11) NOT NULL COMMENT 'ผลการทวบทวน',
  `review_cid` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL COMMENT 'ผู้ร่วมทบทวน',
  `repeat` varchar(1) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'ทบทวนซ้ำ',
  `discharge` varchar(1) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'จำหน่าย',
  `status_risk` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT 'ทบทวน' COMMENT 'สถานะความเสี่ยง',
  `count` int(11) NULL DEFAULT NULL COMMENT 'จำนวนทบทวน',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  PRIMARY KEY (`id`, `riskvisit`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1914 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for risks
-- ----------------------------
DROP TABLE IF EXISTS `risks`;
CREATE TABLE `risks`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `no` int(11) NULL DEFAULT NULL,
  `RRID` int(11) NULL DEFAULT NULL,
  `RID` int(11) NULL DEFAULT NULL,
  `risk_date` date NULL DEFAULT NULL,
  `risk_time` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `send_date` datetime NULL DEFAULT NULL,
  `user_ir_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `dept_from` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `dept_to` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `riskstore` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `level` varchar(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `problem_basic` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `detail` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `review` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_risk_date`(`risk_date`) USING BTREE,
  INDEX `idx_rrid`(`RRID`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4862 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Compact;

-- ----------------------------
-- Table structure for riskstore
-- ----------------------------
DROP TABLE IF EXISTS `riskstore`;
CREATE TABLE `riskstore`  (
  `riskstore_id` int(11) NOT NULL AUTO_INCREMENT,
  `riskstore_name` varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'ชื่อความเสี่ยง',
  `inform_id` int(11) NULL DEFAULT NULL COMMENT 'ที่มาของความเสี่ยง',
  `type_id` int(11) NULL DEFAULT NULL COMMENT 'ประเภทความเสี่ยง',
  `program_id` int(11) NULL DEFAULT NULL COMMENT 'โปรแกรมความเสี่ยง',
  `level_id` int(11) NULL DEFAULT NULL COMMENT 'ระดับความรุนแรง',
  `group_id` int(11) NULL DEFAULT NULL COMMENT 'กลุ่มความเสี่ยง',
  `team_id` int(11) NULL DEFAULT NULL COMMENT 'ทีม',
  `member_cid` varchar(13) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'ผู้รับผิดชอบความเสี่ยง',
  `status` varchar(1) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'สถานะ',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  PRIMARY KEY (`riskstore_id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 2000071 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for riskstore_copy
-- ----------------------------
DROP TABLE IF EXISTS `riskstore_copy`;
CREATE TABLE `riskstore_copy`  (
  `riskstore_id` int(11) NOT NULL AUTO_INCREMENT,
  `riskstore_name` varchar(200) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'ชื่อความเสี่ยง',
  `inform_id` int(11) NULL DEFAULT NULL COMMENT 'ที่มาของความเสี่ยง',
  `type_id` int(11) NULL DEFAULT NULL COMMENT 'ประเภทความเสี่ยง',
  `program_id` int(11) NULL DEFAULT NULL COMMENT 'โปรแกรมความเสี่ยง',
  `level_id` int(11) NULL DEFAULT NULL COMMENT 'ระดับความรุนแรง',
  `group_id` int(11) NULL DEFAULT NULL COMMENT 'กลุ่มความเสี่ยง',
  `team_id` int(11) NULL DEFAULT NULL COMMENT 'ทีม',
  `member_cid` varchar(13) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'ผู้รับผิดชอบความเสี่ยง',
  `status` varchar(1) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'สถานะ',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  PRIMARY KEY (`riskstore_id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 483 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for session_frontend_user
-- ----------------------------
DROP TABLE IF EXISTS `session_frontend_user`;
CREATE TABLE `session_frontend_user`  (
  `id` char(80) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `user_id` int(11) NULL DEFAULT NULL,
  `ip` varchar(15) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `expire` int(11) NULL DEFAULT NULL,
  `data` longblob NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `expire`(`expire`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

-- ----------------------------
-- Table structure for set_datetime
-- ----------------------------
DROP TABLE IF EXISTS `set_datetime`;
CREATE TABLE `set_datetime`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `time` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `days` int(11) NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 2 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for social_account
-- ----------------------------
DROP TABLE IF EXISTS `social_account`;
CREATE TABLE `social_account`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NULL DEFAULT NULL,
  `provider` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `client_id` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `data` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL,
  `code` varchar(32) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL,
  `created_at` int(11) NULL DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL,
  `username` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `account_unique`(`provider`, `client_id`) USING BTREE,
  UNIQUE INDEX `account_unique_code`(`code`) USING BTREE,
  INDEX `fk_user_account`(`user_id`) USING BTREE,
  CONSTRAINT `social_account_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8 COLLATE = utf8_unicode_ci ROW_FORMAT = COMPACT;

-- ----------------------------
-- Table structure for status
-- ----------------------------
DROP TABLE IF EXISTS `status`;
CREATE TABLE `status`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `status_name` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'สภานะ',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 7 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for sys_month
-- ----------------------------
DROP TABLE IF EXISTS `sys_month`;
CREATE TABLE `sys_month`  (
  `month` varchar(6) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `selyear` varchar(4) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `selmonth` varchar(2) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `month_th` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  PRIMARY KEY (`month`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

-- ----------------------------
-- Table structure for team
-- ----------------------------
DROP TABLE IF EXISTS `team`;
CREATE TABLE `team`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `team_name` varchar(150) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'ทีมนำ',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 11 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for tmp_riskregister
-- ----------------------------
DROP TABLE IF EXISTS `tmp_riskregister`;
CREATE TABLE `tmp_riskregister`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_risk` int(11) NOT NULL DEFAULT 0 COMMENT 'ID_Risk',
  `riskstore_id` int(11) NOT NULL DEFAULT 0 COMMENT 'Risk_store',
  `date_report` date NOT NULL COMMENT 'วันรายงาน',
  `time_report` time NOT NULL COMMENT 'เวลารายงาน',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `department_id` varchar(3) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'สังกัดแผนก',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  `send_date` datetime NULL DEFAULT NULL COMMENT 'วันที่นำเข้าข้อมูล',
  `send_use` varchar(150) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'ผู้ลงทะเบียน',
  `register_date` date NOT NULL COMMENT 'วันที่ตรวจสอบ',
  `m` varchar(2) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `y` varchar(4) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `end_process` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1267 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tmp_riskregister_copy
-- ----------------------------
DROP TABLE IF EXISTS `tmp_riskregister_copy`;
CREATE TABLE `tmp_riskregister_copy`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_risk` int(11) NOT NULL DEFAULT 0 COMMENT 'ID_Risk',
  `riskstore_id` int(11) NOT NULL DEFAULT 0 COMMENT 'Risk_store',
  `date_report` date NOT NULL COMMENT 'วันรายงาน',
  `time_report` time NOT NULL COMMENT 'เวลารายงาน',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `department_id` varchar(3) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'สังกัดแผนก',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  `send_date` datetime NULL DEFAULT NULL COMMENT 'วันที่นำเข้าข้อมูล',
  `send_use` varchar(150) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'ผู้ลงทะเบียน',
  `register_date` date NOT NULL COMMENT 'วันที่ตรวจสอบ',
  `m` varchar(2) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `y` varchar(4) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `end_process` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 117 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for token
-- ----------------------------
DROP TABLE IF EXISTS `token`;
CREATE TABLE `token`  (
  `user_id` int(11) NOT NULL,
  `code` varchar(32) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `created_at` int(11) NOT NULL,
  `type` smallint(6) NOT NULL,
  UNIQUE INDEX `token_unique`(`user_id`, `code`, `type`) USING BTREE,
  CONSTRAINT `token_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

-- ----------------------------
-- Table structure for type
-- ----------------------------
DROP TABLE IF EXISTS `type`;
CREATE TABLE `type`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'ประเภทความเสี่ยง',
  `create_date` datetime NULL DEFAULT NULL COMMENT 'วันบันทึก',
  `modify_date` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง',
  `created_by` int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย',
  `updated_by` int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 5 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for user
-- ----------------------------
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `password_hash` varchar(60) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `cid` varchar(13) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL COMMENT 'เลข 13 หลัก',
  `email` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `auth_key` varchar(32) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `confirmed_at` int(11) NULL DEFAULT NULL,
  `unconfirmed_email` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL,
  `blocked_at` int(11) NULL DEFAULT NULL,
  `registration_ip` varchar(45) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL,
  `role` smallint(6) NOT NULL DEFAULT 99 COMMENT 'สิทธิผู้ใช้งาน',
  `created_at` int(11) NOT NULL,
  `updated_at` int(11) NOT NULL,
  `flags` int(11) NOT NULL DEFAULT 0,
  `last_login_at` int(11) NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `user_unique_username`(`username`) USING BTREE,
  UNIQUE INDEX `user_unique_email`(`email`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 477 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

-- ----------------------------
-- Table structure for user_log
-- ----------------------------
DROP TABLE IF EXISTS `user_log`;
CREATE TABLE `user_log`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `login_date` datetime NULL DEFAULT NULL,
  `ip` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 14921 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for user_role
-- ----------------------------
DROP TABLE IF EXISTS `user_role`;
CREATE TABLE `user_role`  (
  `role_id` int(11) NOT NULL,
  `role_name` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'สิทธิผู้ใช้งาน',
  PRIMARY KEY (`role_id`) USING BTREE
) ENGINE = MyISAM CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Procedure structure for cal_riskregister
-- ----------------------------
DROP PROCEDURE IF EXISTS `cal_riskregister`;
delimiter ;;
CREATE PROCEDURE `cal_riskregister`()
BEGIN

SET @b_year:=(SELECT YEAR(date) AS d FROM set_datetime LIMIT 1);
SET @date1:=concat(@b_year,'1001');
SET @date2:=concat(@b_year+1,'0930');

DROP TABLE IF EXISTS tmp_riskregister; 
CREATE TABLE `tmp_riskregister` (
	`id` INT(11)AUTO_INCREMENT,
	`id_risk`  int(11) NOT NULL DEFAULT 0 COMMENT 'ID_Risk' ,
	`riskstore_id`  int(11) NOT NULL DEFAULT 0 COMMENT 'Risk_store' ,
	`date_report`  date NOT NULL COMMENT 'วันรายงาน' ,
	`time_report`  time NOT NULL COMMENT 'เวลารายงาน' ,
	`created_by`  int(11) NULL DEFAULT NULL COMMENT 'บันทึกโดย' ,
	`department_id`  varchar(3) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'สังกัดแผนก' ,
	`updated_by`  int(11) NULL DEFAULT NULL COMMENT 'อับเดทโดย' ,
	`create_date`  datetime NULL DEFAULT NULL COMMENT 'วันบันทึก' ,
	`modify_date`  timestamp NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันปรับปรุง' ,
	`send_date`  datetime NULL DEFAULT NULL COMMENT 'วันที่นำเข้าข้อมูล' ,
	`send_use`  varchar(150) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT 'ผู้ลงทะเบียน' ,
	`register_date`  date NOT NULL COMMENT 'วันที่ตรวจสอบ' ,
	`m` varchar(2) NOT NULL,
	`y` varchar(4) NOT NULL,
	`end_process` TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

REPLACE INTO tmp_riskregister -- ให้ insert ที่ select มา ลงใน temp
SELECT 0 AS id,id_risk,riskstore_id,date_report,time_report,created_by,department_id,updated_by,create_date,modify_date,send_date,send_use,register_date,MONTH(date_report)AS m,YEAR(date_report) AS y,NOW()
FROM riskregister 
WHERE date_report BETWEEN @date1 AND NOW();
END
;;
delimiter ;

-- ----------------------------
-- Event structure for UpdateTempRisk
-- ----------------------------
DROP EVENT IF EXISTS `UpdateTempRisk`;
delimiter ;;
CREATE EVENT `UpdateTempRisk`
ON SCHEDULE
EVERY '5' MINUTE STARTS '2020-05-13 09:16:08'
ON COMPLETION PRESERVE
DO Call cal_riskregister()
;;
delimiter ;

SET FOREIGN_KEY_CHECKS = 1;
