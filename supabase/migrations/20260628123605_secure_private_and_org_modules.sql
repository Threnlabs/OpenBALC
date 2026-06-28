-- Secure private and organization modules from leakage.
-- Ensure private modules can only be accessed by the creator, workspace members/owners, or organization members/owners.

-- Drop SELECT policies
DROP POLICY IF EXISTS modules_select ON modules;
DROP POLICY IF EXISTS ms_select ON module_sources;
DROP POLICY IF EXISTS files_select ON files;
DROP POLICY IF EXISTS topics_select ON topics;
DROP POLICY IF EXISTS mc_select ON module_content;
DROP POLICY IF EXISTS mchunks_select ON module_chunks;

-- Recreate modules_select policy
CREATE POLICY modules_select ON modules FOR SELECT
  USING (
    visibility = 'public'
    OR (
      auth.role() = 'authenticated' AND (
        user_id = public.current_user_id()
        OR workspace_id IN (
          SELECT id FROM workspaces WHERE owner_id = public.current_user_id()
          UNION
          SELECT workspace_id FROM workspace_members WHERE user_id = public.current_user_id()
          UNION
          SELECT workspace_id FROM organizations WHERE owner_id = public.current_user_id()
          UNION
          SELECT workspace_id FROM organizations WHERE id IN (
            SELECT org_id FROM org_members WHERE user_id = public.current_user_id()
          )
        )
      )
    )
  );

-- Recreate dependent SELECT policies by referencing the filtered modules table
CREATE POLICY ms_select ON module_sources FOR SELECT
  USING (module_id IN (SELECT id FROM modules));

CREATE POLICY files_select ON files FOR SELECT
  USING (user_id = public.current_user_id() OR module_id IN (SELECT id FROM modules));

CREATE POLICY topics_select ON topics FOR SELECT
  USING (module_id IN (SELECT id FROM modules));

CREATE POLICY mc_select ON module_content FOR SELECT
  USING (module_id IN (SELECT id FROM modules));

CREATE POLICY mchunks_select ON module_chunks FOR SELECT
  USING (module_id IN (SELECT id FROM modules));
