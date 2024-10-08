-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- 主机： 127.0.0.1
-- 生成日期： 2024-09-11 13:43:35
-- 服务器版本： 10.4.32-MariaDB
-- PHP 版本： 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+08:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- 数据库： `kkbot`
--

-- --------------------------------------------------------

--
-- 表的结构 `corpus`
--

CREATE TABLE `corpus` (
  `id` int(11) NOT NULL,
  `user_id` double NOT NULL,
  `keyword` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `reply` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `mode` enum('模糊','精准') NOT NULL DEFAULT '模糊',
  `scene` enum('全部','私聊','群聊') NOT NULL DEFAULT '全部',
  `created_at` datetime DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- 表的结构 `pigeons`
--

CREATE TABLE `pigeons` (
  `user_id` double NOT NULL,
  `pigeon_num` double NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- 触发器 `pigeons`
--
DELIMITER $$
CREATE TRIGGER `before_update_pigeons` BEFORE UPDATE ON `pigeons` FOR EACH ROW BEGIN
  SET NEW.updated_at = NOW();
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- 表的结构 `pigeon_histories`
--

CREATE TABLE `pigeon_histories` (
  `id` int(11) NOT NULL,
  `user_id` double NOT NULL,
  `operation` double NOT NULL,
  `origin_pigeon` double NOT NULL,
  `new_pigeon` double NOT NULL,
  `reason` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- 表的结构 `red_packet`
--

CREATE TABLE `red_packet` (
  `id` int(11) NOT NULL,
  `user_id` double NOT NULL,
  `packet_num` int(11) NOT NULL,
  `pigeon_num` int(11) NOT NULL,
  `code` longtext NOT NULL,
  `picked_user` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`picked_user`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- 表的结构 `se_tu`
--

CREATE TABLE `se_tu` (
  `user_id` double NOT NULL,
  `today_count` int(11) NOT NULL DEFAULT 0,
  `total_count` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- 触发器 `se_tu`
--
DELIMITER $$
CREATE TRIGGER `before_update_se_tu` BEFORE UPDATE ON `se_tu` FOR EACH ROW BEGIN
  SET NEW.updated_at = NOW();
END
$$
DELIMITER ;

--
-- 转储表的索引
--

--
-- 表的索引 `corpus`
--
ALTER TABLE `corpus`
  ADD PRIMARY KEY (`id`);

--
-- 表的索引 `pigeons`
--
ALTER TABLE `pigeons`
  ADD PRIMARY KEY (`user_id`);

--
-- 表的索引 `pigeon_histories`
--
ALTER TABLE `pigeon_histories`
  ADD PRIMARY KEY (`id`);

--
-- 表的索引 `red_packet`
--
ALTER TABLE `red_packet`
  ADD PRIMARY KEY (`id`);

--
-- 在导出的表使用AUTO_INCREMENT
--

--
-- 使用表AUTO_INCREMENT `corpus`
--
ALTER TABLE `corpus`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `pigeon_histories`
--
ALTER TABLE `pigeon_histories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `red_packet`
--
ALTER TABLE `red_packet`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
