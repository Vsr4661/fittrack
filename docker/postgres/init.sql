-- Runs only when the Postgres volume is first created (fresh clone / `down -v`).
-- The dev database (fittrack) is created by POSTGRES_DB; this adds the test one.
CREATE DATABASE fittrack_test;
