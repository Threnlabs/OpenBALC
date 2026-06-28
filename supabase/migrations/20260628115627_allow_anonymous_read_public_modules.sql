-- Allow anonymous (public) read access to public modules, sources, content, topics, files, and chunks.
-- Drop existing authenticated-only SELECT policies.
DROP POLICY IF EXISTS modules_select ON modules;
DROP POLICY IF EXISTS ms_select ON module_sources;
DROP POLICY IF EXISTS files_select ON files;
DROP POLICY IF EXISTS topics_select ON topics;
DROP POLICY IF EXISTS mc_select ON module_content;
DROP POLICY IF EXISTS mchunks_select ON module_chunks;

-- Recreate SELECT policies without the "TO authenticated" restriction, allowing "anon" roles to read them.
CREATE POLICY modules_select ON modules FOR SELECT
  USING (user_id = public.current_user_id() OR visibility = 'public');

CREATE POLICY ms_select ON module_sources FOR SELECT
  USING (module_id IN (SELECT id FROM modules WHERE user_id = public.current_user_id() OR visibility = 'public'));

CREATE POLICY files_select ON files FOR SELECT
  USING (user_id = public.current_user_id() OR module_id IN (SELECT id FROM modules WHERE visibility = 'public'));

CREATE POLICY topics_select ON topics FOR SELECT
  USING (module_id IN (SELECT id FROM modules WHERE user_id = public.current_user_id() OR visibility = 'public'));

CREATE POLICY mc_select ON module_content FOR SELECT
  USING (module_id IN (SELECT id FROM modules WHERE user_id = public.current_user_id() OR visibility = 'public'));

CREATE POLICY mchunks_select ON module_chunks FOR SELECT
  USING (module_id IN (SELECT id FROM modules WHERE user_id = public.current_user_id() OR visibility = 'public'));
