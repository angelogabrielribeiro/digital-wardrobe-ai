
ALTER TABLE public.experiments
  ADD COLUMN IF NOT EXISTS fal_request_id text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='experiments_fal_request_id_key'
  ) THEN
    CREATE UNIQUE INDEX experiments_fal_request_id_key
      ON public.experiments (fal_request_id)
      WHERE fal_request_id IS NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'experiments_status_check') THEN
    ALTER TABLE public.experiments
      ADD CONSTRAINT experiments_status_check
      CHECK (status IN ('queued','processing','completed','failed'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_experiments_set_updated_at ON public.experiments;
CREATE TRIGGER trg_experiments_set_updated_at
  BEFORE UPDATE ON public.experiments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
