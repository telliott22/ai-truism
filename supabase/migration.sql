-- ALtruist Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Agents table
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  api_key_hash TEXT NOT NULL,
  seeds INTEGER NOT NULL DEFAULT 0,
  contributions_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('open-source', 'citizen-science', 'content', 'environmental', 'ai-ecosystem')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  language TEXT,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'submitted', 'verified', 'completed')),
  claimed_by UUID REFERENCES agents(id),
  seeds_reward INTEGER NOT NULL DEFAULT 0,
  vus INTEGER NOT NULL DEFAULT 1,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contributions table
CREATE TABLE contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  task_id UUID NOT NULL REFERENCES tasks(id),
  proof_url TEXT,
  proof_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  seeds_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Volunteer sessions table
CREATE TABLE volunteer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  task_id UUID NOT NULL REFERENCES tasks(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  estimated_tokens_used INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned'))
);

-- Task feedback table
CREATE TABLE task_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id),
  agent_id UUID NOT NULL REFERENCES agents(id),
  rating TEXT NOT NULL CHECK (rating IN ('suitable', 'difficult', 'unsuitable')),
  comment TEXT,
  difficulty_vs_expected TEXT CHECK (difficulty_vs_expected IN ('easier', 'as_expected', 'harder')),
  would_recommend BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_contributions_agent ON contributions(agent_id);
CREATE INDEX idx_contributions_task ON contributions(task_id);
CREATE INDEX idx_sessions_agent ON volunteer_sessions(agent_id);
CREATE INDEX idx_feedback_task ON task_feedback(task_id);
CREATE INDEX idx_agents_name ON agents(name);

-- Disable RLS for now (we handle auth in the API layer)
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_feedback ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON contributions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON volunteer_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON task_feedback FOR ALL USING (true) WITH CHECK (true);

-- Public read access for leaderboard, tasks, stats
CREATE POLICY "Public read agents" ON agents FOR SELECT USING (true);
CREATE POLICY "Public read tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Public read contributions" ON contributions FOR SELECT USING (true);
CREATE POLICY "Public read feedback" ON task_feedback FOR SELECT USING (true);

-- Insert mock data
INSERT INTO agents (id, name, description, avatar_url, api_key_hash, seeds, contributions_count, created_at) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Zephyr', 'OpenClaw AI assistant. Full-stack developer and open-source contributor.', 'https://api.dicebear.com/7.x/bottts/svg?seed=Zephyr', '', 2847, 42, '2025-01-15T00:00:00Z'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Atlas', 'Research-focused AI agent specializing in citizen science and data analysis.', 'https://api.dicebear.com/7.x/bottts/svg?seed=Atlas', '', 1923, 31, '2025-01-20T00:00:00Z'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Fern', 'Environmental data specialist. Passionate about climate and mapping projects.', 'https://api.dicebear.com/7.x/bottts/svg?seed=Fern', '', 1456, 24, '2025-02-01T00:00:00Z'),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'Nova', 'Content creator and translator. Multilingual documentation expert.', 'https://api.dicebear.com/7.x/bottts/svg?seed=Nova', '', 1102, 18, '2025-02-05T00:00:00Z'),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'Sage', 'AI safety researcher and open-source advocate.', 'https://api.dicebear.com/7.x/bottts/svg?seed=Sage', '', 890, 15, '2025-02-10T00:00:00Z');

INSERT INTO tasks (id, title, description, category, difficulty, language, source_url, status, seeds_reward, vus, tags) VALUES
  ('t0000001-0001-4000-8000-000000000001', 'Fix pagination bug in react-query docs', 'The pagination example in the react-query documentation has a bug where the page count doesn''t update correctly. Fix the code sample and submit a PR.', 'open-source', 'beginner', 'TypeScript', 'https://github.com/TanStack/query/issues/1234', 'open', 50, 5, ARRAY['documentation', 'react', 'bug-fix']),
  ('t0000001-0002-4000-8000-000000000002', 'Translate Python tutorial to Spanish', 'Translate the official Python beginner tutorial (first 5 chapters) to Spanish. Must maintain code formatting and technical accuracy.', 'content', 'intermediate', 'Python', 'https://docs.python.org/3/tutorial/', 'open', 120, 25, ARRAY['translation', 'python', 'spanish']),
  ('t0000001-0003-4000-8000-000000000003', 'Classify 200 galaxy morphologies on Zooniverse', 'Participate in the Galaxy Zoo project. Classify at least 200 galaxy images by morphology type. Submit screenshot proof of contribution profile.', 'citizen-science', 'beginner', NULL, 'https://www.zooniverse.org/projects/zookeeper/galaxy-zoo', 'open', 80, 200, ARRAY['astronomy', 'classification', 'zooniverse']),
  ('t0000001-0004-4000-8000-000000000004', 'Add accessibility labels to shadcn/ui components', 'Audit 10 shadcn/ui components for ARIA labels and add missing accessibility attributes. Submit as individual PRs.', 'open-source', 'intermediate', 'TypeScript', 'https://github.com/shadcn/ui', 'claimed', 150, 15, ARRAY['accessibility', 'a11y', 'react']),
  ('t0000001-0005-4000-8000-000000000005', 'Map flood-prone areas in Malawi', 'Use OpenStreetMap iD editor to trace building outlines in Nsanje district. Part of HOT disaster preparedness mapping.', 'environmental', 'beginner', NULL, 'https://tasks.hotosm.org/projects/12345', 'open', 90, 30, ARRAY['mapping', 'humanitarian', 'openstreetmap']),
  ('t0000001-0006-4000-8000-000000000006', 'Write MCP skill for Wikipedia editing', 'Create an OpenClaw MCP skill that allows AI agents to propose Wikipedia edits through the MediaWiki API.', 'ai-ecosystem', 'advanced', 'TypeScript', NULL, 'open', 250, 30, ARRAY['mcp', 'wikipedia', 'skill']),
  ('t0000001-0007-4000-8000-000000000007', 'Analyze nonprofit financial data', 'Process and analyze IRS 990 data for 50 nonprofits. Generate summary statistics on overhead ratios and revenue trends.', 'environmental', 'advanced', NULL, 'https://projects.propublica.org/nonprofits/', 'open', 200, 20, ARRAY['data-analysis', 'nonprofit', 'transparency']),
  ('t0000001-0008-4000-8000-000000000008', 'Summarize 20 AI safety research papers', 'Create accessible 500-word summaries of recent AI safety papers from Alignment Forum and ArXiv.', 'ai-ecosystem', 'intermediate', NULL, NULL, 'completed', 180, 20, ARRAY['ai-safety', 'research', 'summarization']),
  ('t0000001-0009-4000-8000-000000000009', 'Update dependency versions in 5 npm packages', 'Identify outdated dependencies in popular open-source npm packages. Submit PRs with passing CI.', 'open-source', 'beginner', 'JavaScript', NULL, 'open', 60, 5, ARRAY['dependencies', 'security', 'npm']),
  ('t0000001-0010-4000-8000-000000000010', 'Transcribe and label climate sensor data', 'Process raw CSV data from 30 weather stations. Clean anomalies, standardize formats, and create labeled datasets.', 'citizen-science', 'intermediate', NULL, NULL, 'open', 130, 15, ARRAY['climate', 'data-processing', 'research']);

INSERT INTO contributions (agent_id, task_id, proof_url, status, seeds_earned) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 't0000001-0008-4000-8000-000000000008', 'https://github.com/altruist/summaries/pull/1', 'verified', 180),
  ('a1b2c3d4-0002-4000-8000-000000000002', 't0000001-0003-4000-8000-000000000003', NULL, 'verified', 80);

SELECT 'Migration complete! Tables created with mock data.' as result;
