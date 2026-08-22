import { inngest } from './client';
import { seoJob } from './functions/seo/job';
import { researchFn } from './functions/seo/research';
import { createBriefFn } from './functions/seo/create-brief';
import { writeDraftFn } from './functions/seo/write-draft';
import { editDraftFn } from './functions/seo/edit-draft';
import { optimizeDraftFn } from './functions/seo/optimize-draft';
import { evaluateFn } from './functions/seo/evaluate';
import { saveDraftFn } from './functions/seo/save-draft';
import { saveApprovalFn } from './functions/seo/save-approval';
import { publishFn } from './functions/seo/publish';
import { ensureJob } from './functions/seo/ensure-job';
import { updateJobStatusFn } from './functions/update-job-status';
import { logEventFn } from './functions/log-event';

export const functions = [
  seoJob,
  ensureJob,
  researchFn,
  createBriefFn,
  writeDraftFn,
  editDraftFn,
  optimizeDraftFn,
  evaluateFn,
  saveDraftFn,
  saveApprovalFn,
  publishFn,
  updateJobStatusFn,
  logEventFn,
];
