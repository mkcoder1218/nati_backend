-- Negari Database Backup
-- Created: 2025-05-26T13:09:52.536Z
-- Database: government_feedback
-- Host: localhost:5432

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum type: entity_type
DO $$ BEGIN
    CREATE TYPE entity_type AS ENUM ('review', 'office', 'service', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum type: frequency_type
DO $$ BEGIN
    CREATE TYPE frequency_type AS ENUM ('daily', 'weekly', 'monthly', 'quarterly');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum type: language_type
DO $$ BEGIN
    CREATE TYPE language_type AS ENUM ('amharic', 'english');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum type: notification_type
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('info', 'warning', 'success', 'error');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum type: office_type
DO $$ BEGIN
    CREATE TYPE office_type AS ENUM ('kebele', 'woreda', 'municipal', 'regional', 'federal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum type: office_vote_type
DO $$ BEGIN
    CREATE TYPE office_vote_type AS ENUM ('upvote', 'downvote');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum type: report_type
DO $$ BEGIN
    CREATE TYPE report_type AS ENUM ('sentiment', 'feedback', 'performance', 'services');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum type: review_status
DO $$ BEGIN
    CREATE TYPE review_status AS ENUM ('pending', 'approved', 'flagged', 'removed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum type: scheduled_report_status
DO $$ BEGIN
    CREATE TYPE scheduled_report_status AS ENUM ('active', 'paused', 'inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum type: sentiment_type
DO $$ BEGIN
    CREATE TYPE sentiment_type AS ENUM ('positive', 'negative', 'neutral');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum type: user_role
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('citizen', 'official', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum type: vote_type
DO $$ BEGIN
    CREATE TYPE vote_type AS ENUM ('helpful', 'not_helpful', 'flag');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Data for table comment_replies (2 rows)
INSERT INTO "comment_replies" ("reply_id", "comment_id", "user_id", "content", "created_at", "updated_at") VALUES ('74a5ef2c-360f-47dd-be61-156185deccae', 'a98b46ac-642c-4306-862b-6be29f182c81', 'faad46b9-424b-4a9d-a5fe-be2dfc2cc5a1', 'ok', '2025-05-26T11:32:12.412Z', '2025-05-26T11:32:12.412Z') ON CONFLICT DO NOTHING;
INSERT INTO "comment_replies" ("reply_id", "comment_id", "user_id", "content", "created_at", "updated_at") VALUES ('999c8acb-dee1-4fa9-9deb-c7d81ecb8885', 'a98b46ac-642c-4306-862b-6be29f182c81', 'faad46b9-424b-4a9d-a5fe-be2dfc2cc5a1', 'hi', '2025-05-26T11:34:23.857Z', '2025-05-26T11:34:23.857Z') ON CONFLICT DO NOTHING;

-- Data for table comments (3 rows)
INSERT INTO "comments" ("comment_id", "user_id", "content", "status", "created_at", "updated_at", "admin_response", "admin_response_by", "admin_response_at") VALUES ('97525a3f-d712-4e1d-ac25-9dbfd9832b89', 'faad46b9-424b-4a9d-a5fe-be2dfc2cc5a1', 'hi', 'approved', '2025-05-26T11:00:45.472Z', '2025-05-26T11:01:34.674Z', NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO "comments" ("comment_id", "user_id", "content", "status", "created_at", "updated_at", "admin_response", "admin_response_by", "admin_response_at") VALUES ('a98b46ac-642c-4306-862b-6be29f182c81', 'faad46b9-424b-4a9d-a5fe-be2dfc2cc5a1', 'why', 'approved', '2025-05-26T11:20:05.829Z', '2025-05-26T11:42:58.754Z', 'leme know', '07727cdb-20a7-4205-a2ff-22f8cbc2cdc6', '2025-05-26T11:20:29.510Z') ON CONFLICT DO NOTHING;
INSERT INTO "comments" ("comment_id", "user_id", "content", "status", "created_at", "updated_at", "admin_response", "admin_response_by", "admin_response_at") VALUES ('9644f3ca-2818-41c0-968d-b43d5078b959', 'faad46b9-424b-4a9d-a5fe-be2dfc2cc5a1', 'hi', 'approved', '2025-05-26T11:17:08.456Z', '2025-05-26T11:49:52.163Z', 'boom', '07727cdb-20a7-4205-a2ff-22f8cbc2cdc6', '2025-05-26T11:49:52.163Z') ON CONFLICT DO NOTHING;

-- Data for table migrations (9 rows)
INSERT INTO "migrations" ("id", "filename", "executed_at") VALUES (1, '001_create_tables.sql', '2025-05-25T19:25:56.418Z') ON CONFLICT DO NOTHING;
INSERT INTO "migrations" ("id", "filename", "executed_at") VALUES (2, '002_add_office_votes.sql', '2025-05-25T19:25:56.451Z') ON CONFLICT DO NOTHING;
INSERT INTO "migrations" ("id", "filename", "executed_at") VALUES (3, '002_alter_operating_hours.sql', '2025-05-25T19:25:56.525Z') ON CONFLICT DO NOTHING;
INSERT INTO "migrations" ("id", "filename", "executed_at") VALUES (4, '003_add_notifications_table.sql', '2025-05-25T19:25:56.538Z') ON CONFLICT DO NOTHING;
INSERT INTO "migrations" ("id", "filename", "executed_at") VALUES (5, '003_add_office_id_to_users.sql', '2025-05-25T20:13:31.364Z') ON CONFLICT DO NOTHING;
INSERT INTO "migrations" ("id", "filename", "executed_at") VALUES (6, '007_ensure_office_assignments.sql', '2025-05-26T08:17:52.308Z') ON CONFLICT DO NOTHING;
INSERT INTO "migrations" ("id", "filename", "executed_at") VALUES (7, 'create_comments_table.sql', '2025-05-26T10:22:38.557Z') ON CONFLICT DO NOTHING;
INSERT INTO "migrations" ("id", "filename", "executed_at") VALUES (8, 'add_admin_response_to_comments.sql', '2025-05-26T11:05:18.086Z') ON CONFLICT DO NOTHING;
INSERT INTO "migrations" ("id", "filename", "executed_at") VALUES (9, 'create_comment_replies_table.sql', '2025-05-26T11:21:50.977Z') ON CONFLICT DO NOTHING;

-- Table notifications is empty

-- Data for table office_votes (1 rows)
INSERT INTO "office_votes" ("vote_id", "user_id", "office_id", "vote_type", "created_at", "updated_at") VALUES ('c9a41512-56a8-435a-929f-5153f6e5707c', 'faad46b9-424b-4a9d-a5fe-be2dfc2cc5a1', '33383584-8d8f-460e-97c1-cf64a7b6ccbb', 'upvote', '2025-05-26T10:20:38.486Z', '2025-05-26T10:20:38.486Z') ON CONFLICT DO NOTHING;

-- Data for table offices (2 rows)
INSERT INTO "offices" ("office_id", "name", "type", "latitude", "longitude", "address", "contact_info", "operating_hours", "parent_office_id", "upvote_count", "downvote_count", "created_at", "updated_at") VALUES ('8cce11cb-7f13-464e-8b25-7dc6781d3d1d', 'Bole Subcity Woreda Office', 'woreda', '9.03221363', '38.66260529', 'Bole Road, Addis Ababa', 'Phone: 0112345678, Email: bole@addisababa.gov.et', '{"monday,tuesday,wednesday,thursday,friday":{"isOpen":true,"slots":"09:00-17:00"},"saturday,sunday":{"isOpen":false,"slots":"09:00-13:00"}}', NULL, 0, 0, '2025-05-25T20:00:27.789Z', '2025-05-26T09:26:05.761Z') ON CONFLICT DO NOTHING;
INSERT INTO "offices" ("office_id", "name", "type", "latitude", "longitude", "address", "contact_info", "operating_hours", "parent_office_id", "upvote_count", "downvote_count", "created_at", "updated_at") VALUES ('33383584-8d8f-460e-97c1-cf64a7b6ccbb', 'Bole Subcity Kebele 01', 'kebele', '9.01077100', '38.76125700', 'Bole Road, Addis Ababa', 'Phone: 0111234567, Email: bole01@addisababa.gov.et', 'Monday-Friday: 8:30 AM - 5:00 PM', NULL, 1, 0, '2025-05-25T20:00:27.789Z', '2025-05-26T10:20:38.486Z') ON CONFLICT DO NOTHING;

-- Data for table reports (7 rows)
INSERT INTO "reports" ("report_id", "title", "filename", "file_path", "file_size", "format", "report_type", "office_id", "user_id", "start_date", "end_date", "status", "created_at", "updated_at") VALUES ('e0ca0598-243c-4586-bec0-fa996288e50f', 'Sentiment Analysis - All Government Offices', 'all-government-offices-sentiment-1748247355488.pdf', 'C:\Users\mkr\Downloads\Telegram Desktop\Negari\Backend\public\reports\all-government-offices-sentiment-1748247355488.pdf', '5093', 'pdf', 'sentiment', NULL, 'f0864bc3-6fdc-4e2d-ac4c-7c8ff372fd3b', NULL, NULL, 'completed', '2025-05-26T08:15:55.472Z', '2025-05-26T08:15:55.705Z') ON CONFLICT DO NOTHING;
INSERT INTO "reports" ("report_id", "title", "filename", "file_path", "file_size", "format", "report_type", "office_id", "user_id", "start_date", "end_date", "status", "created_at", "updated_at") VALUES ('41315de9-03b3-4e1b-a1fd-26deeb4ba6a8', 'Sentiment Analysis - All Government Offices', 'all-government-offices-sentiment-1748247624569.pdf', 'C:\Users\mkr\Downloads\Telegram Desktop\Negari\Backend\public\reports\all-government-offices-sentiment-1748247624569.pdf', '5091', 'pdf', 'sentiment', '33383584-8d8f-460e-97c1-cf64a7b6ccbb', 'f0864bc3-6fdc-4e2d-ac4c-7c8ff372fd3b', NULL, NULL, 'completed', '2025-05-26T08:20:24.533Z', '2025-05-26T08:20:24.831Z') ON CONFLICT DO NOTHING;
INSERT INTO "reports" ("report_id", "title", "filename", "file_path", "file_size", "format", "report_type", "office_id", "user_id", "start_date", "end_date", "status", "created_at", "updated_at") VALUES ('343ea723-cfad-489f-b62e-47270b65be4c', 'Sentiment Analysis - All Government Offices', 'all-government-offices-sentiment-1748244074625.pdf', 'C:\Users\mkr\Downloads\Telegram Desktop\Negari\Backend\public\reports\all-government-offices-sentiment-1748244074625.pdf', '5092', 'pdf', 'sentiment', NULL, 'f0864bc3-6fdc-4e2d-ac4c-7c8ff372fd3b', NULL, NULL, 'completed', '2025-05-26T07:21:14.600Z', '2025-05-26T07:21:14.712Z') ON CONFLICT DO NOTHING;
INSERT INTO "reports" ("report_id", "title", "filename", "file_path", "file_size", "format", "report_type", "office_id", "user_id", "start_date", "end_date", "status", "created_at", "updated_at") VALUES ('4ca5c691-7da2-438d-90ee-aa043ad5294c', 'Sentiment Analysis - All Government Offices', 'all-government-offices-sentiment-1748244462178.pdf', 'C:\Users\mkr\Downloads\Telegram Desktop\Negari\Backend\public\reports\all-government-offices-sentiment-1748244462178.pdf', '5093', 'pdf', 'sentiment', NULL, 'f0864bc3-6fdc-4e2d-ac4c-7c8ff372fd3b', NULL, NULL, 'completed', '2025-05-26T07:27:42.080Z', '2025-05-26T07:27:42.365Z') ON CONFLICT DO NOTHING;
INSERT INTO "reports" ("report_id", "title", "filename", "file_path", "file_size", "format", "report_type", "office_id", "user_id", "start_date", "end_date", "status", "created_at", "updated_at") VALUES ('c90c6446-8d15-4b9a-9b78-a081fc7d4300', 'Sentiment Analysis - All Government Offices', 'all-government-offices-sentiment-1748244713391.pdf', 'C:\Users\mkr\Downloads\Telegram Desktop\Negari\Backend\public\reports\all-government-offices-sentiment-1748244713391.pdf', '5093', 'pdf', 'sentiment', NULL, 'f0864bc3-6fdc-4e2d-ac4c-7c8ff372fd3b', NULL, NULL, 'completed', '2025-05-26T07:31:53.352Z', '2025-05-26T07:31:53.715Z') ON CONFLICT DO NOTHING;
INSERT INTO "reports" ("report_id", "title", "filename", "file_path", "file_size", "format", "report_type", "office_id", "user_id", "start_date", "end_date", "status", "created_at", "updated_at") VALUES ('13790701-129b-4385-9703-50cae7aea2af', 'Sentiment Analysis - All Government Offices', 'all-government-offices-sentiment-1748244908305.pdf', 'C:\Users\mkr\Downloads\Telegram Desktop\Negari\Backend\public\reports\all-government-offices-sentiment-1748244908305.pdf', '5094', 'pdf', 'sentiment', NULL, 'f0864bc3-6fdc-4e2d-ac4c-7c8ff372fd3b', NULL, NULL, 'completed', '2025-05-26T07:35:08.269Z', '2025-05-26T07:35:08.481Z') ON CONFLICT DO NOTHING;
INSERT INTO "reports" ("report_id", "title", "filename", "file_path", "file_size", "format", "report_type", "office_id", "user_id", "start_date", "end_date", "status", "created_at", "updated_at") VALUES ('c52d0910-a6df-4db6-947a-189369dd2cb3', 'Sentiment Analysis - All Government Offices', 'all-government-offices-sentiment-1748247327701.pdf', 'C:\Users\mkr\Downloads\Telegram Desktop\Negari\Backend\public\reports\all-government-offices-sentiment-1748247327701.pdf', '5093', 'pdf', 'sentiment', NULL, 'f0864bc3-6fdc-4e2d-ac4c-7c8ff372fd3b', NULL, NULL, 'completed', '2025-05-26T08:15:27.443Z', '2025-05-26T08:15:28.110Z') ON CONFLICT DO NOTHING;

-- Data for table review_replies (2 rows)
INSERT INTO "review_replies" ("reply_id", "review_id", "user_id", "content", "created_at", "updated_at") VALUES ('3ba3275c-6646-4699-b496-c152e1a94cbf', '60ffc92a-9095-4b3a-8043-6e898800595e', 'f0864bc3-6fdc-4e2d-ac4c-7c8ff372fd3b', 'hi', '2025-05-25T19:58:49.064Z', '2025-05-25T19:58:49.064Z') ON CONFLICT DO NOTHING;
INSERT INTO "review_replies" ("reply_id", "review_id", "user_id", "content", "created_at", "updated_at") VALUES ('52b6da3e-9573-417a-801b-eb5035d5252a', '60ffc92a-9095-4b3a-8043-6e898800595e', 'f0864bc3-6fdc-4e2d-ac4c-7c8ff372fd3b', 'nice', '2025-05-25T20:06:26.034Z', '2025-05-25T20:06:26.034Z') ON CONFLICT DO NOTHING;

-- Data for table reviews (19 rows)
INSERT INTO "reviews" ("review_id", "user_id", "office_id", "rating", "comment", "is_anonymous", "created_at", "updated_at", "status") VALUES ('0ad19b7b-740c-4e28-985e-93b960778a7f', NULL, '33383584-8d8f-460e-97c1-cf64a7b6ccbb', 5, 'hi', true, '2025-05-25T20:27:58.837Z', '2025-05-25T20:27:58.837Z', 'approved') ON CONFLICT DO NOTHING;
INSERT INTO "reviews" ("review_id", "user_id", "office_id", "rating", "comment", "is_anonymous", "created_at", "updated_at", "status") VALUES ('e60feac2-cece-45a2-9453-214dd91c2e61', '151a7d35-87b9-4a33-bbc3-2488e6fa6ff0', '33383584-8d8f-460e-97c1-cf64a7b6ccbb', 5, 'sdjncjsdjkl', false, '2025-05-25T20:28:42.771Z', '2025-05-25T20:28:42.771Z', 'approved') ON CONFLICT DO NOTHING;
INSERT INTO "reviews" ("review_id", "user_id", "office_id", "rating", "comment", "is_anonymous", "created_at", "updated_at", "status") VALUES ('2b7873f4-8d8a-41b8-9839-048bd8bda55d', '151a7d35-87b9-4a33-bbc3-2488e6fa6ff0', '33383584-8d8f-460e-97c1-cf64a7b6ccbb', 5, 'aw', false, '2025-05-25T20:28:58.517Z', '2025-05-25T20:28:58.517Z', 'approved') ON CONFLICT DO NOTHING;
INSERT INTO "reviews" ("review_id", "user_id", "office_id", "rating", "comment", "is_anonymous", "created_at", "updated_at", "status") VALUES ('890a8fb6-4a5e-4f1d-96c0-6a4d2f35769a', '151a7d35-87b9-4a33-bbc3-2488e6fa6ff0', '33383584-8d8f-460e-97c1-cf64a7b6ccbb', 5, 'jchsjkdhc', false, '2025-05-25T20:37:30.814Z', '2025-05-25T20:37:30.814Z', 'approved') ON CONFLICT DO NOTHING;
INSERT INTO "reviews" ("review_id", "user_id", "office_id", "rating", "comment", "is_anonymous", "created_at", "updated_at", "status") VALUES ('7d33dcdc-91c9-493b-9783-ff72bf9a7fa6', 'faad46b9-424b-4a9d-a5fe-be2dfc2cc5a1', '8cce11cb-7f13-464e-8b25-7dc6781d3d1d', 4, 'Good service, but waiting time could be improved', false, '2025-05-22T08:17:52.228Z', '2025-05-26T08:17:52.228Z', 'approved') ON CONFLICT DO NOTHING;
INSERT INTO "reviews" ("review_id", "user_id", "office_id", "rating", "comment", "is_anonymous", "created_at", "updated_at", "status") VALUES ('b3f54f43-af9c-4645-a9fa-7ce3cad4b8bf', 'faad46b9-424b-4a9d-a5fe-be2dfc2cc5a1', '8cce11cb-7f13-464e-8b25-7dc6781d3d1d', 5, 'Excellent staff and quick processing', false, '2025-05-09T08:17:52.228Z', '2025-05-26T08:17:52.228Z', 'approved') ON CONFLICT DO NOTHING;
INSERT INTO "reviews" ("review_id", "user_id", "office_id", "rating", "comment", "is_anonymous", "created_at", "updated_at", "status") VALUES ('8ba737ad-edcc-49ad-a7ac-6104aa7b8ff4', 'faad46b9-424b-4a9d-a5fe-be2dfc2cc5a1', '8cce11cb-7f13-464e-8b25-7dc6781d3d1d', 3, 'Average experience, some delays in document processing', false, '2025-05-25T08:17:52.228Z', '2025-05-26T08:17:52.228Z', 'approved') ON CONFLICT DO NOTHING;
INSERT INTO "reviews" ("review_id", "user_id", "office_id", "rating", "comment", "is_anonymous", "created_at", "updated_at", "status") VALUES ('3c728025-6f84-4292-97af-320ffc1ff277', 'faad46b9-424b-4a9d-a5fe-be2dfc2cc5a1', '8cce11cb-7f13-464e-8b25-7dc6781d3d1d', 2, 'Long waiting times and unclear requirements', false, '2025-04-28T08:17:52.228Z', '2025-05-26T08:17:52.228Z', 'approved') ON CONFLICT DO NOTHING;
INSERT INTO "reviews" ("review_id", "user_id", "office_id", "rating", "comment", "is_anonymous", "created_at", "updated_at", "status") VALUES ('81a6e0f4-a3e5-42ed-9e5c-eb6792959fec', 'faad46b9-424b-4a9d-a5fe-be2dfc2cc5a1', '8cce11cb-7f13-464e-8b25-7dc6781d3d1d', 4, 'Helpful staff but office facilities need improvement', false, '2025-05-09T08:17:52.228Z', '2025-05-26T08:17:52.228Z', 'approved') ON CONFLICT DO NOTHING;
INSERT INTO "reviews" ("review_id", "user_id", "office_id", "rating", "comment", "is_anonymous", "created_at", "updated_at", "status") VALUES ('1c1c04c6-e5eb-4c68-bb88-01f02ed1c695', 'faad46b9-424b-4a9d-a5fe-be2dfc2cc5a1', '8cce11cb-7f13-464e-8b25-7dc6781d3d1d', 1, 'Very poor service and rude staff behavior', false, '2025-05-13T08:17:52.228Z', '2025-05-26T08:17:52.228Z', 'approved') ON CONFLICT DO NOTHING;
INSERT INTO "reviews" ("review_id", "user_id", "office_id", "rating", "comment", "is_anonymous", "created_at", "updated_at", "status") VALUES ('65f1d971-d4e9-46c0-b0e4-d7af49bd5664', 'faad46b9-424b-4a9d-a5fe-be2dfc2cc5a1', '8cce11cb-7f13-464e-8b25-7dc6781d3d1d', 5, 'Outstanding service delivery and professional staff', false, '2025-05-16T08:17:52.228Z', '2025-05-26T08:17:52.228Z', 'approved') ON CONFLICT DO NOTHING;
INSERT INTO "reviews" ("review_id", "user_id", "office_id", "rating", "comment", "is_anonymous", "created_at", "updated_at", "status") VALUES ('7f408575-3ded-4b38-b1d4-cb10dccd388d', 'faad46b9-424b-4a9d-a5fe-be2dfc2cc5a1', '8cce11cb-7f13-464e-8b25-7dc6781d3d1d', 3, 'Okay service but could be more efficient', false, '2025-05-23T08:17:52.228Z', '2025-05-26T08:17:52.228Z', 'approved') ON CONFLICT DO NOTHING;
INSERT INTO "reviews" ("review_id", "user_id", "office_id", "rating", "comment", "is_anonymous", "created_at", "updated_at", "status") VALUES ('67535a66-d15f-4ec6-bf6b-3a8460afeea3', 'faad46b9-424b-4a9d-a5fe-be2dfc2cc5a1', '8cce11cb-7f13-464e-8b25-7dc6781d3d1d', 5, 'review', false, '2025-05-26T10:29:04.317Z', '2025-05-26T10:29:04.317Z', 'approved') ON CONFLICT DO NOTHING;
INSERT INTO "reviews" ("review_id", "user_id", "office_id", "rating", "comment", "is_anonymous", "created_at", "updated_at", "status") VALUES ('63e4888a-862c-4a0d-94f7-134372e311ac', 'faad46b9-424b-4a9d-a5fe-be2dfc2cc5a1', '33383584-8d8f-460e-97c1-cf64a7b6ccbb', 4, 'The service was good but there was a long queue. Staff were helpful and professional.', false, '2025-05-24T19:52:00.194Z', '2025-05-24T19:52:00.194Z', 'pending') ON CONFLICT DO NOTHING;
INSERT INTO "reviews" ("review_id", "user_id", "office_id", "rating", "comment", "is_anonymous", "created_at", "updated_at", "status") VALUES ('a937a8bc-0804-4a9c-993d-0e6b285fb53a', 'faad46b9-424b-4a9d-a5fe-be2dfc2cc5a1', '33383584-8d8f-460e-97c1-cf64a7b6ccbb', 5, 'nice', false, '2025-05-25T19:29:15.412Z', '2025-05-25T19:29:15.412Z', 'pending') ON CONFLICT DO NOTHING;
INSERT INTO "reviews" ("review_id", "user_id", "office_id", "rating", "comment", "is_anonymous", "created_at", "updated_at", "status") VALUES ('0d781de7-3ae5-4848-822b-128b8773244b', 'faad46b9-424b-4a9d-a5fe-be2dfc2cc5a1', '33383584-8d8f-460e-97c1-cf64a7b6ccbb', 5, 'gvvjhjghgjgjgyg', false, '2025-05-25T19:29:45.778Z', '2025-05-25T19:29:45.778Z', 'pending') ON CONFLICT DO NOTHING;
INSERT INTO "reviews" ("review_id", "user_id", "office_id", "rating", "comment", "is_anonymous", "created_at", "updated_at", "status") VALUES ('60ffc92a-9095-4b3a-8043-6e898800595e', 'faad46b9-424b-4a9d-a5fe-be2dfc2cc5a1', '33383584-8d8f-460e-97c1-cf64a7b6ccbb', 5, 'hi', false, '2025-05-25T19:29:58.650Z', '2025-05-25T19:29:58.650Z', 'pending') ON CONFLICT DO NOTHING;
INSERT INTO "reviews" ("review_id", "user_id", "office_id", "rating", "comment", "is_anonymous", "created_at", "updated_at", "status") VALUES ('c8008c21-133e-4581-ab66-aa2fbb69fb79', 'faad46b9-424b-4a9d-a5fe-be2dfc2cc5a1', '33383584-8d8f-460e-97c1-cf64a7b6ccbb', 5, 'a', false, '2025-05-26T10:48:04.482Z', '2025-05-26T12:48:12.944Z', 'flagged') ON CONFLICT DO NOTHING;
INSERT INTO "reviews" ("review_id", "user_id", "office_id", "rating", "comment", "is_anonymous", "created_at", "updated_at", "status") VALUES ('7b3a977e-b67e-4656-b3b4-18a58172e098', 'faad46b9-424b-4a9d-a5fe-be2dfc2cc5a1', '33383584-8d8f-460e-97c1-cf64a7b6ccbb', 5, 'nlsdc', false, '2025-05-26T10:34:14.401Z', '2025-05-26T12:52:58.206Z', 'flagged') ON CONFLICT DO NOTHING;

-- Table scheduled_reports is empty

-- Data for table sentiment_logs (19 rows)
INSERT INTO "sentiment_logs" ("log_id", "review_id", "sentiment", "category", "confidence_score", "processed_at", "language") VALUES ('27455fb4-9f44-42b2-8509-799534d246b6', 'a937a8bc-0804-4a9c-993d-0e6b285fb53a', 'neutral', NULL, '0.6000', '2025-05-25T19:29:15.418Z', 'english') ON CONFLICT DO NOTHING;
INSERT INTO "sentiment_logs" ("log_id", "review_id", "sentiment", "category", "confidence_score", "processed_at", "language") VALUES ('61e5d80e-f809-4aa5-acdd-6c2a74f6c52e', '0d781de7-3ae5-4848-822b-128b8773244b', 'neutral', NULL, '0.6000', '2025-05-25T19:29:45.784Z', 'english') ON CONFLICT DO NOTHING;
INSERT INTO "sentiment_logs" ("log_id", "review_id", "sentiment", "category", "confidence_score", "processed_at", "language") VALUES ('998b91e7-23c9-4991-922c-b84c708d3899', '60ffc92a-9095-4b3a-8043-6e898800595e', 'neutral', NULL, '0.6000', '2025-05-25T19:29:58.664Z', 'english') ON CONFLICT DO NOTHING;
INSERT INTO "sentiment_logs" ("log_id", "review_id", "sentiment", "category", "confidence_score", "processed_at", "language") VALUES ('7082397d-09bc-4565-be3c-0d339b8018fa', '0ad19b7b-740c-4e28-985e-93b960778a7f', 'neutral', NULL, '0.6000', '2025-05-25T20:27:58.843Z', 'english') ON CONFLICT DO NOTHING;
INSERT INTO "sentiment_logs" ("log_id", "review_id", "sentiment", "category", "confidence_score", "processed_at", "language") VALUES ('2bc81fdc-b5b2-4828-8c53-0f26cf1a46e5', 'e60feac2-cece-45a2-9453-214dd91c2e61', 'neutral', NULL, '0.6000', '2025-05-25T20:28:42.785Z', 'english') ON CONFLICT DO NOTHING;
INSERT INTO "sentiment_logs" ("log_id", "review_id", "sentiment", "category", "confidence_score", "processed_at", "language") VALUES ('a069adae-48b8-40b2-86b2-fc5026cc7d09', '2b7873f4-8d8a-41b8-9839-048bd8bda55d', 'neutral', NULL, '0.6000', '2025-05-25T20:28:58.523Z', 'english') ON CONFLICT DO NOTHING;
INSERT INTO "sentiment_logs" ("log_id", "review_id", "sentiment", "category", "confidence_score", "processed_at", "language") VALUES ('7f86372b-3f28-4732-ae72-c79cf44f96bf', '890a8fb6-4a5e-4f1d-96c0-6a4d2f35769a', 'neutral', NULL, '0.6000', '2025-05-25T20:37:30.835Z', 'english') ON CONFLICT DO NOTHING;
INSERT INTO "sentiment_logs" ("log_id", "review_id", "sentiment", "category", "confidence_score", "processed_at", "language") VALUES ('256b2874-1d5e-4a23-93d1-6ec4d4965328', '63e4888a-862c-4a0d-94f7-134372e311ac', 'positive', 'waiting_time', '0.9500', '2025-05-26T06:35:07.724Z', 'english') ON CONFLICT DO NOTHING;
INSERT INTO "sentiment_logs" ("log_id", "review_id", "sentiment", "category", "confidence_score", "processed_at", "language") VALUES ('83b18349-c179-43ce-81bf-f06e4d687c58', '7d33dcdc-91c9-493b-9783-ff72bf9a7fa6', 'positive', 'Service Quality', '0.8781', '2025-05-26T08:17:52.228Z', 'english') ON CONFLICT DO NOTHING;
INSERT INTO "sentiment_logs" ("log_id", "review_id", "sentiment", "category", "confidence_score", "processed_at", "language") VALUES ('f1ceae93-a626-4f07-ad60-49c179f959ea', 'b3f54f43-af9c-4645-a9fa-7ce3cad4b8bf', 'positive', 'Staff Performance', '0.8532', '2025-05-26T08:17:52.228Z', 'english') ON CONFLICT DO NOTHING;
INSERT INTO "sentiment_logs" ("log_id", "review_id", "sentiment", "category", "confidence_score", "processed_at", "language") VALUES ('9783517b-ae5e-4cb3-995b-28057b922857', '8ba737ad-edcc-49ad-a7ac-6104aa7b8ff4', 'neutral', 'Processing Time', '0.8532', '2025-05-26T08:17:52.228Z', 'english') ON CONFLICT DO NOTHING;
INSERT INTO "sentiment_logs" ("log_id", "review_id", "sentiment", "category", "confidence_score", "processed_at", "language") VALUES ('37979221-7b58-4263-93d7-e83437c62ae0', '3c728025-6f84-4292-97af-320ffc1ff277', 'negative', 'Wait Time', '0.8953', '2025-05-26T08:17:52.228Z', 'english') ON CONFLICT DO NOTHING;
INSERT INTO "sentiment_logs" ("log_id", "review_id", "sentiment", "category", "confidence_score", "processed_at", "language") VALUES ('a2c2ac02-f8d2-465b-a5d1-3c3054ac3eaf', '81a6e0f4-a3e5-42ed-9e5c-eb6792959fec', 'positive', 'Facilities', '0.9118', '2025-05-26T08:17:52.228Z', 'english') ON CONFLICT DO NOTHING;
INSERT INTO "sentiment_logs" ("log_id", "review_id", "sentiment", "category", "confidence_score", "processed_at", "language") VALUES ('c9637ae0-d7bf-486f-89ea-27e398411a33', '1c1c04c6-e5eb-4c68-bb88-01f02ed1c695', 'negative', 'Staff Behavior', '0.8674', '2025-05-26T08:17:52.228Z', 'english') ON CONFLICT DO NOTHING;
INSERT INTO "sentiment_logs" ("log_id", "review_id", "sentiment", "category", "confidence_score", "processed_at", "language") VALUES ('83995d31-eb27-4873-a483-6ad1e45b8e37', '65f1d971-d4e9-46c0-b0e4-d7af49bd5664', 'positive', 'Service Quality', '0.8675', '2025-05-26T08:17:52.228Z', 'english') ON CONFLICT DO NOTHING;
INSERT INTO "sentiment_logs" ("log_id", "review_id", "sentiment", "category", "confidence_score", "processed_at", "language") VALUES ('aa8d49ec-dd30-4f57-8844-2c089099e454', '7f408575-3ded-4b38-b1d4-cb10dccd388d', 'neutral', 'Efficiency', '0.9462', '2025-05-26T08:17:52.228Z', 'english') ON CONFLICT DO NOTHING;
INSERT INTO "sentiment_logs" ("log_id", "review_id", "sentiment", "category", "confidence_score", "processed_at", "language") VALUES ('569ebdb8-7f72-4c31-b2c6-76090af5bbba', '67535a66-d15f-4ec6-bf6b-3a8460afeea3', 'neutral', NULL, '0.6000', '2025-05-26T10:29:04.324Z', 'english') ON CONFLICT DO NOTHING;
INSERT INTO "sentiment_logs" ("log_id", "review_id", "sentiment", "category", "confidence_score", "processed_at", "language") VALUES ('ba96b2e4-a65c-4b32-9b09-5415f81efc18', '7b3a977e-b67e-4656-b3b4-18a58172e098', 'neutral', NULL, '0.6000', '2025-05-26T10:34:14.408Z', 'english') ON CONFLICT DO NOTHING;
INSERT INTO "sentiment_logs" ("log_id", "review_id", "sentiment", "category", "confidence_score", "processed_at", "language") VALUES ('f36abe9f-ebea-442e-a008-54ce4132bfae', 'c8008c21-133e-4581-ab66-aa2fbb69fb79', 'neutral', NULL, '0.6000', '2025-05-26T10:48:04.498Z', 'english') ON CONFLICT DO NOTHING;

-- Data for table service_guides (2 rows)
INSERT INTO "service_guides" ("guide_id", "office_id", "title", "content", "language", "created_at", "updated_at") VALUES ('86fc70dc-7a23-49e4-ae41-6c410b29ee8c', '33383584-8d8f-460e-97c1-cf64a7b6ccbb', 'ID Card Application', '{"description":"Apply for a new ID card or renew an existing one at your local Kebele or Woreda office.","requirements":["Original birth certificate","Residence certificate from your Kebele","Two recent passport-sized photographs (3x4cm)","Previous ID card (if renewing)","Application form (available at the office)"],"steps":[{"title":"Gather Required Documents","description":"Collect all the required documents listed above before visiting the office."},{"title":"Visit Your Local Kebele Office","description":"Go to the Kebele office in your area during working hours (Monday-Friday, 8:30 AM - 5:00 PM)."},{"title":"Fill Out Application Form","description":"Complete the application form provided at the office. Staff can assist if needed."},{"title":"Submit Documents and Photos","description":"Submit your completed application form along with all required documents and photographs."},{"title":"Payment of Fees","description":"Pay the required fee for ID card processing. The current fee is approximately 100 Birr."},{"title":"Receive Receipt","description":"You will receive a receipt with a collection date for your ID card."},{"title":"Collect Your ID Card","description":"Return on the specified date with your receipt to collect your new ID card."}],"estimated_time":"1-3 days","fees":"100 Birr","category":"Personal Documents"}', 'english', '2025-05-24T19:52:00.194Z', '2025-05-24T19:52:00.194Z') ON CONFLICT DO NOTHING;
INSERT INTO "service_guides" ("guide_id", "office_id", "title", "content", "language", "created_at", "updated_at") VALUES ('f1938b18-3383-40c9-8fd7-892f8d617371', '8cce11cb-7f13-464e-8b25-7dc6781d3d1d', 'jcndnsdj', '{"description":"cdjnjsdcj","requirements":["njksdnacjksdn"],"steps":[{"title":"Gather Required Documents","description":"cndjsdjcjsd"}],"estimated_time":"1-5 days","fees":"100 Birr","documents":[],"category":"Personal Documents"}', 'english', '2025-05-26T10:00:55.385Z', '2025-05-26T10:00:55.385Z') ON CONFLICT DO NOTHING;

-- Data for table user_office_assignments (2 rows)
INSERT INTO "user_office_assignments" ("assignment_id", "user_id", "office_id", "assigned_at", "assigned_by", "is_primary", "status") VALUES ('30f7c7d6-981a-4516-94e4-f11a66e7b5c9', 'f0864bc3-6fdc-4e2d-ac4c-7c8ff372fd3b', '33383584-8d8f-460e-97c1-cf64a7b6ccbb', '2025-05-26T08:36:29.923Z', NULL, true, 'active') ON CONFLICT DO NOTHING;
INSERT INTO "user_office_assignments" ("assignment_id", "user_id", "office_id", "assigned_at", "assigned_by", "is_primary", "status") VALUES ('d14eb6e2-dd2f-4cf5-8e76-ec3f016323bd', 'f0864bc3-6fdc-4e2d-ac4c-7c8ff372fd3b', '8cce11cb-7f13-464e-8b25-7dc6781d3d1d', '2025-05-26T08:36:29.929Z', NULL, false, 'active') ON CONFLICT DO NOTHING;

-- Data for table users (11 rows)
INSERT INTO "users" ("user_id", "email", "password", "role", "full_name", "phone_number", "created_at", "last_login", "office_id") VALUES ('faad46b9-424b-4a9d-a5fe-be2dfc2cc5a1', 'citizen@example.com', '$2a$10$LYliFkon00/ijxV04OzYpOJbYeqphJ/xlliDExOu/sVZwBhReMxW2', 'citizen', 'Citizen User', '0933333333', '2025-05-24T19:52:00.194Z', '2025-05-26T12:45:45.933Z', NULL) ON CONFLICT DO NOTHING;
INSERT INTO "users" ("user_id", "email", "password", "role", "full_name", "phone_number", "created_at", "last_login", "office_id") VALUES ('c029b17f-f090-4345-9bdc-8f2f1f4d39cb', 'email@domain.com', '$2a$10$8JdY14T./49jDRcz81IRs./caugs6Ok2R7QKVjuadQWBKJ9hn9JG.', 'admin', 'Full Name', '+251911234567', '2025-05-25T18:35:49.615Z', '2025-05-25T19:06:57.527Z', NULL) ON CONFLICT DO NOTHING;
INSERT INTO "users" ("user_id", "email", "password", "role", "full_name", "phone_number", "created_at", "last_login", "office_id") VALUES ('07727cdb-20a7-4205-a2ff-22f8cbc2cdc6', 'admin@example.com', '$2a$10$qHvGDMaHjSCCi4xA9KEQR.YWXl8DC7zhs2OZeBcpMrkrwTpz09Jui', 'admin', 'Admin User', '0911111111', '2025-05-24T19:52:00.194Z', '2025-05-26T12:47:49.581Z', NULL) ON CONFLICT DO NOTHING;
INSERT INTO "users" ("user_id", "email", "password", "role", "full_name", "phone_number", "created_at", "last_login", "office_id") VALUES ('f0864bc3-6fdc-4e2d-ac4c-7c8ff372fd3b', 'official@example.com', '$2a$10$TZkvJv3AoWo6kz3brrUMTOUSnMDZjAiioZmzXnqVg4X.K4/ITFomC', 'official', 'Government Official', '0922222222', '2025-05-24T19:52:00.194Z', '2025-05-26T10:01:11.468Z', '33383584-8d8f-460e-97c1-cf64a7b6ccbb') ON CONFLICT DO NOTHING;
INSERT INTO "users" ("user_id", "email", "password", "role", "full_name", "phone_number", "created_at", "last_login", "office_id") VALUES ('151a7d35-87b9-4a33-bbc3-2488e6fa6ff0', 'citizen1@example.com', '$2a$10$CAVz.3ggrlzVM1Jr6tzYw.df/OD16YnswDDvf8ev6RqTNGqoTMk4.', 'citizen', 'mk code', '0933894492', '2025-05-25T20:26:43.036Z', '2025-05-25T20:33:52.447Z', NULL) ON CONFLICT DO NOTHING;
INSERT INTO "users" ("user_id", "email", "password", "role", "full_name", "phone_number", "created_at", "last_login", "office_id") VALUES ('0357a899-8546-487f-91ed-b27639b7911b', 'offical10@example.com', '$2a$10$JsNPCbq.BinDzfYIuLznDOOvqhJW0BiaCn5UwU55835utXCssBagS', 'official', 'djncjsdncjksd', '933894492', '2025-05-26T10:26:15.731Z', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO "users" ("user_id", "email", "password", "role", "full_name", "phone_number", "created_at", "last_login", "office_id") VALUES ('eb3e2daa-3d4b-4a11-9bf2-429db89ae68c', 'official1@addisababa.gov.et', '$2a$10$LAkr/W.gjfEYi7eCUiyxgu1Y0nRW1pch5GKlIhsUUtiHHG.3MsiQK', 'official', 'Alemayehu Tadesse', '+251911111111', '2025-05-26T08:51:22.671Z', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO "users" ("user_id", "email", "password", "role", "full_name", "phone_number", "created_at", "last_login", "office_id") VALUES ('96a36379-8f9d-4d4e-9049-1497f1ce1336', 'official2@addisababa.gov.et', '$2a$10$6ONnPwPgck5EuyQvdGa4Iu18JSWIeZ26zmha08EPsJZtgQB8HUG0.', 'official', 'Meron Bekele', '+251922222222', '2025-05-26T08:51:22.809Z', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO "users" ("user_id", "email", "password", "role", "full_name", "phone_number", "created_at", "last_login", "office_id") VALUES ('89346c24-18cc-408a-a578-2394c602c4bb', 'official3@addisababa.gov.et', '$2a$10$H8/rREqmvJJLYNBpgNi82ecS3Romq1SQU2yFzS7Rq9mhn4765tfGq', 'official', 'Dawit Haile', '+251933333333', '2025-05-26T08:51:23.006Z', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO "users" ("user_id", "email", "password", "role", "full_name", "phone_number", "created_at", "last_login", "office_id") VALUES ('284953f6-dc2f-4144-be14-d9b1c9a70c01', 'official4@addisababa.gov.et', '$2a$10$ye60nPmKiIREDQ/gjT4CduCBkAiPEyTPhZP2f5ww.iQ4ZOlPsZq6u', 'official', 'Hanan Mohammed', '+251944444444', '2025-05-26T08:51:23.178Z', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO "users" ("user_id", "email", "password", "role", "full_name", "phone_number", "created_at", "last_login", "office_id") VALUES ('e492bc31-8864-4fa9-bcd1-b96a245a7aec', 'official5@addisababa.gov.et', '$2a$10$5vo3fP3inlczvTZ7lNoWyOtDnAv26.MwjYlQq9lls3.QzdJwddvzm', 'official', 'Tesfaye Girma', '+251955555555', '2025-05-26T08:51:23.319Z', NULL, NULL) ON CONFLICT DO NOTHING;

-- Data for table votes (6 rows)
INSERT INTO "votes" ("vote_id", "user_id", "review_id", "vote_type", "created_at") VALUES ('11111111-1111-1111-1111-111111111111', 'faad46b9-424b-4a9d-a5fe-be2dfc2cc5a1', '0d781de7-3ae5-4848-822b-128b8773244b', 'flag', '2025-05-26T12:21:06.432Z') ON CONFLICT DO NOTHING;
INSERT INTO "votes" ("vote_id", "user_id", "review_id", "vote_type", "created_at") VALUES ('22222222-2222-2222-2222-222222222222', '07727cdb-20a7-4205-a2ff-22f8cbc2cdc6', '60ffc92a-9095-4b3a-8043-6e898800595e', 'flag', '2025-05-26T12:21:06.441Z') ON CONFLICT DO NOTHING;
INSERT INTO "votes" ("vote_id", "user_id", "review_id", "vote_type", "created_at") VALUES ('33333333-3333-3333-3333-333333333333', 'c029b17f-f090-4345-9bdc-8f2f1f4d39cb', '0ad19b7b-740c-4e28-985e-93b960778a7f', 'flag', '2025-05-26T12:21:06.444Z') ON CONFLICT DO NOTHING;
INSERT INTO "votes" ("vote_id", "user_id", "review_id", "vote_type", "created_at") VALUES ('44444444-4444-4444-4444-444444444444', 'faad46b9-424b-4a9d-a5fe-be2dfc2cc5a1', 'e60feac2-cece-45a2-9453-214dd91c2e61', 'helpful', '2025-05-26T12:21:06.447Z') ON CONFLICT DO NOTHING;
INSERT INTO "votes" ("vote_id", "user_id", "review_id", "vote_type", "created_at") VALUES ('8a792783-bdf3-4e96-be3d-40783ea6bf90', '07727cdb-20a7-4205-a2ff-22f8cbc2cdc6', 'c8008c21-133e-4581-ab66-aa2fbb69fb79', 'flag', '2025-05-26T12:48:12.941Z') ON CONFLICT DO NOTHING;
INSERT INTO "votes" ("vote_id", "user_id", "review_id", "vote_type", "created_at") VALUES ('bf85d903-58c3-4072-9d28-5f01b1b86acc', '07727cdb-20a7-4205-a2ff-22f8cbc2cdc6', '7b3a977e-b67e-4656-b3b4-18a58172e098', 'flag', '2025-05-26T12:52:58.202Z') ON CONFLICT DO NOTHING;

