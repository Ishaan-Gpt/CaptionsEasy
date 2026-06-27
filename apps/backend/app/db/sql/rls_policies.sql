-- Row Level Security policies for MotionAI (Supabase)
-- Source of truth: contracts/database.md > "Row Level Security"
--
-- Rule: every authenticated user may access only their own records.
-- Ownership chain: profiles.auth_user_id = auth.uid()
--   -> projects.owner_id = profiles.id
--   -> videos/jobs/transcripts/creative_plans/caption_plans/motion_scripts/exports.project_id = projects.id
--   -> usage.user_id = profiles.id

-- ============================================================
-- profiles
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY profiles_delete_own ON profiles
  FOR DELETE USING (auth_user_id = auth.uid());

-- ============================================================
-- projects
-- ============================================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_select_own ON projects
  FOR SELECT USING (
    owner_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY projects_insert_own ON projects
  FOR INSERT WITH CHECK (
    owner_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY projects_update_own ON projects
  FOR UPDATE USING (
    owner_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  ) WITH CHECK (
    owner_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY projects_delete_own ON projects
  FOR DELETE USING (
    owner_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- ============================================================
-- videos
-- ============================================================
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY videos_select_own ON videos
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

CREATE POLICY videos_insert_own ON videos
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

CREATE POLICY videos_update_own ON videos
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  ) WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

CREATE POLICY videos_delete_own ON videos
  FOR DELETE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

-- ============================================================
-- jobs
-- ============================================================
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY jobs_select_own ON jobs
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

CREATE POLICY jobs_insert_own ON jobs
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

CREATE POLICY jobs_update_own ON jobs
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  ) WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

CREATE POLICY jobs_delete_own ON jobs
  FOR DELETE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

-- ============================================================
-- transcripts
-- ============================================================
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY transcripts_select_own ON transcripts
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

CREATE POLICY transcripts_insert_own ON transcripts
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

CREATE POLICY transcripts_update_own ON transcripts
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  ) WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

CREATE POLICY transcripts_delete_own ON transcripts
  FOR DELETE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

-- ============================================================
-- creative_plans
-- ============================================================
ALTER TABLE creative_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY creative_plans_select_own ON creative_plans
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

CREATE POLICY creative_plans_insert_own ON creative_plans
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

CREATE POLICY creative_plans_update_own ON creative_plans
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  ) WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

CREATE POLICY creative_plans_delete_own ON creative_plans
  FOR DELETE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

-- ============================================================
-- caption_plans
-- ============================================================
ALTER TABLE caption_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY caption_plans_select_own ON caption_plans
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

CREATE POLICY caption_plans_insert_own ON caption_plans
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

CREATE POLICY caption_plans_update_own ON caption_plans
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  ) WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

CREATE POLICY caption_plans_delete_own ON caption_plans
  FOR DELETE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

-- ============================================================
-- motion_scripts
-- ============================================================
ALTER TABLE motion_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY motion_scripts_select_own ON motion_scripts
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

CREATE POLICY motion_scripts_insert_own ON motion_scripts
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

CREATE POLICY motion_scripts_update_own ON motion_scripts
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  ) WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

CREATE POLICY motion_scripts_delete_own ON motion_scripts
  FOR DELETE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

-- ============================================================
-- exports
-- ============================================================
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY exports_select_own ON exports
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

CREATE POLICY exports_insert_own ON exports
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

CREATE POLICY exports_update_own ON exports
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  ) WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

CREATE POLICY exports_delete_own ON exports
  FOR DELETE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.id = p.owner_id
      WHERE pr.auth_user_id = auth.uid()
    )
  );

-- ============================================================
-- usage
-- ============================================================
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY usage_select_own ON usage
  FOR SELECT USING (
    user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY usage_insert_own ON usage
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY usage_update_own ON usage
  FOR UPDATE USING (
    user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  ) WITH CHECK (
    user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY usage_delete_own ON usage
  FOR DELETE USING (
    user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );
