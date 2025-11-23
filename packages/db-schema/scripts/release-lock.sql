-- Script to release Prisma advisory lock
-- Run this in your PostgreSQL database if migrations are stuck

-- Check current locks
SELECT 
    locktype, 
    objid, 
    pid, 
    mode, 
    granted 
FROM pg_locks 
WHERE locktype = 'advisory' 
AND objid = 72707369;

-- Release the specific lock (replace PID with the actual process ID from above)
-- SELECT pg_advisory_unlock(72707369);

-- Or release all advisory locks for the current session
-- SELECT pg_advisory_unlock_all();

