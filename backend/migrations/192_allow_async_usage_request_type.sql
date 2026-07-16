-- Allow request_type=6 (async image tasks / sync-via-async pipeline).
-- Upstream 0.1.165+ 已把 request_type=5 分配给 live。
-- fork 现网 0.1.163-sync-via-async 曾把 async 写成 5：升级时先 remap 再扩约束。
ALTER TABLE usage_logs
    DROP CONSTRAINT IF EXISTS usage_logs_request_type_check;

-- 历史 async(5) -> 新 async(6)。现网尚未上线 live，升级瞬间 request_type=5 均为 fork async。
UPDATE usage_logs
SET request_type = 6
WHERE request_type = 5;

ALTER TABLE usage_logs
    ADD CONSTRAINT usage_logs_request_type_check
    CHECK (request_type >= 0 AND request_type <= 6);
