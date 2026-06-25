-- ============================================================================
-- OpenBALC Database Row Level Security (RLS) Policies
-- Enables RLS and configures secure access control for all 27 tables.
-- ============================================================================

-- 1. Helper function to fetch the matching public.users.id from the authenticated user's JWT email.
-- Since public.users.id is a serial integer and Supabase Auth uses UUID, this maps them securely.
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS integer AS $$
  SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;



-- 2. ENABLE RLS AND CREATE POLICIES FOR EACH TABLE

-- Drop existing policies if they already exist to ensure idempotency
DROP POLICY IF EXISTS users_select_self ON users;
DROP POLICY IF EXISTS users_insert_self ON users;
DROP POLICY IF EXISTS users_update_self ON users;
DROP POLICY IF EXISTS ulp_all_self ON user_learning_profiles;
DROP POLICY IF EXISTS lsq_all_self ON learning_signals_queue;
DROP POLICY IF EXISTS lsh_all_self ON learning_signals_history;
DROP POLICY IF EXISTS workspaces_select ON workspaces;
DROP POLICY IF EXISTS workspaces_insert ON workspaces;
DROP POLICY IF EXISTS workspaces_update ON workspaces;
DROP POLICY IF EXISTS workspaces_delete ON workspaces;
DROP POLICY IF EXISTS wm_select ON workspace_members;
DROP POLICY IF EXISTS wm_all_owner ON workspace_members;
DROP POLICY IF EXISTS wm_insert ON workspace_members;
DROP POLICY IF EXISTS wm_update ON workspace_members;
DROP POLICY IF EXISTS wm_delete ON workspace_members;
DROP POLICY IF EXISTS conv_all_self ON conversations;
DROP POLICY IF EXISTS msg_all_self ON messages;
DROP POLICY IF EXISTS ct_select_self ON credit_transactions;
DROP POLICY IF EXISTS ct_insert_self ON credit_transactions;
DROP POLICY IF EXISTS modules_select ON modules;
DROP POLICY IF EXISTS modules_all_self ON modules;
DROP POLICY IF EXISTS ms_select ON module_sources;
DROP POLICY IF EXISTS ms_all_creator ON module_sources;
DROP POLICY IF EXISTS files_select ON files;
DROP POLICY IF EXISTS files_all_self ON files;
DROP POLICY IF EXISTS artifacts_all_self ON artifacts;
DROP POLICY IF EXISTS notes_all_self ON notes;
DROP POLICY IF EXISTS notif_all_self ON notifications;
DROP POLICY IF EXISTS orgs_select ON organizations;
DROP POLICY IF EXISTS orgs_all_owner ON organizations;
DROP POLICY IF EXISTS om_select ON org_members;
DROP POLICY IF EXISTS om_all_owner ON org_members;
DROP POLICY IF EXISTS om_insert ON org_members;
DROP POLICY IF EXISTS om_update ON org_members;
DROP POLICY IF EXISTS om_delete ON org_members;
DROP POLICY IF EXISTS eq_select ON expert_queue;
DROP POLICY IF EXISTS eq_all_creator ON expert_queue;
DROP POLICY IF EXISTS topics_select ON topics;
DROP POLICY IF EXISTS topics_all_creator ON topics;
DROP POLICY IF EXISTS mc_select ON module_content;
DROP POLICY IF EXISTS mc_all_creator ON module_content;
DROP POLICY IF EXISTS mchunks_select ON module_chunks;
DROP POLICY IF EXISTS mchunks_all_creator ON module_chunks;
DROP POLICY IF EXISTS mstars_all_self ON module_stars;
DROP POLICY IF EXISTS ts_select ON test_sets;
DROP POLICY IF EXISTS ts_all_creator ON test_sets;
DROP POLICY IF EXISTS tq_select ON test_questions;
DROP POLICY IF EXISTS tq_all_creator ON test_questions;
DROP POLICY IF EXISTS ta_all_self ON test_attempts;
DROP POLICY IF EXISTS ab_all_self ON ad_businesses;
DROP POLICY IF EXISTS ac_select ON ad_campaigns;
DROP POLICY IF EXISTS ac_all_creator ON ad_campaigns;


-- 2.1 USERS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_select_self ON users FOR SELECT TO authenticated 
  USING (auth.jwt() ->> 'email' = email);
CREATE POLICY users_insert_self ON users FOR INSERT TO authenticated 
  WITH CHECK (auth.jwt() ->> 'email' = email);
CREATE POLICY users_update_self ON users FOR UPDATE TO authenticated 
  USING (auth.jwt() ->> 'email' = email)
  WITH CHECK (auth.jwt() ->> 'email' = email);

-- 2.2 USER LEARNING PROFILES
ALTER TABLE user_learning_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY ulp_all_self ON user_learning_profiles FOR ALL TO authenticated 
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- 2.3 TELEMETRY EVENT QUEUE (Signals Queue)
ALTER TABLE learning_signals_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY lsq_all_self ON learning_signals_queue FOR ALL TO authenticated 
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- 2.4 HISTORICAL SIGNAL LOG (Signals History)
ALTER TABLE learning_signals_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY lsh_all_self ON learning_signals_history FOR ALL TO authenticated 
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- 2.5 WORKSPACES
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspaces_select ON workspaces FOR SELECT TO authenticated 
  USING (owner_id = public.current_user_id() OR id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = public.current_user_id()
  ));
CREATE POLICY workspaces_insert ON workspaces FOR INSERT TO authenticated 
  WITH CHECK (owner_id = public.current_user_id());
CREATE POLICY workspaces_update ON workspaces FOR UPDATE TO authenticated 
  USING (owner_id = public.current_user_id())
  WITH CHECK (owner_id = public.current_user_id());
CREATE POLICY workspaces_delete ON workspaces FOR DELETE TO authenticated 
  USING (owner_id = public.current_user_id());

-- 2.6 WORKSPACE MEMBERS
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY wm_select ON workspace_members FOR SELECT TO authenticated 
  USING (true);
CREATE POLICY wm_insert ON workspace_members FOR INSERT TO authenticated 
  WITH CHECK (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = public.current_user_id()
  ));
CREATE POLICY wm_update ON workspace_members FOR UPDATE TO authenticated 
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = public.current_user_id()
  ))
  WITH CHECK (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = public.current_user_id()
  ));
CREATE POLICY wm_delete ON workspace_members FOR DELETE TO authenticated 
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = public.current_user_id()
  ));

-- 2.7 CONVERSATIONS (Chat Sessions)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY conv_all_self ON conversations FOR ALL TO authenticated 
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- 2.8 MESSAGES (Chat History)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY msg_all_self ON messages FOR ALL TO authenticated 
  USING (conversation_id IN (SELECT id FROM conversations WHERE user_id = public.current_user_id()))
  WITH CHECK (conversation_id IN (SELECT id FROM conversations WHERE user_id = public.current_user_id()));

-- 2.9 CREDIT TRANSACTIONS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY ct_select_self ON credit_transactions FOR SELECT TO authenticated 
  USING (user_id = public.current_user_id());
CREATE POLICY ct_insert_self ON credit_transactions FOR INSERT TO authenticated 
  WITH CHECK (user_id = public.current_user_id());

-- 2.10 MODULES (Knowledge Core)
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY modules_select ON modules FOR SELECT TO authenticated 
  USING (user_id = public.current_user_id() OR visibility = 'public');
CREATE POLICY modules_all_self ON modules FOR ALL TO authenticated 
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- 2.11 MODULE SOURCES
ALTER TABLE module_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY ms_select ON module_sources FOR SELECT TO authenticated 
  USING (module_id IN (SELECT id FROM modules WHERE user_id = public.current_user_id() OR visibility = 'public'));
CREATE POLICY ms_all_creator ON module_sources FOR ALL TO authenticated 
  USING (module_id IN (SELECT id FROM modules WHERE user_id = public.current_user_id()))
  WITH CHECK (module_id IN (SELECT id FROM modules WHERE user_id = public.current_user_id()));

-- 2.12 FILES (Assets)
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
CREATE POLICY files_select ON files FOR SELECT TO authenticated 
  USING (user_id = public.current_user_id() OR module_id IN (SELECT id FROM modules WHERE visibility = 'public'));
CREATE POLICY files_all_self ON files FOR ALL TO authenticated 
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- 2.13 ARTIFACTS
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY artifacts_all_self ON artifacts FOR ALL TO authenticated 
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- 2.14 NOTES
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY notes_all_self ON notes FOR ALL TO authenticated 
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- 2.15 NOTIFICATIONS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notif_all_self ON notifications FOR ALL TO authenticated 
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- 2.16 ORGANIZATIONS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY orgs_select ON organizations FOR SELECT TO authenticated 
  USING (owner_id = public.current_user_id() OR id IN (
    SELECT org_id FROM org_members WHERE user_id = public.current_user_id()
  ));
CREATE POLICY orgs_all_owner ON organizations FOR ALL TO authenticated 
  USING (owner_id = public.current_user_id())
  WITH CHECK (owner_id = public.current_user_id());

-- 2.17 ORGANIZATION MEMBERS
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY om_select ON org_members FOR SELECT TO authenticated 
  USING (true);
CREATE POLICY om_insert ON org_members FOR INSERT TO authenticated 
  WITH CHECK (org_id IN (
    SELECT id FROM organizations WHERE owner_id = public.current_user_id()
  ));
CREATE POLICY om_update ON org_members FOR UPDATE TO authenticated 
  USING (org_id IN (
    SELECT id FROM organizations WHERE owner_id = public.current_user_id()
  ))
  WITH CHECK (org_id IN (
    SELECT id FROM organizations WHERE owner_id = public.current_user_id()
  ));
CREATE POLICY om_delete ON org_members FOR DELETE TO authenticated 
  USING (org_id IN (
    SELECT id FROM organizations WHERE owner_id = public.current_user_id()
  ));

-- 2.18 EXPERT TICKETS QUEUE
ALTER TABLE expert_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY eq_select ON expert_queue FOR SELECT TO authenticated 
  USING (user_id = public.current_user_id() OR assigned_to = public.current_user_id());
CREATE POLICY eq_all_creator ON expert_queue FOR ALL TO authenticated 
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- 2.19 TOPICS (Module Outline)
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY topics_select ON topics FOR SELECT TO authenticated 
  USING (module_id IN (SELECT id FROM modules WHERE user_id = public.current_user_id() OR visibility = 'public'));
CREATE POLICY topics_all_creator ON topics FOR ALL TO authenticated 
  USING (module_id IN (SELECT id FROM modules WHERE user_id = public.current_user_id()))
  WITH CHECK (module_id IN (SELECT id FROM modules WHERE user_id = public.current_user_id()));

-- 2.20 MODULE CONTENT
ALTER TABLE module_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY mc_select ON module_content FOR SELECT TO authenticated 
  USING (module_id IN (SELECT id FROM modules WHERE user_id = public.current_user_id() OR visibility = 'public'));
CREATE POLICY mc_all_creator ON module_content FOR ALL TO authenticated 
  USING (module_id IN (SELECT id FROM modules WHERE user_id = public.current_user_id()))
  WITH CHECK (module_id IN (SELECT id FROM modules WHERE user_id = public.current_user_id()));

-- 2.21 MODULE CHUNKS
ALTER TABLE module_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY mchunks_select ON module_chunks FOR SELECT TO authenticated 
  USING (module_id IN (SELECT id FROM modules WHERE user_id = public.current_user_id() OR visibility = 'public'));
CREATE POLICY mchunks_all_creator ON module_chunks FOR ALL TO authenticated 
  USING (module_id IN (SELECT id FROM modules WHERE user_id = public.current_user_id()))
  WITH CHECK (module_id IN (SELECT id FROM modules WHERE user_id = public.current_user_id()));

-- 2.22 MODULE STARS
ALTER TABLE module_stars ENABLE ROW LEVEL SECURITY;
CREATE POLICY mstars_all_self ON module_stars FOR ALL TO authenticated 
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- 2.23 TEST SETS (Quizzes)
ALTER TABLE test_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY ts_select ON test_sets FOR SELECT TO authenticated 
  USING (created_by = public.current_user_id() OR module_id IN (
    SELECT id FROM modules WHERE user_id = public.current_user_id() OR visibility = 'public'
  ));
CREATE POLICY ts_all_creator ON test_sets FOR ALL TO authenticated 
  USING (created_by = public.current_user_id())
  WITH CHECK (created_by = public.current_user_id());

-- 2.24 TEST QUESTIONS
ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tq_select ON test_questions FOR SELECT TO authenticated 
  USING (test_set_id IN (
    SELECT id FROM test_sets WHERE created_by = public.current_user_id() OR module_id IN (
      SELECT id FROM modules WHERE user_id = public.current_user_id() OR visibility = 'public'
    )
  ));
CREATE POLICY tq_all_creator ON test_questions FOR ALL TO authenticated 
  USING (test_set_id IN (SELECT id FROM test_sets WHERE created_by = public.current_user_id()))
  WITH CHECK (test_set_id IN (SELECT id FROM test_sets WHERE created_by = public.current_user_id()));

-- 2.25 TEST ATTEMPTS
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY ta_all_self ON test_attempts FOR ALL TO authenticated 
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- 2.26 ADVERTISERS (Ad Businesses)
ALTER TABLE ad_businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY ab_all_self ON ad_businesses FOR ALL TO authenticated 
  USING (auth_id = public.current_user_id())
  WITH CHECK (auth_id = public.current_user_id());

-- 2.27 AD CAMPAIGNS
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY ac_select ON ad_campaigns FOR SELECT TO authenticated 
  USING (business_id IN (SELECT id FROM ad_businesses WHERE auth_id = public.current_user_id()) OR status = 'active');
CREATE POLICY ac_all_creator ON ad_campaigns FOR ALL TO authenticated 
  USING (business_id IN (SELECT id FROM ad_businesses WHERE auth_id = public.current_user_id()))
  WITH CHECK (business_id IN (SELECT id FROM ad_businesses WHERE auth_id = public.current_user_id()));
