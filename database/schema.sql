-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:8889
-- Generation Time: Jun 26, 2026 at 04:34 PM
-- Server version: 8.0.40
-- PHP Version: 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `skilltrack`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity_log`
--

CREATE TABLE `activity_log` (
  `id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `action_type` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `entity_type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `entity_id` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `jobs`
--

CREATE TABLE `jobs` (
  `id` bigint NOT NULL,
  `external_dataset_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_id` bigint NOT NULL,
  `title` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `company` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `location` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `work_mode` enum('REMOTE','HYBRID','ONSITE') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `employment_type` enum('FULL_TIME','PART_TIME','INTERNSHIP') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `seniority` enum('INTERNSHIP','JUNIOR','MID','SENIOR') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `category` enum('DATA','BI','BUSINESS','PM','FRONTEND','BACKEND','FULLSTACK','QA','AI_ML') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ml_predicted_category` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ml_model` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ml_confidence` decimal(5,4) DEFAULT NULL,
  `ml_probabilities_json` json DEFAULT NULL,
  `salary_range` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `technologies_json` json DEFAULT NULL,
  `posted_at` date DEFAULT NULL,
  `source_type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `source_note` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `difficulty_score` int DEFAULT NULL,
  `description` text COLLATE utf8mb4_general_ci NOT NULL,
  `match_score` int DEFAULT '0',
  `status` enum('SALVAT','APLICAT','INTERVIU','OFERTA','RESPINS','FARA_RASPUNS') COLLATE utf8mb4_general_ci DEFAULT 'SALVAT',
  `applied_at` date DEFAULT NULL,
  `start_period` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `experience_min` int DEFAULT NULL,
  `experience_label` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `degree_level` varchar(30) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `degree_label` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `meets_experience_requirement` tinyint(1) DEFAULT NULL,
  `meets_degree_requirement` tinyint(1) DEFAULT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `job_skills`
--

CREATE TABLE `job_skills` (
  `job_id` bigint NOT NULL,
  `skill_id` bigint NOT NULL,
  `required_level` tinyint NOT NULL DEFAULT '3',
  `detected_by` varchar(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'KEYWORD'
) ;

-- --------------------------------------------------------

--
-- Table structure for table `roadmaps`
--

CREATE TABLE `roadmaps` (
  `id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `job_id` bigint NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `status` enum('NOT_STARTED','IN_PROGRESS','COMPLETED') COLLATE utf8mb4_general_ci DEFAULT 'NOT_STARTED',
  `progress` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `roadmap_steps`
--

CREATE TABLE `roadmap_steps` (
  `id` bigint NOT NULL,
  `roadmap_id` bigint NOT NULL,
  `skill_id` bigint DEFAULT NULL,
  `step_order` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `status` enum('NOT_STARTED','IN_PROGRESS','COMPLETED') COLLATE utf8mb4_general_ci DEFAULT 'NOT_STARTED',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `skills`
--

CREATE TABLE `skills` (
  `id` bigint NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `category` varchar(60) COLLATE utf8mb4_general_ci NOT NULL,
  `weight` decimal(5,2) NOT NULL DEFAULT '1.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `skill_aliases`
--

CREATE TABLE `skill_aliases` (
  `id` bigint NOT NULL,
  `skill_id` bigint NOT NULL,
  `alias_text` varchar(100) COLLATE utf8mb4_general_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `cluster_id` int DEFAULT NULL,
  `monthly_report_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `email_notifications_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `job_recommendations_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `email_verified` tinyint(1) DEFAULT '0',
  `email_verification_token` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email_verification_expires` datetime DEFAULT NULL,
  `password_reset_token` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `password_reset_expires` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_profiles`
--

CREATE TABLE `user_profiles` (
  `user_id` bigint NOT NULL,
  `full_name` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `headline` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `university` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `specialization` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `study_year` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `target_role` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `preferred_work_mode` varchar(30) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `about` text COLLATE utf8mb4_general_ci,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_skills`
--

CREATE TABLE `user_skills` (
  `user_id` bigint NOT NULL,
  `skill_id` bigint NOT NULL,
  `level` tinyint NOT NULL DEFAULT '0',
  `confidence` tinyint NOT NULL DEFAULT '3',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `weekly_scores`
--

CREATE TABLE `weekly_scores` (
  `id` int NOT NULL,
  `user_id` bigint NOT NULL,
  `week_start` date NOT NULL,
  `score` decimal(5,2) NOT NULL DEFAULT '0.00',
  `delta` decimal(5,2) NOT NULL DEFAULT '0.00',
  `cluster_id` int DEFAULT NULL
) ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_log`
--
ALTER TABLE `activity_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_activity_user` (`user_id`);

--
-- Indexes for table `jobs`
--
ALTER TABLE `jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_jobs_user` (`user_id`);

--
-- Indexes for table `job_skills`
--
ALTER TABLE `job_skills`
  ADD PRIMARY KEY (`job_id`,`skill_id`),
  ADD KEY `fk_js_skill` (`skill_id`);

--
-- Indexes for table `roadmaps`
--
ALTER TABLE `roadmaps`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `job_id` (`job_id`);

--
-- Indexes for table `roadmap_steps`
--
ALTER TABLE `roadmap_steps`
  ADD PRIMARY KEY (`id`),
  ADD KEY `roadmap_id` (`roadmap_id`),
  ADD KEY `skill_id` (`skill_id`);

--
-- Indexes for table `skills`
--
ALTER TABLE `skills`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `skill_aliases`
--
ALTER TABLE `skill_aliases`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_skill_alias` (`skill_id`,`alias_text`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_profiles`
--
ALTER TABLE `user_profiles`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `user_skills`
--
ALTER TABLE `user_skills`
  ADD PRIMARY KEY (`user_id`,`skill_id`),
  ADD KEY `fk_us_skill` (`skill_id`);

--
-- Indexes for table `weekly_scores`
--
ALTER TABLE `weekly_scores`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user_week` (`user_id`,`week_start`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_log`
--
ALTER TABLE `activity_log`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `jobs`
--
ALTER TABLE `jobs`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roadmaps`
--
ALTER TABLE `roadmaps`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roadmap_steps`
--
ALTER TABLE `roadmap_steps`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `skills`
--
ALTER TABLE `skills`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `skill_aliases`
--
ALTER TABLE `skill_aliases`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `weekly_scores`
--
ALTER TABLE `weekly_scores`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activity_log`
--
ALTER TABLE `activity_log`
  ADD CONSTRAINT `fk_activity_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `jobs`
--
ALTER TABLE `jobs`
  ADD CONSTRAINT `fk_jobs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `job_skills`
--
ALTER TABLE `job_skills`
  ADD CONSTRAINT `fk_js_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_js_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `roadmaps`
--
ALTER TABLE `roadmaps`
  ADD CONSTRAINT `roadmaps_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `roadmaps_ibfk_2` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `roadmap_steps`
--
ALTER TABLE `roadmap_steps`
  ADD CONSTRAINT `roadmap_steps_ibfk_1` FOREIGN KEY (`roadmap_id`) REFERENCES `roadmaps` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `roadmap_steps_ibfk_2` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `skill_aliases`
--
ALTER TABLE `skill_aliases`
  ADD CONSTRAINT `fk_skill_aliases_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_profiles`
--
ALTER TABLE `user_profiles`
  ADD CONSTRAINT `fk_user_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_skills`
--
ALTER TABLE `user_skills`
  ADD CONSTRAINT `fk_us_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_us_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `weekly_scores`
--
ALTER TABLE `weekly_scores`
  ADD CONSTRAINT `weekly_scores_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
